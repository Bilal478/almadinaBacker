<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;

class DemoUserSeeder extends Seeder
{
    /** Demo/dev only — never run in production. Every seeded account shares the same demo password: password123 */
    public function run(): void
    {
        $roleId = fn (string $name) => Role::where('name', $name)->value('id');

        $users = [
            ['name' => 'Bilal Rasool', 'username' => 'bilal.admin', 'role_id' => $roleId('Administrator'), 'counter' => null, 'status' => 'active'],
            ['name' => 'Ayesha Khan', 'username' => 'ayesha.manager', 'role_id' => $roleId('Store Manager'), 'counter' => null, 'status' => 'active'],
            ['name' => 'Hamza Tariq', 'username' => 'hamza.counter', 'role_id' => $roleId('Counter / Cashier'), 'counter' => 'Counter 1', 'status' => 'active'],
            ['name' => 'Sana Malik', 'username' => 'sana.counter', 'role_id' => $roleId('Counter / Cashier'), 'counter' => 'Counter 2', 'status' => 'active'],
            ['name' => 'Usman Javed', 'username' => 'usman.counter', 'role_id' => $roleId('Counter / Cashier'), 'counter' => 'Counter 3', 'status' => 'inactive'],
        ];

        foreach ($users as $user) {
            User::updateOrCreate(
                ['username' => $user['username']],
                $user + ['email' => $user['username'] . '@bakeryadmart.local', 'password' => 'password123'],
            );
        }
    }
}
