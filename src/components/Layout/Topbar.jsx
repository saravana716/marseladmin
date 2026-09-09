import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import styles from './Topbar.module.css'
import { useAuth } from '../../context/AuthContext'

export default function Topbar({ onToggleSidebar, onToggleMobile }) {
  const [dateStr, setDateStr] = useState('')
  const location = useLocation()
  const { signOut } = useAuth()

  useEffect(() => {
    const updateDate = () => {
      setDateStr(
        new Date().toLocaleDateString('en-IN', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      )
    }
    updateDate()
    const timer = setInterval(updateDate, 60000)
    return () => clearInterval(timer)
  }, [])

  // Generate breadcrumb title
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/': return 'Dashboard'
      case '/categories': return 'Categories'
      case '/products': return 'Products'
      case '/orders': return 'Orders'
      case '/customers': return 'Customers'
      case '/gallery': return 'Media Gallery'
      case '/marquee': return 'Marquee Banner'
      case '/settings': return 'Min Order Settings'
      default: return 'Marsel Traders'
    }
  }

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to log out?')) {
      try {
        await signOut()
      } catch (err) {
        alert('Logout failed: ' + err.message)
      }
    }
  }

  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        {/* Toggle buttons */}
        <button className={styles.menuBtn} onClick={onToggleMobile} aria-label="Toggle mobile menu">
          ☰
        </button>
        <button className={styles.collapseBtn} onClick={onToggleSidebar} aria-label="Toggle sidebar width">
          ☰
        </button>

        <div className={styles.breadcrumb}>
          <span>🏠</span>
          <span className={styles.divider}>/</span>
          <strong className={styles.activePage}>{getPageTitle()}</strong>
        </div>
      </div>

      <div className={styles.right}>
        <div className={styles.date}>
          📅 {dateStr}
        </div>
        <div className={styles.separator} />
        <button className={styles.logoutBtn} onClick={handleLogout}>
          🚪 <span className={styles.logoutText}>Logout</span>
        </button>
      </div>
    </header>
  )
}
