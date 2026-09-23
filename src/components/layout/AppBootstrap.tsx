import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useProductStore } from '@/store/productStore'
import { useUnitStore } from '@/store/unitStore'
import { useCategoryStore } from '@/store/categoryStore'
import { useSupplierStore } from '@/store/supplierStore'
import { useSalesStore } from '@/store/salesStore'
import { useExpenseStore } from '@/store/expenseStore'
import { useExpenseCategoryStore } from '@/store/expenseCategoryStore'
import { useUserStore } from '@/store/userStore'
import { useInventoryStore } from '@/store/inventoryStore'
import { useSettingsStore } from '@/store/settingsStore'

/**
 * Fetches every reference list the app needs, once per login, so the rest of the app can read
 * from store caches synchronously — the same way it behaved against the old in-memory mock data.
 */
export function AppBootstrap() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    // Some of these 403 for lower-privilege roles (e.g. a counter user can't list expenses) —
    // that's expected, the corresponding route is permission-gated anyway, so swallow per-call.
    Promise.all([
      useProductStore.getState().fetchAll(),
      useUnitStore.getState().fetchAll(),
      useCategoryStore.getState().fetchAll(),
      useSupplierStore.getState().fetchAll(),
      useSalesStore.getState().fetchAll(),
      useExpenseStore.getState().fetchAll(),
      useExpenseCategoryStore.getState().fetchAll(),
      useUserStore.getState().fetchAll(),
      useInventoryStore.getState().fetchAll(),
      useSettingsStore.getState().fetch(),
    ].map((p) => p.catch(() => {}))).finally(() => {
      if (!cancelled) setReady(true)
      const storeName = useSettingsStore.getState().settings?.storeName
      if (storeName) document.title = `${storeName} — POS`
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (!ready) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-app-bg text-sm text-ink-faint">
        Loading…
      </div>
    )
  }

  return <Outlet />
}
