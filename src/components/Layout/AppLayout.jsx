import React, { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import styles from './AppLayout.module.css'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

export default function AppLayout() {
  const { session } = useAuth()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [counts, setCounts] = useState({
    categories: 0,
    products: 0,
    orders: 0,
    customers: 0,
    priceList: 0,
    gallery: 0,
    marquee: 0,
    settings: 0
  })
  const location = useLocation()

  // Helper to fetch count for a single table safely with fallback
  const getCount = async (table) => {
    try {
      const { count, data, error } = await supabase.from(table).select('id', { count: 'exact' })
      if (error || count === null || count === undefined) {
        const { data: list } = await supabase.from(table).select('id')
        return list ? list.length : 0
      }
      return count
    } catch (e) {
      console.error(`Error getting count for ${table}:`, e)
      return 0
    }
  }

  // Fetch counts and listen to database changes in realtime
  useEffect(() => {
    async function fetchCounts() {
      const [categories, products, orders, customers, priceList, gallery, marquee, settings] = await Promise.all([
        getCount('categories'),
        getCount('products'),
        getCount('orders'),
        getCount('customers'),
        getCount('price_list'),
        getCount('gallery'),
        getCount('marquee'),
        getCount('settings'),
      ])

      setCounts({
        categories,
        products,
        orders,
        customers,
        priceList,
        gallery,
        marquee,
        settings,
      })
    }

    fetchCounts()

    // Realtime subscription channels
    const channels = [
      supabase.channel('categories-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, fetchCounts),
      supabase.channel('products-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, fetchCounts),
      supabase.channel('orders-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchCounts),
      supabase.channel('customers-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, fetchCounts),
      supabase.channel('price-list-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'price_list' }, fetchCounts),
      supabase.channel('gallery-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'gallery' }, fetchCounts),
      supabase.channel('marquee-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'marquee' }, fetchCounts),
      supabase.channel('settings-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, fetchCounts),
    ]

    channels.forEach(ch => ch.subscribe())

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch))
    }
  }, [location.pathname, session])

  return (
    <div className={styles.layout}>
      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        toggleMobile={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        counts={counts}
      />
      
      <div className={`${styles.main} ${sidebarCollapsed ? styles.expanded : ''}`}>
        <Topbar
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          onToggleMobile={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        />
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
