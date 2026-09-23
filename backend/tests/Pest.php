<?php

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
|
| The closure you provide to your test functions is always bound to a specific PHPUnit test
| case class. By default, that class is "PHPUnit\Framework\TestCase". Of course, you may
| need to change it using the "pest()" function to bind a different classes or traits.
|
*/

pest()->extend(Tests\TestCase::class)
    ->use(Illuminate\Foundation\Testing\RefreshDatabase::class)
    ->in('Feature');

/*
|--------------------------------------------------------------------------
| Expectations
|--------------------------------------------------------------------------
|
| When you're writing tests, you often need to check that values meet certain conditions. The
| "expect()" function gives you access to a set of "expectations" methods that you can use
| to assert different things. Of course, you may extend the Expectation API at any time.
|
*/

expect()->extend('toBeOne', function () {
    return $this->toBe(1);
});

/*
|--------------------------------------------------------------------------
| Functions
|--------------------------------------------------------------------------
|
| While Pest is very powerful out-of-the-box, you may have some testing code specific to your
| project that you don't want to repeat in every file. Here you can also expose helpers as
| global functions to help you to reduce the number of lines of code in your test files.
|
*/

/**
 * Creates (and returns) a user whose role has exactly the given permission keys — the
 * cleanest way to test permission enforcement without depending on the seeded demo roles.
 */
function userWithPermissions(array $permissionKeys): \App\Models\User
{
    $role = \App\Models\Role::factory()->create();
    if ($permissionKeys) {
        $ids = \App\Models\Permission::whereIn('key', $permissionKeys)->pluck('id');
        $role->permissions()->sync($ids);
    }

    return \App\Models\User::factory()->create(['role_id' => $role->id]);
}

/** Seeds the fixed permission vocabulary — needed before userWithPermissions() can find any keys. */
function seedPermissions(): void
{
    test()->seed(\Database\Seeders\RolePermissionSeeder::class);
}
