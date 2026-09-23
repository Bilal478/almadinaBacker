<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use App\Support\Permissions;
use Illuminate\Database\Seeder;

class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        foreach (Permissions::GROUPS as $group => $items) {
            foreach ($items as $key => $label) {
                Permission::updateOrCreate(['key' => $key], ['label' => $label, 'group' => $group]);
            }
        }

        $admin = Role::updateOrCreate(
            ['name' => 'Administrator'],
            ['description' => 'Full access to every module, including financials and system configuration.', 'is_system' => true],
        );
        $admin->permissions()->sync(Permission::pluck('id'));

        $manager = Role::updateOrCreate(
            ['name' => 'Store Manager'],
            ['description' => 'Runs day-to-day operations: inventory, purchasing, suppliers and reporting.', 'is_system' => false],
        );
        $manager->permissions()->sync(Permission::whereIn('key', [
            'view_pos', 'create_sale', 'void_sale',
            'view_products', 'manage_products', 'manage_inventory', 'view_purchase_cost',
            'manage_suppliers', 'manage_purchases', 'manage_supplier_payments', 'view_supplier_balances',
            'manage_expenses', 'view_reports', 'export_reports',
        ])->pluck('id'));

        $counter = Role::updateOrCreate(
            ['name' => 'Counter / Cashier'],
            ['description' => 'Front counter role. Can sell and take payments, but cannot see costs or financials.', 'is_system' => false],
        );
        $counter->permissions()->sync(Permission::whereIn('key', ['view_pos', 'create_sale', 'view_products'])->pluck('id'));

        Role::updateOrCreate(
            ['name' => 'Inventory Manager'],
            ['description' => 'Manages stock, purchases and suppliers, without access to financial reports or user management.', 'is_system' => false],
        )->permissions()->sync(Permission::whereIn('key', [
            'view_products', 'manage_products', 'manage_inventory', 'view_purchase_cost',
            'manage_suppliers', 'manage_purchases', 'view_supplier_balances',
        ])->pluck('id'));

        Role::updateOrCreate(
            ['name' => 'Accounts Manager'],
            ['description' => 'Owns supplier payments, expenses and financial reporting.', 'is_system' => false],
        )->permissions()->sync(Permission::whereIn('key', [
            'manage_supplier_payments', 'view_supplier_balances', 'manage_expenses', 'view_reports', 'export_reports',
        ])->pluck('id'));
    }
}
