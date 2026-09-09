import React, { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import styles from './AppLayout.module.css'
import { supabase } from '../../lib/supabase'

export default function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [counts, setCounts] = useState({ categories: 0, products: 0, priceList: 0, gallery: 0, gst: 0, marquee: 0, settings: 0 })
  const location = useLocation()

  // Fetch counts and listen to database changes in realtime
  useEffect(() => {
    async function fetchCounts() {
      try {
        const [catRes, prodRes, priceRes, gallRes, gstRes, marqRes, settRes] = await Promise.all([
          supabase.from('categories').select('id', { count: 'exact', head: true }),
          supabase.from('products').select('id', { count: 'exact', head: true }),
          supabase.from('price_list').select('id', { count: 'exact', head: true }).catch(() => ({ count: 0 })),
          supabase.from('gallery').select('id', { count: 'exact', head: true }),
          supabase.from('gst_rates').select('id', { count: 'exact', head: true }),
          supabase.from('marquee').select('id', { count: 'exact', head: true }),
          supabase.from('settings').select('id', { count: 'exact', head: true }),
        ])
        setCounts({
          categories: catRes.count || 0,
          products: prodRes.count || 0,
          priceList: priceRes.count || 0,
          gallery: gallRes.count || 0,
          gst: gstRes.count || 0,
          marquee: marqRes.count || 0,
          settings: settRes.count || 0,
        })
      } catch (err) {
        console.warn('Error fetching counts:', err)
      }
    }

    fetchCounts()

    // Realtime channel for Category table changes
    const categoriesChannel = supabase
      .channel('categories-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
        fetchCounts()
      })
      .subscribe()

    // Realtime channel for Product table changes
    const productsChannel = supabase
      .channel('products-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        fetchCounts()
      })
      .subscribe()

    // Realtime channel for Price List table changes
    const priceListChannel = supabase
      .channel('price-list-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'price_list' }, () => {
        fetchCounts()
      })
      .subscribe()

    // Realtime channel for Gallery table changes
    const galleryChannel = supabase
      .channel('gallery-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gallery' }, () => {
        fetchCounts()
      })
      .subscribe()

    // Realtime channel for GST table changes
    const gstChannel = supabase
      .channel('gst-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gst_rates' }, () => {
        fetchCounts()
      })
      .subscribe()

    // Realtime channel for Marquee table changes
    const marqueeChannel = supabase
      .channel('marquee-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'marquee' }, () => {
        fetchCounts()
      })
      .subscribe()

    // Realtime channel for Settings table changes
    const settingsChannel = supabase
      .channel('settings-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, () => {
        fetchCounts()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(categoriesChannel)
      supabase.removeChannel(productsChannel)
      supabase.removeChannel(priceListChannel)
      supabase.removeChannel(galleryChannel)
      supabase.removeChannel(gstChannel)
      supabase.removeChannel(marqueeChannel)
      supabase.removeChannel(settingsChannel)
    }
  }, [location.pathname])

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
