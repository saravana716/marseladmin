import React, { useState, useEffect } from 'react'
import styles from '../styles/Customers.module.css'
import Modal from '../components/UI/Modal'
import Button from '../components/UI/Button'
import EmptyState from '../components/UI/EmptyState'
import Table from '../components/UI/Table'
import Badge from '../components/UI/Badge'
import Spinner from '../components/UI/Spinner'
import { supabase } from '../lib/supabase'
import { formatCurrency, formatDate, getInitials } from '../lib/utils'

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [filtered, setFiltered] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // History modal state
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [selectedCust, setSelectedCust] = useState(null)
  const [custOrders, setCustOrders] = useState([])
  const [modalLoading, setModalLoading] = useState(false)

  const fetchCustomers = async () => {
    try {
      setLoading(true)

      // Fetch customers
      const { data: custData, error: custErr } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false })

      if (custErr) throw custErr

      // Fetch order counts
      const { data: ordersData, error: ordersErr } = await supabase
        .from('orders')
        .select('customer_id, total_amount')

      if (ordersErr) throw ordersErr

      const stats = {}
      if (ordersData) {
        ordersData.forEach(o => {
          if (!stats[o.customer_id]) {
            stats[o.customer_id] = { count: 0, revenue: 0 }
          }
          stats[o.customer_id].count++
          stats[o.customer_id].revenue += parseFloat(o.total_amount) || 0
        })
      }

      const enriched = (custData || []).map(c => ({
        ...c,
        orderCount: stats[c.id]?.count || 0,
        totalSpent: stats[c.id]?.revenue || 0,
      }))

      setCustomers(enriched)
      setFiltered(enriched)
    } catch (err) {
      alert('Error fetching customers: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomers()
  }, [])

  // Filter list
  useEffect(() => {
    const q = search.toLowerCase()
    const result = customers.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.phone || '').includes(q)
    )
    setFiltered(result)
  }, [search, customers])

  const handleOpenHistory = async (cust) => {
    setSelectedCust(cust)
    setCustOrders([])
    setHistoryModalOpen(true)
    setModalLoading(true)

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_id', cust.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setCustOrders(data || [])
    } catch (err) {
      alert('Failed to load user orders: ' + err.message)
    } finally {
      setModalLoading(false)
    }
  }

  return (
    <div className={styles.customers}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>
            👥 Customers
            <span className={styles.badge}>{filtered.length}</span>
          </h1>
          <p className={styles.pageSubtitle}>View registered buyers and their purchasing stats</p>
        </div>
        <Button variant="outline" onClick={fetchCustomers}>🔄 Refresh</Button>
      </div>

      {/* Filter and search bar */}
      <div className={styles.filterBar}>
        <div className={styles.searchBox}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search by name, email, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Content table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px' }}>
          <Spinner size="lg" />
        </div>
      ) : filtered.length > 0 ? (
        <Table headers={['Customer', 'Contact', 'Address', 'Orders', 'Total Spent', 'Joined', 'Actions']}>
          {filtered.map(c => (
            <tr key={c.id}>
              <td>
                <div className={styles.customerCell}>
                  <div className={styles.avatar}>{getInitials(c.name)}</div>
                  <div>
                    <div style={{ fontWeight: 700 }}>{c.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--gray-400)' }}>{c.email}</div>
                  </div>
                </div>
              </td>
              <td>
                <div style={{ fontSize: '13px' }}>{c.phone || '—'}</div>
              </td>
              <td>
                <div style={{ fontSize: '13px', color: 'var(--gray-500)', maxWidth: '150px' }} className="truncate">
                  {c.address || '—'}
                </div>
              </td>
              <td>
                <Badge variant="info">{c.orderCount} orders</Badge>
              </td>
              <td style={{ fontWeight: 700, color: 'var(--primary-dark)' }}>
                {formatCurrency(c.totalSpent)}
              </td>
              <td style={{ fontSize: '13px', color: 'var(--gray-400)' }}>
                {formatDate(c.created_at)}
              </td>
              <td>
                <Button variant="outline" size="sm" onClick={() => handleOpenHistory(c)}>
                  📋 History
                </Button>
              </td>
            </tr>
          ))}
        </Table>
      ) : (
        <EmptyState
          icon="👥"
          title="No customers recorded"
          text="Wait for users to register in order to populate this list."
        />
      )}

      {/* Customer profile / history modal */}
      <Modal
        open={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        title="👤 Customer Profile"
        size="md"
        footer={
          <Button variant="outline" onClick={() => setHistoryModalOpen(false)}>
            Close
          </Button>
        }
      >
        {selectedCust && (
          <div className={styles.modalContent}>
            {/* profile card */}
            <div className={styles.profileCard}>
              <div className={styles.avatarBig}>{getInitials(selectedCust.name)}</div>
              <div style={{ flex: 1 }}>
                <h3 className={styles.profileName}>{selectedCust.name}</h3>
                <div className={styles.profileEmail}>{selectedCust.email}</div>
                <div className={styles.profilePhone}>{selectedCust.phone || '—'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className={styles.spentValue}>{formatCurrency(selectedCust.totalSpent)}</div>
                <div className={styles.spentLabel}>Total Spent</div>
                <div className={styles.ordersValue}>{selectedCust.orderCount}</div>
                <div className={styles.spentLabel}>Total Orders</div>
              </div>
            </div>

            <div style={{ fontSize: '11px', color: 'var(--gray-400)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
              Address
            </div>
            <p style={{ fontSize: '13.5px', color: 'var(--gray-600)', marginBottom: '20px' }}>
              {selectedCust.address || 'No shipping address saved.'}
            </p>

            <div style={{ fontSize: '11px', color: 'var(--gray-400)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
              Order History
            </div>

            {modalLoading ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <Spinner />
              </div>
            ) : custOrders.length > 0 ? (
              <div className={styles.historyTableWrapper}>
                <table className={styles.historyTable}>
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Status</th>
                      <th>Amount</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {custOrders.map(o => (
                      <tr key={o.id}>
                        <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>
                          #{o.id.substring(0, 8).toUpperCase()}
                        </td>
                        <td>
                          <Badge variant={o.status === 'Delivered' ? 'success' : o.status === 'Cancelled' ? 'danger' : 'warning'}>
                            {o.status}
                          </Badge>
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--primary-dark)' }}>
                          {formatCurrency(o.total_amount)}
                        </td>
                        <td style={{ fontSize: '12px', color: 'var(--gray-400)' }}>
                          {formatDate(o.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className={styles.emptyHistory}>No orders recorded for this customer.</div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
