<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class AdminUserSeeder extends Seeder
{
    /**
     * Production entry point: exactly one Administrator account, no demo staff. Credentials
     * come from the environment so no real password is ever committed to the repo — if
     * ADMIN_PASSWORD isn't set, a random one is generated and printed once, here, so whoever
     * runs the seeder can capture it immediately.
     */
    public function run(): void
    {
        if (User::query()->exists()) {
            return;
        }

        $roleId = Role::where('name', 'Administrator')->value('id');
        $username = env('ADMIN_USERNAME', 'admin');
        $password = env('ADMIN_PASSWORD');
        $generated = false;

        if (!$password) {
            $password = Str::password(14);
            $generated = true;
        }

        User::create([
            'name' => env('ADMIN_NAME', 'Administrator'),
            'username' => $username,
            'email' => env('ADMIN_EMAIL', $username . '@bakery.local'),
            'role_id' => $roleId,
            'counter' => null,
            'status' => 'active',
            'password' => $password,
        ]);

        if ($generated) {
            $this->command?->warn("Admin account created — username: {$username} / password: {$password}");
            $this->command?->warn('Save this password now — it will not be shown again. Change it after first login.');
        } else {
            $this->command?->info("Admin account created — username: {$username} (password from ADMIN_PASSWORD env var)");
        }
    }
}
