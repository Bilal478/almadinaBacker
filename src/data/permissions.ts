import type { PermissionKey } from '@/types'

export interface PermissionDef {
  key: PermissionKey
  label: string
  group: string
}

export const PERMISSION_GROUPS: { group: string; items: PermissionDef[] }[] = [
  {
    group: 'Point of Sale',
    items: [
      { key: 'view_pos', label: 'View POS', group: 'Point of Sale' },
      { key: 'create_sale', label: 'Create Sale', group: 'Point of Sale' },
      { key: 'void_sale', label: 'Void Sale', group: 'Point of Sale' },
    ],
  },
  {
    group: 'Products & Inventory',
    items: [
      { key: 'view_products', label: 'View Products', group: 'Products & Inventory' },
      { key: 'manage_products', label: 'Manage Products', group: 'Products & Inventory' },
      { key: 'manage_inventory', label: 'Manage Inventory', group: 'Products & Inventory' },
      { key: 'view_purchase_cost', label: 'View Purchase Cost', group: 'Products & Inventory' },
    ],
  },
  {
    group: 'Suppliers & Purchasing',
    items: [
      { key: 'manage_suppliers', label: 'Manage Suppliers', group: 'Suppliers & Purchasing' },
      { key: 'manage_purchases', label: 'Manage Purchases', group: 'Suppliers & Purchasing' },
      { key: 'manage_supplier_payments', label: 'Manage Supplier Payments', group: 'Suppliers & Purchasing' },
      { key: 'view_supplier_balances', label: 'View Supplier Balances', group: 'Suppliers & Purchasing' },
    ],
  },
  {
    group: 'Finance',
    items: [
      { key: 'manage_expenses', label: 'Manage Expenses', group: 'Finance' },
      { key: 'view_reports', label: 'View Reports', group: 'Finance' },
      { key: 'export_reports', label: 'Export Reports', group: 'Finance' },
    ],
  },
  {
    group: 'Administration',
    items: [
      { key: 'manage_users', label: 'Manage Users', group: 'Administration' },
      { key: 'manage_roles', label: 'Manage Roles & Permissions', group: 'Administration' },
      { key: 'settings', label: 'Settings', group: 'Administration' },
    ],
  },
]

export const ALL_PERMISSIONS: PermissionDef[] = PERMISSION_GROUPS.flatMap((g) => g.items)

export const PERMISSION_LABELS: Record<PermissionKey, string> = Object.fromEntries(
  ALL_PERMISSIONS.map((p) => [p.key, p.label]),
) as Record<PermissionKey, string>
