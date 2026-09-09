import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import styles from '../styles/Dashboard.module.css'
import SalesChart from '../components/Charts/SalesChart'
import CategoryChart from '../components/Charts/CategoryChart'
import Spinner from '../components/UI/Spinner'
import { supabase } from '../lib/supabase'
import { formatCurrency, formatDate, getInitials } from '../lib/utils'

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [kpis, setKpis] = useState({
    totalRevenue: 0,
    monthRevenue: 0,
    totalOrders: 0,
    totalProducts: 0,
    totalCustomers: 0
  })
  const [salesData, setSalesData] = useState([])
  const [categoryData, setCategoryData] = useState([])
  const [recentOrders, setRecentOrders] = useState([])
  const [lowStock, setLowStock] = useState([])

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true)

        // 1. Fetch KPI Counts
        const [ordersRes, productsRes, customersRes, revenueRes] = await Promise.all([
          supabase.from('orders').select('id, total_amount, created_at', { count: 'exact' }),
          supabase.from('products').select('id', { count: 'exact' }),
          supabase.from('customers').select('id', { count: 'exact' }),
          supabase.from('orders').select('total_amount'),
        ])

        const totalOrders = ordersRes.count || 0
        const totalProducts = productsRes.count || 0
        const totalCustomers = customersRes.count || 0
        const totalRevenue = (revenueRes.data || []).reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0)

        // Monthly revenue
        const now = new Date()
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        const { data: monthOrders } = await supabase
          .from('orders')
          .select('total_amount')
          .gte('created_at', monthStart)
        const monthRevenue = (monthOrders || []).reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0)

        setKpis({
          totalRevenue,
          monthRevenue,
          totalOrders,
          totalProducts,
          totalCustomers
        })

        // 2. Load 7 Days Sales Chart Data
        const days = 7
        const salesPromises = []
        for (let i = days - 1; i >= 0; i--) {
          const date = new Date()
          date.setDate(date.getDate() - i)
          const dateStr = date.toISOString().split('T')[0]
          
          salesPromises.push(
            supabase
              .from('orders')
              .select('total_amount')
              .gte('created_at', `${dateStr}T00:00:00`)
              .lte('created_at', `${dateStr}T23:59:59`)
              .then(({ data }) => {
                const dayTotal = (data || []).reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0)
                return {
                  label: date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' }),
                  dateLabel: date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
                  value: dayTotal
                }
              })
          )
        }
        const resolvedSales = await Promise.all(salesPromises)
        setSalesData(resolvedSales)

        // 3. Load Category Chart Data
        const { data: categories } = await supabase.from('categories').select('id, name')
        const { data: orderItems } = await supabase
          .from('order_items')
          .select('quantity, unit_price, product:product_id(category_id)')

        const catRevenue = {}
        if (orderItems) {
          orderItems.forEach(item => {
            const catId = item.product?.category_id
            if (catId) {
              catRevenue[catId] = (catRevenue[catId] || 0) + (item.quantity * item.unit_price)
            }
          })
        }

        const resolvedCatData = (categories || []).map(cat => ({
          name: cat.name,
          value: catRevenue[cat.id] || 0
        })).filter(item => item.value > 0)
        setCategoryData(resolvedCatData)

        // 4. Load Recent Orders
        const { data: recent } = await supabase
          .from('orders')
          .select('id, status, total_amount, created_at, customer:customer_id(name)')
          .order('created_at', { ascending: false })
          .limit(5)
        setRecentOrders(recent || [])

        // 5. Load Low Stock Products
        const { data: stockAlerts } = await supabase
          .from('products')
          .select('id, name, stock, image_url')
          .order('stock', { ascending: true })
          .limit(5)
        setLowStock(stockAlerts || [])

      } catch (err) {
        console.error('Error loading dashboard:', err)
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [])

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className={styles.dashboard}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>📊 Dashboard</h1>
          <p className={styles.pageSubtitle}>Welcome back! Here's what's happening with your store.</p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className={styles.kpiGrid}>
        {/* Total Revenue */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiDecor} style={{ background: 'var(--primary)' }} />
          <div className={styles.kpiIcon} style={{ background: 'var(--primary-bg)' }}>💰</div>
          <div className={styles.kpiLabel}>Total Revenue</div>
          <div className={styles.kpiValue}>{formatCurrency(kpis.totalRevenue)}</div>
          <div className={styles.kpiSubText}>
            this month: <strong>{formatCurrency(kpis.monthRevenue)}</strong>
          </div>
        </div>

        {/* Total Orders */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiDecor} style={{ background: 'var(--info)' }} />
          <div className={styles.kpiIcon} style={{ background: 'var(--info-bg)' }}>📦</div>
          <div className={styles.kpiLabel}>Total Orders</div>
          <div className={styles.kpiValue}>{kpis.totalOrders.toLocaleString('en-IN')}</div>
          <div className={styles.kpiSubText} style={{ color: 'var(--info)' }}>
            All time total
          </div>
        </div>

        {/* Total Products */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiDecor} style={{ background: 'var(--secondary)' }} />
          <div className={styles.kpiIcon} style={{ background: 'var(--secondary-bg)' }}>🎇</div>
          <div className={styles.kpiLabel}>Products</div>
          <div className={styles.kpiValue}>{kpis.totalProducts.toLocaleString('en-IN')}</div>
          <div className={styles.kpiSubText} style={{ color: 'var(--secondary)' }}>
            Active firework items
          </div>
        </div>

        {/* Total Customers */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiDecor} style={{ background: 'var(--success)' }} />
          <div className={styles.kpiIcon} style={{ background: 'var(--success-bg)' }}>👥</div>
          <div className={styles.kpiLabel}>Customers</div>
          <div className={styles.kpiValue}>{kpis.totalCustomers.toLocaleString('en-IN')}</div>
          <div className={styles.kpiSubText} style={{ color: 'var(--success)' }}>
            Registered customers
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className={styles.chartsGrid}>
        <div className={styles.chartCard}>
          <h2 className={styles.chartTitle}>Revenue (Last 7 Days)</h2>
          <div className={styles.chartWrapper}>
            <SalesChart data={salesData} />
          </div>
        </div>

        <div className={styles.chartCard}>
          <h2 className={styles.chartTitle}>Sales by Category</h2>
          <div className={styles.chartWrapper}>
            {categoryData.length > 0 ? (
              <CategoryChart data={categoryData} />
            ) : (
              <div className={styles.emptyChart}>No sales data per category yet.</div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className={styles.bottomGrid}>
        {/* Recent Orders */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>🕐 Recent Orders</h2>
            <Link to="/orders" className={styles.cardLink}>View All →</Link>
          </div>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.length > 0 ? (
                  recentOrders.map(o => (
                    <tr key={o.id}>
                      <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>
                        #{o.id.substring(0, 8).toUpperCase()}
                      </td>
                      <td>
                        <div className={styles.customerCell}>
                          <div className={styles.avatarMini}>{getInitials(o.customer?.name)}</div>
                          <span>{o.customer?.name || 'Guest'}</span>
                        </div>
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--primary-dark)' }}>
                        {formatCurrency(o.total_amount)}
                      </td>
                      <td style={{ color: 'var(--gray-400)', fontSize: '13px' }}>
                        {formatDate(o.created_at)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '32px', color: 'var(--gray-400)' }}>
                      No orders yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>⚠️ Low Stock Alert</h2>
            <Link to="/products" className={styles.cardLink}>Manage →</Link>
          </div>
          <div className={styles.stockList}>
            {lowStock.length > 0 ? (
              lowStock.map(p => {
                const pct = Math.min((p.stock / 50) * 100, 100)
                let barColor = 'var(--success)'
                if (p.stock === 0) barColor = 'var(--danger)'
                else if (p.stock < 10) barColor = 'var(--warning)'

                return (
                  <div key={p.id} className={styles.stockItem}>
                    <div className={styles.stockImg}>
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} />
                      ) : (
                        <span>🎆</span>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className={styles.stockName}>{p.name}</div>
                      <div className={styles.stockBarBg}>
                        <div className={styles.stockBarFill} style={{ width: `${pct}%`, background: barColor }} />
                      </div>
                    </div>
                    <span className={styles.stockCount} style={{ color: barColor }}>
                      {p.stock} left
                    </span>
                  </div>
                )
              })
            ) : (
              <div style={{ textAlign: 'center', padding: '32px', color: 'var(--gray-400)' }}>
                No product items in store.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
