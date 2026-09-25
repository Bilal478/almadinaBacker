// ===================== Core domain types =====================

// A unit code references UnitOfMeasure.code — units are user-managed (see Units screen),
// not a fixed enum, the same way Supplier Type is a managed list rather than a union.
export type Unit = string

export interface UnitOfMeasure {
  id: string
  code: string
  name: string
  status: 'active' | 'inactive'
  /** Whether this unit can be sold/stocked in fractions — e.g. Kilogram allows 0.3, but
   *  Pieces doesn't (you can't sell a third of a piece). Drives quantity input granularity
   *  everywhere a product using this unit is bought or sold. */
  decimalAllowed: boolean
}

export type ProductStatus = 'active' | 'inactive'

export interface CurrentPrice {
  purchaseCost: number
  customerPrice: number
  retailerPrice: number
  effectiveDate: string
}

export interface Product {
  id: string
  code: string // SKU
  barcode: string
  qrCode?: string
  name: string
  category: string
  categoryId: string
  unit: Unit
  lowStockLevel: number
  expiryTracking: boolean
  status: ProductStatus
  createdAt: string
  // Computed server-side and included whenever the API returns a product.
  stock: number
  currentPrice: CurrentPrice | null
  nearestExpiry: string | null
}

/** A historical price record. Never overwritten — new changes are appended. */
export interface PriceHistoryEntry {
  id: string
  productId: string
  effectiveDate: string
  purchaseCost: number
  customerPrice: number
  retailerPrice: number
  changedBy: string
  note?: string
}

/** A purchase batch — the unit of inventory costing (supports FIFO). */
export interface Batch {
  id: string
  productId: string
  batchNo: string
  purchaseId: string
  supplierId: string
  purchaseDate: string
  expiryDate?: string
  cost: number
  quantity: number
  remaining: number
  supplierName: string
}

export interface Category {
  id: string
  name: string
  description?: string
  status: 'active' | 'inactive'
}

export type SupplierStatus = 'active' | 'inactive'

export interface SupplierType {
  id: string
  name: string
  description?: string
  status: SupplierStatus
}

export interface Supplier {
  id: string
  name: string
  phone: string
  address: string
  supplierTypeId: string
  status: SupplierStatus
  openingBalance: number
  // Computed server-side: opening balance + purchases - payments - adjustments.
  outstanding: number
}

export interface PurchaseLineItem {
  productId: string
  quantity: number
  unit: Unit
  cost: number
  expiryDate?: string
  batchNo: string
}

export type PurchaseStatus = 'pending' | 'partial' | 'paid'

export interface Purchase {
  id: string
  invoiceNo: string
  supplierId: string
  date: string
  items: PurchaseLineItem[]
  totalAmount: number
  paidAmount: number
  status: PurchaseStatus
}

export type LedgerEntryType = 'purchase' | 'payment' | 'return' | 'adjustment' | 'opening'

export interface SupplierLedgerEntry {
  id: string
  supplierId: string
  date: string
  type: LedgerEntryType
  reference: string
  description: string
  debit: number // increases what we owe supplier (purchases)
  credit: number // decreases what we owe supplier (payments)
}

export type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'other'

export interface SupplierPayment {
  id: string
  supplierId: string
  amount: number
  method: PaymentMethod
  date: string
  reference: string
  notes?: string
}

// ===================== Sales / POS =====================

export interface CartItem {
  productId: string
  name: string
  code: string
  unit: Unit
  qty: number
  unitPrice: number // price actually charged, snapshot at time of sale
  unitCost: number // inventory cost snapshot (weighted from batches consumed), for profit calc
  discount: number // absolute discount amount for the line
  batchAllocations: { batchId: string; qty: number; cost: number }[]
}

export type PriceTier = 'customer' | 'retailer'

export interface SaleItem {
  /** The sale_item row id — required to process a return against this exact line. */
  id: string
  productId: string
  name: string
  code: string
  unit: Unit
  qty: number
  unitPrice: number
  unitCost: number
  discount: number
  total: number
  /** Already returned from this line, across all prior returns — caps how much more can go back. */
  returnedQty: number
}

export type SaleStatus = 'completed' | 'held' | 'voided'

export interface Sale {
  id: string
  invoiceNo: string
  date: string
  /** The actual moment the sale was rung up (has real time-of-day) — `date` is a business/
   *  accounting date only, always midnight, and must never be used for a printed clock time. */
  createdAt: string
  counter: string
  cashierId: string
  cashierName: string
  customerName?: string
  priceTier: PriceTier
  items: SaleItem[]
  subtotal: number
  discount: number
  grandTotal: number
  paymentMethod: PaymentMethod
  amountReceived: number
  change: number
  status: SaleStatus
  printedAt?: string | null
}

// ===================== Expenses =====================

export interface Expense {
  id: string
  date: string
  category: string
  description: string
  amount: number
  paidBy: string
}

// ===================== Users / Roles / Permissions =====================

export type PermissionKey =
  | 'view_pos'
  | 'create_sale'
  | 'void_sale'
  | 'view_products'
  | 'manage_products'
  | 'manage_inventory'
  | 'manage_suppliers'
  | 'manage_purchases'
  | 'manage_supplier_payments'
  | 'manage_expenses'
  | 'view_reports'
  | 'export_reports'
  | 'manage_users'
  | 'manage_roles'
  | 'settings'
  | 'view_purchase_cost'
  | 'view_supplier_balances'

export interface Role {
  id: string
  name: string
  description: string
  permissions: PermissionKey[]
  isSystem?: boolean
  userCount?: number
}

export type UserStatus = 'active' | 'inactive'

export interface User {
  id: string
  name: string
  username: string
  roleId: string
  status: UserStatus
  counter?: string
}
