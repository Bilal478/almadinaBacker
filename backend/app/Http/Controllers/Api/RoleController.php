<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\BusinessException;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreRoleRequest;
use App\Http\Resources\RoleResource;
use App\Models\Permission;
use App\Models\Role;
use App\Services\Audit\AuditLogger;

class RoleController extends Controller
{
    public function index()
    {
        $roles = Role::withCount('users')->with('permissions')->orderBy('id')->get();
        return $this->success(RoleResource::collection($roles));
    }

    public function store(StoreRoleRequest $request)
    {
        $this->authorize('manage_roles');

        $role = Role::create(['name' => $request->name, 'description' => $request->description ?? '', 'is_system' => false]);
        $this->syncPermissions($role, $request->input('permissions', []));

        AuditLogger::log('created', 'roles', 'role', $role->id, null, $role->fresh('permissions')->toArray());

        return $this->success(new RoleResource($role->load('permissions')->loadCount('users')), 'Role created', 201);
    }

    public function update(StoreRoleRequest $request, Role $role)
    {
        $this->authorize('manage_roles');

        $old = $role->load('permissions')->toArray();
        // A system role's name is protected (the frontend disables editing it too), but its
        // permission set can still be tuned.
        $role->update(['name' => $role->is_system ? $role->name : $request->name, 'description' => $request->description ?? '']);
        $this->syncPermissions($role, $request->input('permissions', []));

        AuditLogger::log('updated', 'roles', 'role', $role->id, $old, $role->fresh('permissions')->toArray());

        return $this->success(new RoleResource($role->load('permissions')->loadCount('users')), 'Role updated');
    }

    public function destroy(Role $role)
    {
        $this->authorize('manage_roles');

        if ($role->is_system) {
            throw new BusinessException('System roles cannot be deleted.', 'UNAUTHORIZED', 403);
        }
        if ($role->users()->exists()) {
            throw new BusinessException('This role still has users assigned to it — reassign them first.', 'VALIDATION_ERROR', 409);
        }

        $old = $role->load('permissions')->toArray();
        $role->delete();
        AuditLogger::log('deleted', 'roles', 'role', $role->id, $old, null);

        return $this->success(null, 'Role deleted');
    }

    private function syncPermissions(Role $role, array $keys): void
    {
        $ids = Permission::whereIn('key', $keys)->pluck('id');
        $role->permissions()->sync($ids);
    }
}
