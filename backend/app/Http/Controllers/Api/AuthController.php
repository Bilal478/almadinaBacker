<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\BusinessException;
use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class AuthController extends Controller
{
    public function login(LoginRequest $request)
    {
        $user = User::where('username', $request->username)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw new BusinessException('Invalid username or password.', 'UNAUTHORIZED', 401);
        }
        if (!$user->isActive()) {
            throw new BusinessException('This account has been deactivated.', 'UNAUTHORIZED', 401);
        }

        $token = $user->createToken('pos')->plainTextToken;
        AuditLogger::log('login', 'auth', 'user', $user->id);

        return $this->success([
            'user' => new UserResource($user->load('role.permissions')),
            'token' => $token,
        ], 'Login successful');
    }

    public function logout(Request $request)
    {
        AuditLogger::log('logout', 'auth', 'user', $request->user()->id);
        $request->user()->currentAccessToken()->delete();

        return $this->success(null, 'Logged out');
    }

    public function me(Request $request)
    {
        return $this->success(new UserResource($request->user()->load('role.permissions')));
    }

    public function changePassword(Request $request)
    {
        $request->validate([
            'current_password' => ['required'],
            'new_password' => ['required', 'string', 'min:8'],
        ]);

        $user = $request->user();
        if (!Hash::check($request->current_password, $user->password)) {
            throw new BusinessException('Current password is incorrect.', 'VALIDATION_ERROR');
        }

        $user->update(['password' => $request->new_password]);
        AuditLogger::log('changed_password', 'auth', 'user', $user->id);

        return $this->success(null, 'Password updated');
    }

    /**
     * Self-service profile edit — deliberately narrower than the admin-only UserController:
     * name/email/phone/username only. Role and status stay account-administration concerns,
     * not something a user should be able to change about themselves.
     */
    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'username' => ['required', 'string', 'max:100', Rule::unique('users', 'username')->ignore($user->id)],
            'email' => ['nullable', 'email', 'max:150'],
            'phone' => ['nullable', 'string', 'max:30'],
        ]);

        $old = $user->toArray();
        $user->update($request->only(['name', 'username', 'email', 'phone']));
        AuditLogger::log('updated_profile', 'auth', 'user', $user->id, $old, $user->fresh()->toArray());

        return $this->success(new UserResource($user->load('role.permissions')), 'Profile updated');
    }
}
