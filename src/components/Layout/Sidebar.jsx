import React from 'react'
import { NavLink } from 'react-router-dom'
import styles from './Sidebar.module.css'
import { useAuth } from '../../context/AuthContext'

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/categories', label: 'Categories', icon: '🗂️' },
  { path: '/products', label: 'Products', icon: '🎇' },
  { path: '/orders', label: 'Orders', icon: '📦' },
  { path: '/customers', label: 'Customers', icon: '👥' },
  { path: '/price-list', label: 'Price List', icon: '📄' },
  { path: '/gallery', label: 'Gallery', icon: '🎥' },
  { path: '/marquee', label: 'Marquee Banner', icon: '📢' },
  { path: '/settings', label: 'Min Order Settings', icon: '⚙️' },
]

export default function Sidebar({ collapsed, mobileOpen, toggleMobile, counts }) {
  const { user, signOut } = useAuth()
  const adminName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Admin'

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to log out?')) {
      await signOut()
    }
  }

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className={styles.overlay} onClick={toggleMobile} />
      )}

      <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''} ${mobileOpen ? styles.mobileOpen : ''}`}>
        {/* Brand Logo */}
        <div className={styles.brand}>
          <img src="/logo.png" alt="Marsel Traders" className={styles.logoImg} />
        </div>

        {/* Navigation links */}
        <nav className={styles.nav}>
          <div className={styles.navSectionLabel}>
            {collapsed ? '•••' : 'Main Menu'}
          </div>

          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={toggleMobile}
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              {!collapsed && (
                <>
                  <span className={styles.navLabel}>{item.label}</span>
                  {item.label === 'Categories' && counts?.categories !== undefined && (
                    <span className={styles.navBadge}>{counts.categories}</span>
                  )}
                  {item.label === 'Products' && counts?.products !== undefined && (
                    <span className={styles.navBadge}>{counts.products}</span>
                  )}
                  {item.label === 'Price List' && counts?.priceList !== undefined && (
                    <span className={styles.navBadge}>{counts.priceList}</span>
                  )}
                  {item.label === 'Gallery' && counts?.gallery !== undefined && (
                    <span className={styles.navBadge}>{counts.gallery}</span>
                  )}
                  {item.label === 'Marquee Banner' && counts?.marquee !== undefined && (
                    <span className={styles.navBadge}>{counts.marquee}</span>
                  )}
                  {item.label === 'Min Order Settings' && counts?.settings !== undefined && (
                    <span className={styles.navBadge}>{counts.settings}</span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User Info footer */}
        <div className={styles.footer}>
          <div className={styles.userContainer}>
            <div className={styles.avatar}>
              {adminName.charAt(0).toUpperCase()}
            </div>
            {!collapsed && (
              <div className={styles.userInfo}>
                <div className={styles.userName}>{adminName}</div>
                <div className={styles.userRole}>Administrator</div>
              </div>
            )}
            <button className={styles.logoutBtn} onClick={handleLogout} title="Log out">
              🚪
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
