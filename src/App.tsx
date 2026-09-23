import { useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { AppBootstrap } from '@/components/layout/AppBootstrap'
import { RequireAuth } from '@/components/layout/RequireAuth'
import { RequirePermission } from '@/components/layout/RequirePermission'
import { useAuthStore } from '@/store/authStore'
import { LoginPage } from '@/pages/Login'
import { DashboardPage } from '@/pages/Dashboard'
import { PosPage } from '@/pages/pos/PosPage'
import { ProductsPage } from '@/pages/Products'
import { CategoriesPage } from '@/pages/Categories'
import { UnitsPage } from '@/pages/Units'
import { InventoryPage } from '@/pages/Inventory'
import { PurchasesPage } from '@/pages/Purchases'
import { SuppliersPage } from '@/pages/Suppliers'
import { SupplierTypesPage } from '@/pages/SupplierTypes'
import { SupplierPaymentsPage } from '@/pages/SupplierPayments'
import { ExpensesPage } from '@/pages/Expenses'
import { ReportsPage } from '@/pages/Reports'
import { UsersPage } from '@/pages/Users'
import { RolesPage } from '@/pages/Roles'
import { SettingsPage } from '@/pages/Settings'

export default function App() {
  const init = useAuthStore((s) => s.init)
  const status = useAuthStore((s) => s.status)

  useEffect(() => {
    init()
  }, [init])

  if (status === 'idle' || status === 'loading') {
    return <div className="flex h-screen w-screen items-center justify-center bg-app-bg text-sm text-ink-faint">Loading…</div>
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<RequireAuth />}>
          <Route element={<AppBootstrap />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route
              path="/pos"
              element={
                <RequirePermission permission="view_pos">
                  <PosPage />
                </RequirePermission>
              }
            />
            <Route
              path="/products"
              element={
                <RequirePermission permission="view_products">
                  <ProductsPage />
                </RequirePermission>
              }
            />
            <Route
              path="/categories"
              element={
                <RequirePermission permission="manage_products">
                  <CategoriesPage />
                </RequirePermission>
              }
            />
            <Route
              path="/units"
              element={
                <RequirePermission permission="manage_products">
                  <UnitsPage />
                </RequirePermission>
              }
            />
            <Route
              path="/inventory"
              element={
                <RequirePermission permission="manage_inventory">
                  <InventoryPage />
                </RequirePermission>
              }
            />
            <Route
              path="/purchases"
              element={
                <RequirePermission permission="manage_purchases">
                  <PurchasesPage />
                </RequirePermission>
              }
            />
            <Route
              path="/suppliers"
              element={
                <RequirePermission permission="manage_suppliers">
                  <SuppliersPage />
                </RequirePermission>
              }
            />
            <Route
              path="/supplier-types"
              element={
                <RequirePermission permission="manage_suppliers">
                  <SupplierTypesPage />
                </RequirePermission>
              }
            />
            <Route
              path="/supplier-payments"
              element={
                <RequirePermission permission="manage_supplier_payments">
                  <SupplierPaymentsPage />
                </RequirePermission>
              }
            />
            <Route
              path="/expenses"
              element={
                <RequirePermission permission="manage_expenses">
                  <ExpensesPage />
                </RequirePermission>
              }
            />
            <Route
              path="/reports"
              element={
                <RequirePermission permission="view_reports">
                  <ReportsPage />
                </RequirePermission>
              }
            />
            <Route
              path="/users"
              element={
                <RequirePermission permission="manage_users">
                  <UsersPage />
                </RequirePermission>
              }
            />
            <Route
              path="/roles"
              element={
                <RequirePermission permission="manage_roles">
                  <RolesPage />
                </RequirePermission>
              }
            />
            <Route
              path="/settings"
              element={
                <RequirePermission permission="settings">
                  <SettingsPage />
                </RequirePermission>
              }
            />
          </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
