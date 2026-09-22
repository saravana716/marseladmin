import React, { useState, useEffect, useRef } from 'react'
import styles from '../styles/Orders.module.css'
import Modal from '../components/UI/Modal'
import Button from '../components/UI/Button'
import EmptyState from '../components/UI/EmptyState'
import Table from '../components/UI/Table'
import Badge from '../components/UI/Badge'
import Spinner from '../components/UI/Spinner'
import { supabase } from '../lib/supabase'
import { formatCurrency, formatDate, formatDateTime, ORDER_STATUSES, getInitials, truncate } from '../lib/utils'
import { Plus, Trash2, Printer, Eye, Download, ShoppingBag, User, Package, FileText, CheckCircle } from 'lucide-react'

function ProductSearchSelect({ products, value, onChange }) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  const selectedProd = products.find(p => p.id === value)

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredProducts = products.filter(p => {
    if (!query) return true
    const q = query.toLowerCase()
    return (
      (p.name || '').toLowerCase().includes(q) ||
      (p.serial_no || '').toLowerCase().includes(q)
    )
  })

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <input
        type="text"
        className={styles.input}
        placeholder="Type to search by name or serial no..."
        value={isOpen ? query : (selectedProd ? `${selectedProd.serial_no ? `[#${selectedProd.serial_no}] ` : ''}${selectedProd.name}` : '')}
        onFocus={() => {
          setQuery('')
          setIsOpen(true)
        }}
        onChange={(e) => {
          setQuery(e.target.value)
          if (!isOpen) setIsOpen(true)
        }}
      />
      {isOpen && (
        <div className={styles.productDropdownList}>
          {filteredProducts.length > 0 ? (
            filteredProducts.map(p => (
              <div
                key={p.id}
                className={styles.productDropdownItem}
                onMouseDown={() => {
                  onChange(p.id)
                  setIsOpen(false)
                  setQuery('')
                }}
              >
                {p.serial_no && <span className={styles.productSerialBadge}>#{p.serial_no}</span>}
                <span className={styles.productDropdownName}>{p.name}</span>
                <span className={styles.productDropdownPrice}>{formatCurrency(p.price)}</span>
                <span className={styles.productDropdownStock} style={{ color: p.stock > 0 ? 'var(--success, #059669)' : 'var(--danger, #dc2626)' }}>
                  ({p.stock} left)
                </span>
              </div>
            ))
          ) : (
            <div className={styles.noProductMatch}>No product matches "{query}"</div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Orders() {
  const [orders, setOrders] = useState([])
  const [filtered, setFiltered] = useState([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // View detail modal state
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [modalLoading, setModalLoading] = useState(false)

  // Receipt preview modal state
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState(null)

  // ─── ADD ORDER MODAL STATES ───
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [addLoading, setAddLoading] = useState(false)
  const [productsCatalog, setProductsCatalog] = useState([])
  const [customersList, setCustomersList] = useState([])

  const [customerMode, setCustomerMode] = useState('existing') // 'existing' or 'new'
  const [selectedCustId, setSelectedCustId] = useState('')
  const [custName, setCustName] = useState('')
  const [custEmail, setCustEmail] = useState('')
  const [custPhone, setCustPhone] = useState('')
  const [custAddress, setCustAddress] = useState('')
  const [orderStatus, setOrderStatus] = useState('Processing')
  const [orderNotes, setOrderNotes] = useState('')
  const [orderItems, setOrderItems] = useState([
    { productId: '', productName: '', unitPrice: 0, quantity: 1, stock: 0 }
  ])

  // ─── PRINTABLE INVOICE MODAL STATE ───
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false)
  const [invoiceOrder, setInvoiceOrder] = useState(null)
  const [invoiceLoading, setInvoiceLoading] = useState(false)

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

  // ─── OPEN ADD ORDER MODAL ───
  const handleOpenAddOrder = async () => {
    try {
      setAddLoading(true)
      const [prodRes, custRes] = await Promise.all([
        supabase.from('products').select('id, serial_no, name, price, stock, image_url, type, quantity').order('name'),
        supabase.from('customers').select('id, name, email, phone, address').order('name')
      ])

      if (prodRes.error) throw prodRes.error
      if (custRes.error) throw custRes.error

      setProductsCatalog(prodRes.data || [])
      setCustomersList(custRes.data || [])

      setCustomerMode('existing')
      setSelectedCustId(custRes.data && custRes.data.length > 0 ? custRes.data[0].id : '')
      if (custRes.data && custRes.data.length > 0) {
        setCustName(custRes.data[0].name || '')
        setCustEmail(custRes.data[0].email || '')
        setCustPhone(custRes.data[0].phone || '')
        setCustAddress(custRes.data[0].address || '')
      } else {
        setCustName('')
        setCustEmail('')
        setCustPhone('')
        setCustAddress('')
      }
      setOrderStatus('Processing')
      setOrderNotes('')
      setOrderItems([
        { productId: '', productName: '', unitPrice: 0, quantity: 1, stock: 0 }
      ])
      setAddModalOpen(true)
    } catch (err) {
      alert('Error preparing Add Order form: ' + err.message)
    } finally {
      setAddLoading(false)
    }
  }

  // Dynamic Add Order Form Functions
  const handleAddItemRow = () => {
    setOrderItems(prev => [
      ...prev,
      { productId: '', productName: '', unitPrice: 0, quantity: 1, stock: 0 }
    ])
  }

  const handleRemoveItemRow = (index) => {
    if (orderItems.length <= 1) return
    setOrderItems(prev => prev.filter((_, i) => i !== index))
  }

  const handleItemProductChange = (index, prodId) => {
    const prod = productsCatalog.find(p => p.id === prodId)
    setOrderItems(prev => {
      const newItems = prev.map((item, i) => {
        if (i === index) {
          return {
            ...item,
            productId: prodId,
            productName: prod ? prod.name : '',
            unitPrice: prod ? prod.price : 0,
            stock: prod ? prod.stock : 0,
            quantity: 1
          }
        }
        return item
      })
      
      // Auto-add new row if selecting a product on the last row
      if (index === newItems.length - 1 && prodId) {
        newItems.push({ productId: '', productName: '', unitPrice: 0, quantity: 1, stock: 0 })
      }
      
      return newItems
    })
  }

  const handleItemQtyChange = (index, qty) => {
    const parsedQty = Math.max(1, parseInt(qty) || 1)
    setOrderItems(prev => prev.map((item, i) => i === index ? { ...item, quantity: parsedQty } : item))
  }

  const handleItemPriceChange = (index, price) => {
    const parsedPrice = Math.max(0, parseFloat(price) || 0)
    setOrderItems(prev => prev.map((item, i) => i === index ? { ...item, unitPrice: parsedPrice } : item))
  }

  const handleCustomerSelectChange = (cId) => {
    setSelectedCustId(cId)
    const cust = customersList.find(c => c.id === cId)
    if (cust) {
      setCustName(cust.name || '')
      setCustEmail(cust.email || '')
      setCustPhone(cust.phone || '')
      setCustAddress(cust.address || '')
    }
  }

  // Calculate Grand Total for Add Order form
  const grandTotal = orderItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)

  // ─── SAVE ADMIN ORDER (WITH STOCK REDUCTION) ───
  const handleSaveOrder = async (e) => {
    e.preventDefault()

    let finalCustId = selectedCustId
    let finalCustName = custName
    let finalCustEmail = custEmail
    let finalCustPhone = custPhone
    let finalCustAddress = custAddress

    if (customerMode === 'existing') {
      const cust = customersList.find(c => c.id === selectedCustId)
      if (!cust && !custName) {
        alert('Please select a valid customer or switch to "Create New Customer".')
        return
      }
      if (cust) {
        finalCustName = cust.name
        finalCustEmail = cust.email
        finalCustPhone = cust.phone
        finalCustAddress = cust.address
      }
    } else {
      if (!custName.trim()) {
        alert('Customer Name is required.')
        return
      }
    }

    const validItems = orderItems.filter(item => item.productName.trim() && item.quantity > 0)
    if (validItems.length === 0) {
      alert('Please add at least 1 product item with valid quantity.')
      return
    }

    setAddLoading(true)
    try {
      // 1. If New Customer, insert into customers table
      if (customerMode === 'new') {
        const { data: newCust, error: custErr } = await supabase
          .from('customers')
          .insert([{
            name: custName.trim(),
            email: custEmail.trim() || `${Date.now()}@marselcustomer.com`,
            phone: custPhone.trim() || null,
            address: custAddress.trim() || null
          }])
          .select()
          .single()

        if (custErr) throw custErr
        finalCustId = newCust.id
      }

      // 2. Insert Order Record
      const totalAmount = validItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)

      const { data: newOrder, error: orderErr } = await supabase
        .from('orders')
        .insert([{
          customer_id: finalCustId || null,
          status: orderStatus,
          total_amount: totalAmount,
          notes: orderNotes.trim() || 'Admin Manual Order'
        }])
        .select('*, customer:customer_id(name, email, phone, address)')
        .single()

      if (orderErr) throw orderErr

      // 3. Insert Order Items Records
      const itemsPayload = validItems.map(item => ({
        order_id: newOrder.id,
        product_id: item.productId || null,
        product_name: item.productName,
        quantity: item.quantity,
        unit_price: item.unitPrice
      }))

      const { error: itemsErr } = await supabase
        .from('order_items')
        .insert(itemsPayload)

      if (itemsErr) throw itemsErr

      // 4. ─── REDUCE PRODUCT STOCK ───
      for (const item of validItems) {
        if (item.productId) {
          const { data: prodData } = await supabase
            .from('products')
            .select('stock')
            .eq('id', item.productId)
            .single()

          if (prodData) {
            const currentStock = prodData.stock || 0
            const updatedStock = Math.max(0, currentStock - item.quantity)
            await supabase
              .from('products')
              .update({ stock: updatedStock })
              .eq('id', item.productId)
          }
        }
      }

      setAddModalOpen(false)
      fetchOrders()

      // Automatically open 100% Invoice layout for this new order
      handleOpenInvoice({
        ...newOrder,
        customer: {
          name: finalCustName,
          email: finalCustEmail,
          phone: finalCustPhone,
          address: finalCustAddress
        },
        items: itemsPayload
      })

    } catch (err) {
      alert('Error creating order: ' + err.message)
    } finally {
      setAddLoading(false)
    }
  }

  // ─── OPEN INVOICE MODAL ───
  const handleOpenInvoice = async (order) => {
    setDetailModalOpen(false)
    setInvoiceOrder(order)
    setInvoiceModalOpen(true)
    setInvoiceLoading(true)

    try {
      if (!order.items || order.items.length === 0) {
        const { data: items, error } = await supabase
          .from('order_items')
          .select('*, product:product_id(name, image_url)')
          .eq('order_id', order.id)

        if (error) throw error
        setInvoiceOrder(prev => ({ ...prev, items: items || [] }))
      }
    } catch (err) {
      console.error('Error fetching invoice items:', err.message)
    } finally {
      setInvoiceLoading(false)
    }
  }

  // Print Invoice
  const handlePrintInvoice = () => {
    window.print()
  }

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
      <div className="no-print">
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>
              📦 Orders
              <span className={styles.badge}>{filtered.length}</span>
            </h1>
            <p className={styles.pageSubtitle}>Manage sales orders, create new admin orders, and generate invoices</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Button variant="primary" onClick={handleOpenAddOrder} icon={<Plus size={16} />}>
               Add Order
            </Button>
            <Button variant="outline" onClick={fetchOrders}>🔄 Refresh</Button>
          </div>
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
                    <Button variant="primary" size="sm" onClick={() => handleOpenInvoice(order)}>
                      📄 Invoice
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
            text="Use '➕ Add Order' above to create a new admin order or adjust search filter."
          />
        )}
      </div>

      {/* ─── ADD ORDER MODAL ─── */}
      <Modal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="➕ Create New Order (Admin)"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setAddModalOpen(false)} disabled={addLoading}>
              Cancel
            </Button>
            <Button onClick={handleSaveOrder} loading={addLoading}>
              💾 Save Order
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveOrder} className={styles.addOrderForm}>
          {/* Customer Selection mode */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Customer Type</label>
            <div className={styles.modeToggle}>
              <button
                type="button"
                className={`${styles.modeBtn} ${customerMode === 'existing' ? styles.activeMode : ''}`}
                onClick={() => setCustomerMode('existing')}
              >
                👤 Select Existing Customer
              </button>
              <button
                type="button"
                className={`${styles.modeBtn} ${customerMode === 'new' ? styles.activeMode : ''}`}
                onClick={() => {
                  setCustomerMode('new')
                  setSelectedCustId('')
                  setCustName('')
                  setCustEmail('')
                  setCustPhone('')
                  setCustAddress('')
                }}
              >
                ➕ Create New Customer
              </button>
            </div>
          </div>

          {customerMode === 'existing' ? (
            <div className={styles.formGroup}>
              <label className={styles.label}>Select Customer *</label>
              <select
                className={styles.formSelect}
                value={selectedCustId}
                onChange={(e) => handleCustomerSelectChange(e.target.value)}
                required
              >
                <option value="">Select Existing Customer</option>
                {customersList.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.email ? `(${c.email})` : ''} {c.phone ? `- ${c.phone}` : ''}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className={styles.formRow}>
              <div className={styles.formGroup} style={{ flex: 1 }}>
                <label className={styles.label}>Customer Name *</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="e.g. Ramesh Kumar"
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  required
                />
              </div>
              <div className={styles.formGroup} style={{ flex: 1 }}>
                <label className={styles.label}>Customer Email</label>
                <input
                  type="email"
                  className={styles.input}
                  placeholder="customer@example.com"
                  value={custEmail}
                  onChange={(e) => setCustEmail(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className={styles.formRow}>
            <div className={styles.formGroup} style={{ flex: 1 }}>
              <label className={styles.label}>Phone Number</label>
              <input
                type="text"
                className={styles.input}
                placeholder="9876543210"
                value={custPhone}
                onChange={(e) => setCustPhone(e.target.value)}
              />
            </div>
            <div className={styles.formGroup} style={{ flex: 1 }}>
              <label className={styles.label}>Order Status</label>
              <select
                className={styles.formSelect}
                value={orderStatus}
                onChange={(e) => setOrderStatus(e.target.value)}
              >
                {ORDER_STATUSES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Shipping / Delivery Address</label>
            <input
              type="text"
              className={styles.input}
              placeholder="Full shipping address..."
              value={custAddress}
              onChange={(e) => setCustAddress(e.target.value)}
            />
          </div>

          {/* Product Items Selection List */}
          <div className={styles.itemsSection}>
            <div className={styles.itemsHeaderContainer}>
              <span className={styles.label} style={{ color: 'var(--primary)', fontSize: '12px' }}>
                📦 Order Line Items & Quantities
              </span>
              <Button type="button" variant="outline" size="sm" onClick={handleAddItemRow} icon={<Plus size={14} />}>
                Add Item
              </Button>
            </div>

            <div className={styles.itemRowHeader}>
              <div>Product Item</div>
              <div>Available Stock</div>
              <div>Unit Price (₹)</div>
              <div>Qty</div>
              <div></div>
            </div>

            {orderItems.map((item, idx) => (
              <div key={idx} className={styles.itemRow}>
                <div>
                  <ProductSearchSelect
                    products={productsCatalog}
                    value={item.productId}
                    onChange={(prodId) => handleItemProductChange(idx, prodId)}
                  />
                </div>
                <div>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: item.stock > 0 ? 'var(--success, #059669)' : 'var(--danger, #dc2626)' }}>
                    {item.productId ? `${item.stock} in stock` : '—'}
                  </span>
                </div>
                <div>
                  <input
                    type="number"
                    step="0.01"
                    className={styles.input}
                    value={item.unitPrice}
                    onChange={(e) => handleItemPriceChange(idx, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        if (idx === orderItems.length - 1) handleAddItemRow()
                      }
                    }}
                  />
                </div>
                <div>
                  <input
                    type="number"
                    min="1"
                    className={styles.input}
                    value={item.quantity}
                    onChange={(e) => handleItemQtyChange(idx, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        if (idx === orderItems.length - 1) handleAddItemRow()
                      }
                    }}
                  />
                </div>
                <div>
                  {orderItems.length > 1 && (
                    <button
                      type="button"
                      className={styles.removeRowBtn}
                      onClick={() => handleRemoveItemRow(idx)}
                      title="Remove item row"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}

            <div className={styles.orderSummaryCard}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--gray-700)' }}>
                Total Order Calculation:
              </span>
              <span className={styles.orderSummaryTotal}>{formatCurrency(grandTotal)}</span>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Admin Notes / Instructions (Optional)</label>
            <textarea
              className={styles.textarea}
              placeholder="Payment method, special packaging, delivery date..."
              rows="2"
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
            />
          </div>
        </form>
      </Modal>

      {/* ─── 100% PRINTABLE INVOICE MODAL ─── */}
      <Modal
        open={invoiceModalOpen}
        onClose={() => setInvoiceModalOpen(false)}
        title={invoiceOrder ? `📄 Official Invoice #${invoiceOrder.id.substring(0, 8).toUpperCase()}` : 'Invoice'}
        size="lg"
        zIndex={2500}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <Button variant="outline" onClick={() => setInvoiceModalOpen(false)}>
              Close
            </Button>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button variant="primary" onClick={handlePrintInvoice} icon={<Printer size={16} />}>
                🖨️ Print / Save Invoice PDF
              </Button>
            </div>
          </div>
        }
      >
        {invoiceOrder && (
          <div className={styles.invoicePrintArea}>
            <div className={styles.invoiceHeader}>
              <div>
                <div className={styles.invoiceLogo}>🎇 MARSEL TRADERS</div>
                <div className={styles.invoiceSub}>Quality Crackers & Fireworks Specialists</div>
                <div className={styles.invoiceSub}>Main Road, Sivakasi, Tamil Nadu</div>
              </div>
              <div>
                <div className={styles.invoiceTitle}>INVOICE</div>
                <div className={styles.invoiceNum}>#{invoiceOrder.id.substring(0, 8).toUpperCase()}</div>
                <div style={{ textAlign: 'right', marginTop: '4px' }}>
                  <Badge variant={getBadgeVariant(invoiceOrder.status)}>{invoiceOrder.status}</Badge>
                </div>
              </div>
            </div>

            <div className={styles.invoiceDetailsGrid}>
              <div>
                <div className={styles.invoiceBillToTitle}>CUSTOMER BILL TO:</div>
                <div className={styles.invoiceCustName}>{invoiceOrder.customer?.name || 'Valued Customer'}</div>
                <div className={styles.invoiceCustMeta}>📧 {invoiceOrder.customer?.email || 'N/A'}</div>
                <div className={styles.invoiceCustMeta}>📞 {invoiceOrder.customer?.phone || 'N/A'}</div>
                <div className={styles.invoiceCustMeta}>📍 {invoiceOrder.customer?.address || 'N/A'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className={styles.invoiceBillToTitle}>INVOICE DETAILS:</div>
                <div className={styles.invoiceCustMeta}><strong>Date:</strong> {formatDateTime(invoiceOrder.created_at)}</div>
                <div className={styles.invoiceCustMeta}><strong>Order Reference:</strong> #{invoiceOrder.id}</div>
                {invoiceOrder.notes && (
                  <div className={styles.invoiceCustMeta} style={{ marginTop: '6px' }}>
                    <strong>Notes:</strong> {invoiceOrder.notes}
                  </div>
                )}
              </div>
            </div>

            {invoiceLoading ? (
              <div style={{ textAlign: 'center', padding: '30px' }}>
                <Spinner />
              </div>
            ) : invoiceOrder.items && invoiceOrder.items.length > 0 ? (
              <table className={styles.invoiceTable}>
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>#</th>
                    <th>Product Description</th>
                    <th style={{ textAlign: 'center' }}>Qty</th>
                    <th style={{ textAlign: 'right' }}>Unit Price</th>
                    <th style={{ textAlign: 'right' }}>Total Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceOrder.items.map((item, i) => (
                    <tr key={item.id || i}>
                      <td>{i + 1}</td>
                      <td style={{ fontWeight: 600 }}>{item.product_name || item.product?.name}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{item.quantity}</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(item.unit_price)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>
                        {formatCurrency(item.quantity * item.unit_price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', fontStyle: 'italic', color: 'var(--gray-400)' }}>
                No line items found for this invoice.
              </div>
            )}

            <div className={styles.invoiceFooterSummary}>
              <div className={styles.invoiceThankYou}>
                Thank you for choosing Marsel Traders! 🎆<br />
                For any support or query, contact info@marseltraders.com
              </div>
              <div className={styles.invoiceGrandTotal}>
                <div className={styles.invoiceGrandTotalLabel}>Grand Total Amount</div>
                <div className={styles.invoiceGrandTotalVal}>
                  {formatCurrency(invoiceOrder.total_amount)}
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Order Detail View Modal */}
      <Modal
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title={selectedOrder ? `📦 Order Details #${selectedOrder.id.substring(0, 8).toUpperCase()}` : ''}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setDetailModalOpen(false)}>
              Close
            </Button>
            {selectedOrder && (
              <Button onClick={() => handleOpenInvoice(selectedOrder)} icon={<Printer size={16} />}>
                📄 View / Print Invoice
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
