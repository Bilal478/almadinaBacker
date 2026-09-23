<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Production-safe by default: only required system configuration and reusable reference
     * data — permissions/roles, the store's own business settings row, exactly one
     * Administrator account, and a starter list of common units of measure (kg, g, pcs,
     * dozen, etc. — every bakery needs some units before it can add its first product, and
     * these aren't tied to any fictional product/business, unlike the rest of the demo set).
     * No demo products, suppliers, purchases or sales are created here.
     *
     * For local development with a full sample dataset to click around, run DemoDataSeeder
     * explicitly instead: `php artisan db:seed --class=Database\\Seeders\\DemoDataSeeder`
     * (it seeds this same base first, then layers demo data on top).
     */
    public function run(): void
    {
        $this->call([
            RolePermissionSeeder::class,
            BusinessSettingSeeder::class,
            AdminUserSeeder::class,
            UnitSeeder::class,
        ]);
    }
}
