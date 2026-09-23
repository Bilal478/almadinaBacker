import type { PermissionKey } from '@/types'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Boxes,
  Truck,
  Users,
  Wallet,
  Banknote,
  BarChart3,
  UserCog,
  ShieldCheck,
  Settings,
  Tags,
  Ruler,
  FolderTree,
} from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: typeof LayoutDashboard
  permission?: PermissionKey
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/pos', label: 'POS / Sales', icon: ShoppingCart, permission: 'view_pos' },
  { to: '/products', label: 'Products', icon: Package, permission: 'view_products' },
  { to: '/categories', label: 'Categories', icon: FolderTree, permission: 'manage_products' },
  { to: '/units', label: 'Units', icon: Ruler, permission: 'manage_products' },
  { to: '/inventory', label: 'Inventory', icon: Boxes, permission: 'manage_inventory' },
  { to: '/purchases', label: 'Purchases', icon: Truck, permission: 'manage_purchases' },
  { to: '/suppliers', label: 'Suppliers', icon: Users, permission: 'manage_suppliers' },
  { to: '/supplier-types', label: 'Supplier Types', icon: Tags, permission: 'manage_suppliers' },
  { to: '/supplier-payments', label: 'Supplier Payments', icon: Wallet, permission: 'manage_supplier_payments' },
  { to: '/expenses', label: 'Expenses', icon: Banknote, permission: 'manage_expenses' },
  { to: '/reports', label: 'Reports', icon: BarChart3, permission: 'view_reports' },
  { to: '/users', label: 'Users', icon: UserCog, permission: 'manage_users' },
  { to: '/roles', label: 'Roles & Permissions', icon: ShieldCheck, permission: 'manage_roles' },
  { to: '/settings', label: 'Settings', icon: Settings, permission: 'settings' },
]
