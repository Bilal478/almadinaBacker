<?php

beforeEach(function () {
    seedPermissions();
    $this->user = userWithPermissions(['view_pos']);
});

test('a user can change their own password with the correct current password', function () {
    $this->actingAs($this->user)->postJson('/api/auth/change-password', [
        'current_password' => 'password',
        'new_password' => 'a-new-password',
    ])->assertOk();

    $this->postJson('/api/auth/login', ['username' => $this->user->username, 'password' => 'a-new-password'])
        ->assertOk();
});

test('changing password with the wrong current password is rejected', function () {
    $this->actingAs($this->user)->postJson('/api/auth/change-password', [
        'current_password' => 'wrong',
        'new_password' => 'a-new-password',
    ])->assertStatus(422);
});

test('a new password shorter than 8 characters is rejected', function () {
    $this->actingAs($this->user)->postJson('/api/auth/change-password', [
        'current_password' => 'password',
        'new_password' => 'short1',
    ])->assertStatus(422)->assertJsonValidationErrors('new_password');
});

test('a user can update their own name/username/email/phone', function () {
    $data = $this->actingAs($this->user)->putJson('/api/auth/profile', [
        'name' => 'Updated Name',
        'username' => 'updated.username',
        'email' => 'updated@example.com',
        'phone' => '0300-1112223',
    ])->assertOk()->json('data');

    expect($data['name'])->toBe('Updated Name');
    expect($data['username'])->toBe('updated.username');
    expect($data['email'])->toBe('updated@example.com');
    expect($this->user->fresh()->username)->toBe('updated.username');

    // The new username works for the next login.
    $this->postJson('/api/auth/login', ['username' => 'updated.username', 'password' => 'password'])
        ->assertOk();
});

test('a username already taken by someone else is rejected', function () {
    $other = userWithPermissions(['view_pos']);

    $this->actingAs($this->user)->putJson('/api/auth/profile', [
        'name' => $this->user->name,
        'username' => $other->username,
    ])->assertStatus(422)->assertJsonValidationErrors('username');

    expect($this->user->fresh()->username)->not->toBe($other->username);
});

test('a user cannot change their own role through the profile endpoint', function () {
    $originalRoleId = $this->user->role_id;

    $this->actingAs($this->user)->putJson('/api/auth/profile', [
        'name' => 'Still Me',
        'username' => $this->user->username,
        'role_id' => 99999,
    ])->assertOk();

    expect($this->user->fresh()->role_id)->toBe($originalRoleId);
});
