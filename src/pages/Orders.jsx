import React, { useState, useEffect } from 'react'
import styles from '../styles/Orders.module.css'
import Modal from '../components/UI/Modal'
import Button from '../components/UI/Button'
import EmptyState from '../components/UI/EmptyState'
import Table from '../components/UI/Table'
import Badge from '../components/UI/Badge'
import Spinner from '../components/UI/Spinner'
import { supabase } from '../lib/supabase'
import { formatCurrency, formatDate, formatDateTime, ORDER_STATUSES, getInitials, truncate } from '../lib/utils'

export default function Orders() {
  const [orders, setOrders] = useState([])
  const [filtered, setFiltered] = useState([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // View modal state
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [modalLoading, setModalLoading] = useState(false)

  // Receipt preview modal state
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState(null)

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('orders')
        .select('*, customer:customer_id(name, email, phone, address)')
        .order('created_at', { ascending: false })

      if (error) throw error
      setOrders(data || [])
      setFiltered(data || [])
    } catch (err) {
      alert('Error fetching orders: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  // Filter orders
  useEffect(() => {
    let result = orders
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(o =>
        o.id.toLowerCase().includes(q) ||
        (o.customer?.name || '').toLowerCase().includes(q) ||
        (o.customer?.email || '').toLowerCase().includes(q)
      )
    }
    if (statusFilter) {
      result = result.filter(o => o.status === statusFilter)
    }
    setFiltered(result)
  }, [search, statusFilter, orders])

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId)

      if (error) throw error

      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prev => ({ ...prev, status: newStatus }))
      }
    } catch (err) {
      alert('Failed to update status: ' + err.message)
    }
  }

  const handleOpenDetail = async (order) => {
    setSelectedOrder(order)
    setDetailModalOpen(true)
    setModalLoading(true)

    try {
      const { data: items, error } = await supabase
        .from('order_items')
        .select('*, product:product_id(name, image_url)')
        .eq('order_id', order.id)

      if (error) throw error
      setSelectedOrder(prev => ({ ...prev, items: items || [] }))
    } catch (err) {
      alert('Error loading order details: ' + err.message)
    } finally {
      setModalLoading(false)
    }
  }

  const handleDownloadInvoice = (order) => {
    if (order.invoice_url) {
      window.open(order.invoice_url, '_blank')
    } else {
      alert('Invoice has not been generated for this order yet.')
    }
  }

  // Get status badge variant name
  const getBadgeVariant = (status) => {
    switch (status) {
      case 'Pending': return 'warning'
      case 'Processing': return 'info'
      case 'Shipped': return 'secondary'
      case 'Delivered': return 'success'
      case 'Cancelled': return 'danger'
      default: return 'gray'
    }
  }

  return (
    <div className={styles.orders}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>
            📦 Orders
            <span className={styles.badge}>{filtered.length}</span>
          </h1>
          <p className={styles.pageSubtitle}>View customer orders, receipts, and order status</p>
        </div>
        <Button variant="outline" onClick={fetchOrders}>🔄 Refresh</Button>
      </div>

      {/* Filter and search bar options */}
      <div className={styles.filterBar}>
        <div className={styles.searchBox}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search by order ID, customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className={styles.select}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          {ORDER_STATUSES.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Orders Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px' }}>
          <Spinner size="lg" />
        </div>
      ) : filtered.length > 0 ? (
        <Table headers={['Order ID', 'Customer', 'Status', 'Amount', 'Customer Receipt', 'Date', 'Update Status', 'Actions']}>
          {filtered.map(order => (
            <tr key={order.id}>
              <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>
                #{order.id.substring(0, 8).toUpperCase()}
              </td>
              <td>
                <div className={styles.customerCell}>
                  <div className={styles.avatar}>{getInitials(order.customer?.name)}</div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{order.customer?.name || 'Guest'}</div>
                    <div style={{ fontSize: '11px', color: 'var(--gray-400)' }}>{order.customer?.email || '—'}</div>
                  </div>
                </div>
              </td>
              <td>
                <Badge variant={getBadgeVariant(order.status)}>{order.status}</Badge>
              </td>
              <td style={{ fontWeight: 700, color: 'var(--primary-dark)' }}>
                {formatCurrency(order.total_amount)}
              </td>
              <td>
                <div className={styles.receiptCell}>
                  {(order.payment_screenshot_url || order.receipt_url) ? (
                    <button
                      className={styles.receiptBadgeBtn}
                      onClick={() => setReceiptPreviewUrl(order.payment_screenshot_url || order.receipt_url)}
                      title="Click to view payment receipt uploaded from website"
                    >
                      📄 View Receipt
                    </button>
                  ) : (
                    <span style={{ color: 'var(--gray-400)', fontSize: '13px' }}>—</span>
                  )}
                </div>
              </td>
              <td style={{ fontSize: '13px', color: 'var(--gray-400)' }}>
                {formatDate(order.created_at)}
              </td>
              <td>
                <select
                  className={styles.statusSelect}
                  value={order.status}
                  onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                >
                  {ORDER_STATUSES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </td>
              <td>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <Button variant="outline" size="sm" onClick={() => handleOpenDetail(order)}>
                    👁️ View
                  </Button>
                  <Button variant="primary" size="sm" onClick={() => handleDownloadInvoice(order)}>
                    ⬇️ Invoice
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      ) : (
        <EmptyState
          icon="📦"
          title="No orders found"
          text="Wait for customers to check out or adjust your search filter."
        />
      )}

      {/* Order Detail Modal */}
      <Modal
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title={selectedOrder ? `📦 Order #${selectedOrder.id.substring(0, 8).toUpperCase()}` : ''}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setDetailModalOpen(false)}>
              Close
            </Button>
            {selectedOrder && (
              <Button onClick={() => handleDownloadInvoice(selectedOrder)}>
                ⬇️ Download Invoice
              </Button>
            )}
          </>
        }
      >
        {selectedOrder && (
          <div className={styles.modalContent}>
            <div className={styles.modalGrid}>
              <div>
                <span className={styles.label}>Order Date</span>
                <div className={styles.value}>{formatDateTime(selectedOrder.created_at)}</div>
              </div>
              <div>
                <span className={styles.label}>Total Amount</span>
                <div className={styles.totalValue}>{formatCurrency(selectedOrder.total_amount)}</div>
              </div>
            </div>

            <hr className={styles.divider} />

            {/* Customer Details Block */}
            <div style={{ marginBottom: '20px' }}>
              <span className={styles.label} style={{ marginBottom: '8px', display: 'block' }}>Customer Information</span>
              <div className={styles.customerDetailCard}>
                <div>
                  <span className={styles.subLabel}>Name</span>
                  <div className={styles.detailVal}>{selectedOrder.customer?.name || 'Guest'}</div>
                </div>
                <div>
                  <span className={styles.subLabel}>Email</span>
                  <div className={styles.detailVal}>{selectedOrder.customer?.email || '—'}</div>
                </div>
                <div>
                  <span className={styles.subLabel}>Phone</span>
                  <div className={styles.detailVal}>{selectedOrder.customer?.phone || '—'}</div>
                </div>
                <div>
                  <span className={styles.subLabel}>Shipping Address</span>
                  <div className={styles.detailVal}>{selectedOrder.customer?.address || '—'}</div>
                </div>
              </div>
            </div>

            {/* Payment Receipt Block (Read-only view) */}
            <div style={{ marginBottom: '20px' }}>
              <span className={styles.label} style={{ marginBottom: '8px', display: 'block' }}>Customer Payment Screenshot</span>
              <div className={styles.receiptCard}>
                {(selectedOrder.payment_screenshot_url || selectedOrder.receipt_url) ? (
                  <div className={styles.receiptPreviewContainer}>
                    <div
                      className={styles.receiptImgWrapper}
                      onClick={() => setReceiptPreviewUrl(selectedOrder.payment_screenshot_url || selectedOrder.receipt_url)}
                      title="Click to view full receipt"
                    >
                      <img src={selectedOrder.payment_screenshot_url || selectedOrder.receipt_url} alt="Customer Payment Receipt" />
                    </div>
                    <div className={styles.receiptActions}>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setReceiptPreviewUrl(selectedOrder.payment_screenshot_url || selectedOrder.receipt_url)}
                      >
                        👁️ View Full Receipt
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontStyle: 'italic', color: 'var(--gray-400)', fontSize: '13.5px' }}>
                    No payment receipt uploaded by customer for this order.
                  </div>
                )}
              </div>
            </div>

            {/* Items Purchased table */}
            <span className={styles.label} style={{ marginBottom: '8px', display: 'block' }}>Items Purchased</span>
            {modalLoading ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <Spinner />
              </div>
            ) : selectedOrder.items && selectedOrder.items.length > 0 ? (
              <div className={styles.modalTableWrapper}>
                <table className={styles.modalTable}>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th style={{ textAlign: 'center' }}>Qty</th>
                      <th>Unit Price</th>
                      <th>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items.map(item => (
                      <tr key={item.id}>
                        <td>
                          <div className={styles.modalProductCell}>
                            <div className={styles.modalProductImg}>
                              {item.product?.image_url ? (
                                <img src={item.product.image_url} alt={item.product_name} />
                              ) : (
                                <span>🎆</span>
                              )}
                            </div>
                            <span>{item.product_name || item.product?.name}</span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 600 }}>{item.quantity}</td>
                        <td>{formatCurrency(item.unit_price)}</td>
                        <td style={{ fontWeight: 700 }}>
                          {formatCurrency(item.quantity * item.unit_price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className={styles.emptyItems}>No items recorded for this order.</div>
            )}
          </div>
        )}
      </Modal>

      {/* Receipt Full Preview Lightbox Modal */}
      <Modal
        open={!!receiptPreviewUrl}
        onClose={() => setReceiptPreviewUrl(null)}
        title="📄 Customer Payment Receipt"
        size="lg"
        footer={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="primary" onClick={() => window.open(receiptPreviewUrl, '_blank')}>
              🔗 Open in New Tab
            </Button>
            <Button variant="outline" onClick={() => setReceiptPreviewUrl(null)}>
              Close
            </Button>
          </div>
        }
      >
        {receiptPreviewUrl && (
          <div style={{ textAlign: 'center' }}>
            <img src={receiptPreviewUrl} alt="Payment Receipt Full View" className={styles.fullReceiptImg} />
          </div>
        )}
      </Modal>
    </div>
  )
}
