<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\BusinessException;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreUserRequest;
use App\Http\Resources\UserResource;
use App\Models\Role;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function index()
    {
        $this->authorize('manage_users');
        return $this->success(UserResource::collection(User::with('role')->orderBy('name')->get()));
    }

    public function show(User $user)
    {
        $this->authorize('manage_users');
        return $this->success(new UserResource($user->load('role.permissions')));
    }

    public function store(StoreUserRequest $request)
    {
        $this->authorize('manage_users');

        $user = User::create([
            'name' => $request->name,
            'username' => $request->username,
            'phone' => $request->phone,
            'email' => $request->email ?: $request->username . '@bakery.local',
            'role_id' => $request->role_id,
            'counter' => $request->counter,
            'status' => $request->input('status', 'active'),
            'password' => $request->password,
        ]);

        AuditLogger::log('created', 'users', 'user', $user->id, null, $user->toArray());

        return $this->success(new UserResource($user->load('role')), 'User created', 201);
    }

    public function update(StoreUserRequest $request, User $user)
    {
        $this->authorize('manage_users');

        $newRoleId = $request->filled('role_id') ? (int) $request->role_id : $user->role_id;
        $newStatus = $request->input('status', $user->status);
        $this->guardLastAdmin($user, $newRoleId, $newStatus);

        $old = $user->toArray();
        $user->fill($request->only(['name', 'username', 'phone', 'email', 'role_id', 'counter', 'status']));
        if ($request->filled('password')) {
            $user->password = $request->password;
        }
        $user->save();

        AuditLogger::log('updated', 'users', 'user', $user->id, $old, $user->fresh()->toArray());

        return $this->success(new UserResource($user->load('role')), 'User updated');
    }

    public function setStatus(Request $request, User $user)
    {
        $this->authorize('manage_users');
        $request->validate(['status' => ['required', 'in:active,inactive']]);

        $this->guardLastAdmin($user, $user->role_id, $request->status);

        $old = $user->toArray();
        $user->update(['status' => $request->status]);
        AuditLogger::log('status_changed', 'users', 'user', $user->id, $old, $user->fresh()->toArray());

        return $this->success(new UserResource($user->load('role')), 'User status updated');
    }

    /**
     * Blocks the one change that could lock every admin out of the system: deactivating, or
     * moving off the Administrator role, the last active administrator account. There is no
     * self-service recovery path (no public registration, no password-reset email), so this
     * is the only thing standing between a misclick and needing direct database access.
     */
    private function guardLastAdmin(User $user, int $newRoleId, string $newStatus): void
    {
        $adminRoleId = Role::where('name', 'Administrator')->value('id');
        if (!$adminRoleId || $user->role_id !== $adminRoleId) {
            return;
        }

        $staysAdmin = $newRoleId === $adminRoleId && $newStatus === 'active';
        if ($staysAdmin) {
            return;
        }

        $otherActiveAdmins = User::where('role_id', $adminRoleId)
            ->where('status', 'active')
            ->where('id', '!=', $user->id)
            ->exists();

        if (!$otherActiveAdmins) {
            throw new BusinessException(
                'This is the only active Administrator account — it cannot be deactivated or moved off the Administrator role. Create another active admin first.',
                'VALIDATION_ERROR',
                409,
            );
        }
    }
}
