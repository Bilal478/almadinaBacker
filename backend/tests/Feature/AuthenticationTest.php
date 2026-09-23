<?php

use App\Models\User;

beforeEach(fn () => seedPermissions());

test('admin can log in and receives their permissions', function () {
    $user = userWithPermissions(['manage_users', 'view_reports']);

    $response = $this->postJson('/api/auth/login', [
        'username' => $user->username,
        'password' => 'password',
    ]);

    $response->assertOk()->assertJsonPath('data.user.username', $user->username);
    expect($response->json('data.user.permissions'))->toEqualCanonicalizing(['manage_users', 'view_reports']);
    expect($response->json('data.token'))->not->toBeEmpty();
});

test('login fails with the wrong password', function () {
    $user = userWithPermissions([]);

    $this->postJson('/api/auth/login', ['username' => $user->username, 'password' => 'wrong'])
        ->assertStatus(401)
        ->assertJsonPath('code', 'UNAUTHORIZED');
});

test('an inactive user cannot log in even with the correct password', function () {
    $user = userWithPermissions([]);
    $user->update(['status' => 'inactive']);

    $this->postJson('/api/auth/login', ['username' => $user->username, 'password' => 'password'])
        ->assertStatus(401);
});

test('a counter/cashier role cannot reach a manage_purchases endpoint', function () {
    $cashier = userWithPermissions(['view_pos', 'create_sale']);

    $this->actingAs($cashier)->getJson('/api/purchases')
        ->assertStatus(403)
        ->assertJsonPath('code', 'UNAUTHORIZED');
});

test('an unauthenticated request is rejected', function () {
    $this->getJson('/api/products')->assertStatus(401);
});

test('an unauthenticated request is rejected with a clean 401 even without an explicit Accept header', function () {
    // Plain get() (unlike getJson()) does not send Accept: application/json — this app has
    // no named "login" route to redirect to, so without Authenticate::redirectUsing(fn () =>
    // null) registered in AppServiceProvider, Laravel's default auth middleware crashes
    // trying to build that redirect and this comes back as a 500, not a 401.
    $this->get('/api/products')->assertStatus(401);
});
