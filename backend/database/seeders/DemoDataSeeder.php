<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DemoDataSeeder extends Seeder
{
    /**
     * Local/dev/demo only — NEVER run this against a real bakery's production database.
     * Seeds the base configuration (roles, settings, admin) plus a full fictional dataset:
     * demo staff accounts (shared password: password123), suppliers, products with price
     * history, purchases/stock, sales and expenses — so the app has something to look at
     * without touching real business data.
     */
    public function run(): void
    {
        $this->call([
            RolePermissionSeeder::class,
            BusinessSettingSeeder::class,
            AdminUserSeeder::class,
            UnitSeeder::class,
            CategorySeeder::class,
            SupplierTypeSeeder::class,
            SupplierSeeder::class,
            DemoUserSeeder::class,
            ProductSeeder::class,
            PurchaseSeeder::class,
            SupplierPaymentSeeder::class,
            SaleSeeder::class,
            ExpenseSeeder::class,
        ]);
    }
}
