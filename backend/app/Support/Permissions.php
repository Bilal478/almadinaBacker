<?php

namespace App\Support;

/**
 * The fixed vocabulary of permission keys — mirrored on the frontend's PermissionKey type
 * (src/types/index.ts) so both sides agree on what a permission is called. Seeded into the
 * permissions table and registered as Gate abilities in AppServiceProvider.
 */
final class Permissions
{
    public const GROUPS = [
        'Point of Sale' => [
            'view_pos' => 'View POS',
            'create_sale' => 'Create Sale',
            'void_sale' => 'Void Sale',
        ],
        'Products & Inventory' => [
            'view_products' => 'View Products',
            'manage_products' => 'Manage Products',
            'manage_inventory' => 'Manage Inventory',
            'view_purchase_cost' => 'View Purchase Cost',
        ],
        'Suppliers & Purchasing' => [
            'manage_suppliers' => 'Manage Suppliers',
            'manage_purchases' => 'Manage Purchases',
            'manage_supplier_payments' => 'Manage Supplier Payments',
            'view_supplier_balances' => 'View Supplier Balances',
        ],
        'Finance' => [
            'manage_expenses' => 'Manage Expenses',
            'view_reports' => 'View Reports',
            'export_reports' => 'Export Reports',
        ],
        'Administration' => [
            'manage_users' => 'Manage Users',
            'manage_roles' => 'Manage Roles & Permissions',
            'settings' => 'Settings',
        ],
    ];

    public static function all(): array
    {
        return collect(self::GROUPS)->flatMap(fn ($items) => array_keys($items))->values()->all();
    }
}
