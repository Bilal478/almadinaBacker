<?php

use App\Models\Role;

beforeEach(function () {
    seedPermissions();
    $this->admin = userWithPermissions(['manage_users', 'manage_roles']);
});

test('a custom role can be created with a specific permission set and assigned to a new user', function () {
    $role = $this->actingAs($this->admin)->postJson('/api/roles', [
        'name' => 'Inventory Clerk', 'description' => 'Stock only', 'permissions' => ['view_products', 'manage_inventory'],
    ])->assertCreated()->json('data');

    expect($role['permissions'])->toEqualCanonicalizing(['view_products', 'manage_inventory']);

    $user = $this->actingAs($this->admin)->postJson('/api/users', [
        'name' => 'Stock Clerk', 'username' => 'stock.clerk', 'role_id' => $role['id'], 'password' => 'a-real-password',
    ])->assertCreated()->json('data');

    expect($user['role_id'])->toBe($role['id']);
});

test('a system role cannot be deleted', function () {
    $system = Role::factory()->create(['is_system' => true]);

    $this->actingAs($this->admin)->deleteJson("/api/roles/{$system->id}")
        ->assertStatus(403);
});

test('a role still assigned to a user cannot be deleted', function () {
    $role = Role::factory()->create();
    \App\Models\User::factory()->create(['role_id' => $role->id]);

    $this->actingAs($this->admin)->deleteJson("/api/roles/{$role->id}")
        ->assertStatus(409);
});

test('deactivating a user prevents them from logging in again', function () {
    $role = Role::factory()->create();
    $user = \App\Models\User::factory()->create(['role_id' => $role->id]);

    $this->actingAs($this->admin)->patchJson("/api/users/{$user->id}/status", ['status' => 'inactive'])->assertOk();

    $this->postJson('/api/auth/login', ['username' => $user->username, 'password' => 'password'])
        ->assertStatus(401);
});

test('creating a user without a password is rejected — there is no insecure default', function () {
    $this->actingAs($this->admin)->postJson('/api/users', [
        'name' => 'No Password', 'username' => 'no.password', 'role_id' => Role::factory()->create()->id,
    ])->assertStatus(422)->assertJsonValidationErrors('password');
});

test('the last active Administrator cannot deactivate themselves, or be moved off the role, and be locked out', function () {
    $adminRole = Role::where('name', 'Administrator')->first();
    $solePost = \App\Models\User::factory()->create(['role_id' => $adminRole->id, 'status' => 'active']);
    $otherRole = Role::factory()->create();

    $this->actingAs($solePost)->patchJson("/api/users/{$solePost->id}/status", ['status' => 'inactive'])
        ->assertStatus(409);

    $this->actingAs($solePost)->putJson("/api/users/{$solePost->id}", [
        'name' => $solePost->name, 'username' => $solePost->username, 'role_id' => $otherRole->id,
    ])->assertStatus(409);

    // Once a second active admin exists, the guard no longer blocks the first.
    \App\Models\User::factory()->create(['role_id' => $adminRole->id, 'status' => 'active']);
    $this->actingAs($solePost)->patchJson("/api/users/{$solePost->id}/status", ['status' => 'inactive'])
        ->assertOk();
});
