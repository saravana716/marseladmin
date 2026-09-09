import React, { useState, useEffect } from 'react'
import styles from '../styles/Products.module.css'
import Modal from '../components/UI/Modal'
import Button from '../components/UI/Button'
import ImageUpload from '../components/UI/ImageUpload'
import EmptyState from '../components/UI/EmptyState'
import ConfirmDialog from '../components/UI/ConfirmDialog'
import Table from '../components/UI/Table'
import Badge from '../components/UI/Badge'
import Spinner from '../components/UI/Spinner'
import { supabase, uploadImage, deleteImage, BUCKETS } from '../lib/supabase'
import { formatCurrency, stockColor, truncate, formatDate } from '../lib/utils'
import { Eye, Edit3, Trash2 } from 'lucide-react'

export default function Products() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [filtered, setFiltered] = useState([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [selectedCat, setSelectedCat] = useState('')
  const [viewMode, setViewMode] = useState('grid') // 'grid' or 'table'

  // Add/Edit modal states
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [modalLoading, setModalLoading] = useState(false)

  // View modal states
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)

  // Form Fields
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [price, setPrice] = useState('')
  const [originalPrice, setOriginalPrice] = useState('')
  const [stock, setStock] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [existingImageUrl, setExistingImageUrl] = useState('')
  const [typeSelect, setTypeSelect] = useState('')
  const [typeCustom, setTypeCustom] = useState('')
  const [quantity, setQuantity] = useState('')

  // Delete Confirm Dialog state
  const [deleteId, setDeleteId] = useState(null)
  const [deleteImageUrl, setDeleteImageUrl] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)

  const handleOpenView = (p) => {
    setSelectedProduct(p)
    setViewModalOpen(true)
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      const [prodRes, catRes] = await Promise.all([
        supabase.from('products').select('*, category:category_id(name)').order('created_at', { ascending: false }),
        supabase.from('categories').select('id, name').order('name'),
      ])

      if (prodRes.error) throw prodRes.error
      if (catRes.error) throw catRes.error

      setProducts(prodRes.data || [])
      setFiltered(prodRes.data || [])
      setCategories(catRes.data || [])
    } catch (err) {
      alert('Error fetching catalog data: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Filter products by search and category dropdown
  useEffect(() => {
    let result = products
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        (p.category?.name || '').toLowerCase().includes(q)
      )
    }
    if (selectedCat) {
      result = result.filter(p => p.category_id === selectedCat)
    }
    setFiltered(result)
  }, [search, selectedCat, products])

  const handleOpenAdd = () => {
    setEditingId(null)
    setName('')
    setDesc('')
    setPrice('')
    setOriginalPrice('')
    setStock('0')
    setCategoryId('')
    setImageFile(null)
    setExistingImageUrl('')
    setTypeSelect('')
    setTypeCustom('')
    setQuantity('')
    setModalOpen(true)
  }

  const handleOpenEdit = (p) => {
    setEditingId(p.id)
    setName(p.name)
    setDesc(p.description || '')
    setPrice(p.price.toString())
    setOriginalPrice(p.original_price ? p.original_price.toString() : '')
    setStock(p.stock.toString())
    setCategoryId(p.category_id || '')
    setImageFile(null)
    setExistingImageUrl(p.image_url || '')
    setQuantity(p.quantity || '')
    if (['pcs', 'pkt', 'box', 'bag'].includes(p.type)) {
      setTypeSelect(p.type)
      setTypeCustom('')
    } else if (p.type) {
      setTypeSelect('other')
      setTypeCustom(p.type)
    } else {
      setTypeSelect('')
      setTypeCustom('')
    }
    setModalOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!name || !price) {
      alert('Please fill in required fields.')
      return
    }

    setModalLoading(true)
    try {
      let finalImageUrl = existingImageUrl

      if (imageFile) {
        // Upload new image
        finalImageUrl = await uploadImage(imageFile, BUCKETS.PRODUCTS, 'prod-')

        // Clean up previous image if editing
        if (editingId && existingImageUrl) {
          await deleteImage(existingImageUrl, BUCKETS.PRODUCTS)
        }
      }

      const payload = {
        name,
        description: desc,
        price: parseFloat(price) || 0,
        original_price: originalPrice ? parseFloat(originalPrice) : null,
        stock: parseInt(stock) || 0,
        category_id: categoryId || null,
        image_url: finalImageUrl,
        type: typeSelect === 'other' ? typeCustom : typeSelect || null,
        quantity: quantity || null
      }

      let error
      if (editingId) {
        ({ error } = await supabase.from('products').update(payload).eq('id', editingId))
      } else {
        ({ error } = await supabase.from('products').insert([payload]))
      }

      if (error) throw error

      setModalOpen(false)
      fetchData()
    } catch (err) {
      alert('Error saving product: ' + err.message)
    } finally {
      setModalLoading(false)
    }
  }

  const handleDeleteTrigger = (id, imageUrl) => {
    setDeleteId(id)
    setDeleteImageUrl(imageUrl)
  }

  const handleConfirmDelete = async () => {
    if (!deleteId) return
    setDeleteLoading(true)

    try {
      const { error } = await supabase.from('products').delete().eq('id', deleteId)
      if (error) throw error

      if (deleteImageUrl) {
        await deleteImage(deleteImageUrl, BUCKETS.PRODUCTS)
      }

      setDeleteId(null)
      fetchData()
    } catch (err) {
      alert('Failed to delete product: ' + err.message)
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className={styles.products}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>
            🎇 Products
            <span className={styles.badge}>{filtered.length}</span>
          </h1>
          <p className={styles.pageSubtitle}>Manage your products inventory catalog</p>
        </div>
        <div className={styles.actions}>
          <div className={styles.viewToggle}>
            <button
              className={`${styles.toggleBtn} ${viewMode === 'grid' ? styles.active : ''}`}
              onClick={() => setViewMode('grid')}
            >
              ⊞ Grid
            </button>
            <button
              className={`${styles.toggleBtn} ${viewMode === 'table' ? styles.active : ''}`}
              onClick={() => setViewMode('table')}
            >
              ☰ Table
            </button>
          </div>
          <Button onClick={handleOpenAdd}>➕ Add Product</Button>
        </div>
      </div>

      {/* Filter Options */}
      <div className={styles.filterBar}>
        <div className={styles.searchBox}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className={styles.select}
          value={selectedCat}
          onChange={(e) => setSelectedCat(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Products Content Rendering */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px' }}>
          <Spinner size="lg" />
        </div>
      ) : filtered.length > 0 ? (
        viewMode === 'grid' ? (
          <div className={styles.grid}>
            {filtered.map(p => (
              <div key={p.id} className={styles.card}>
                <div className={styles.cardImg}>
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} />
                  ) : (
                    <span>🎇</span>
                  )}
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.cardHeaderRow}>
                    <div className={styles.cardCategory}>
                      {p.category?.name || 'Uncategorized'}
                    </div>
                    {(p.type || p.quantity) && (
                      <div className={styles.cardTypeQty}>
                        {p.quantity || ''}
                        {p.quantity && p.type ? ' • ' : ''}
                        {p.type || ''}
                      </div>
                    )}
                  </div>
                  <h3 className={styles.cardName}>{p.name}</h3>
                  <div className={styles.cardPriceContainer}>
                    <span className={styles.cardPrice}>{formatCurrency(p.price)}</span>
                    {p.original_price && (
                      <span className={styles.cardOriginalPrice}>{formatCurrency(p.original_price)}</span>
                    )}
                  </div>
                  <div className={styles.cardStock} style={{ color: stockColor(p.stock) }}>
                    📦 {p.stock} in stock
                  </div>
                </div>
                <div className={styles.cardFooter}>
                  <Button variant="outline" size="sm" icon={<Eye size={15} />} onClick={() => handleOpenView(p)}>
                    View
                  </Button>
                  <Button variant="outline" size="sm" icon={<Edit3 size={15} />} onClick={() => handleOpenEdit(p)}>
                    Edit
                  </Button>
                  <Button variant="danger" size="sm" icon={<Trash2 size={15} />} onClick={() => handleDeleteTrigger(p.id, p.image_url)} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Table headers={['Product', 'Category', 'Price', 'Stock', 'Added', 'Actions']}>
            {filtered.map(p => (
              <tr key={p.id}>
                <td>
                  <div className={styles.tableProduct}>
                    <div className={styles.tableImg}>
                      {p.image_url ? <img src={p.image_url} alt={p.name} /> : '🎆'}
                    </div>
                    <div>
                      <div className={styles.tableName}>{p.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', flexWrap: 'wrap' }}>
                        {(p.type || p.quantity) && (
                          <span className={styles.tableTypeQty}>
                            {p.quantity || ''}
                            {p.quantity && p.type ? ' • ' : ''}
                            {p.type || ''}
                          </span>
                        )}
                        <span className={styles.tableDesc}>{truncate(p.description, 40)}</span>
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  <Badge variant="primary">{p.category?.name || 'Uncategorized'}</Badge>
                </td>
                <td>
                  <div style={{ fontWeight: 700, color: 'var(--primary-dark)' }}>{formatCurrency(p.price)}</div>
                  {p.original_price && (
                    <div style={{ fontSize: '11px', color: 'var(--gray-400)', textDecoration: 'line-through', marginTop: '2px' }}>{formatCurrency(p.original_price)}</div>
                  )}
                </td>
                <td>
                  <span style={{ fontWeight: 700, color: stockColor(p.stock) }}>
                    {p.stock}
                  </span>
                </td>
                <td style={{ fontSize: '13px', color: 'var(--gray-400)' }}>
                  {formatDate(p.created_at)}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <Button variant="outline" size="sm" icon={<Eye size={15} />} onClick={() => handleOpenView(p)}>
                      View
                    </Button>
                    <Button variant="outline" size="sm" icon={<Edit3 size={15} />} onClick={() => handleOpenEdit(p)}>
                      Edit
                    </Button>
                    <Button variant="danger" size="sm" icon={<Trash2 size={15} />} onClick={() => handleDeleteTrigger(p.id, p.image_url)} />
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )
      ) : (
        <EmptyState
          icon="🎇"
          title="No products found"
          text="Double check your query parameters or hit 'Add Product' above."
        />
      )}

      {/* Edit/Add Product Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? '✏️ Edit Product' : '➕ Add Product'}
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={modalLoading}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={modalLoading}>
              Save Product
            </Button>
          </>
        }
      >
        <form onSubmit={handleSave} className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Product Name *</label>
            <input
              type="text"
              className={styles.input}
              placeholder="e.g. 10cm Ground Fountain Sparkler"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className={styles.formRow}>
            <div className={styles.formGroup} style={{ flex: 1 }}>
              <label className={styles.label}>Category</label>
              <select
                className={styles.select}
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">Select Category</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup} style={{ flex: 1 }}>
              <label className={styles.label}>Stock</label>
              <input
                type="number"
                className={styles.input}
                value={stock}
                onChange={(e) => setStock(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup} style={{ flex: 1 }}>
              <label className={styles.label}>Offer Price *</label>
              <input
                type="number"
                step="0.01"
                className={styles.input}
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>
            <div className={styles.formGroup} style={{ flex: 1 }}>
              <label className={styles.label}>Original Price (MRP)</label>
              <input
                type="number"
                step="0.01"
                className={styles.input}
                placeholder="0.00"
                value={originalPrice}
                onChange={(e) => setOriginalPrice(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup} style={{ flex: 1 }}>
              <label className={styles.label}>Type</label>
              <select
                className={styles.select}
                value={typeSelect}
                onChange={(e) => setTypeSelect(e.target.value)}
              >
                <option value="">Select Type</option>
                <option value="pcs">pcs</option>
                <option value="pkt">pkt</option>
                <option value="box">box</option>
                <option value="bag">bag</option>
                <option value="other">Other...</option>
              </select>
            </div>
            <div className={styles.formGroup} style={{ flex: 1 }}>
              <label className={styles.label}>Quantity</label>
              <input
                type="text"
                className={styles.input}
                placeholder="e.g. 10 pcs, 50 shots"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
          </div>

          {typeSelect === 'other' && (
            <div className={styles.formGroup}>
              <label className={styles.label}>Custom Type *</label>
              <input
                type="text"
                className={styles.input}
                placeholder="e.g. pcs, bundle"
                value={typeCustom}
                onChange={(e) => setTypeCustom(e.target.value)}
                required
              />
            </div>
          )}
          <div className={styles.formGroup}>
            <label className={styles.label}>Description</label>
            <textarea
              className={styles.textarea}
              placeholder="Describe this crackling product..."
              rows="3"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Product Image</label>
            <ImageUpload
              value={imageFile || existingImageUrl}
              onChange={setImageFile}
              placeholder="Select or drop product display picture"
            />
          </div>
        </form>
      </Modal>

      {/* View Product Modal */}
      <Modal
        open={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        title={selectedProduct ? `🎆 Product Details: ${selectedProduct.name}` : ''}
        size="md"
        footer={
          <Button variant="outline" onClick={() => setViewModalOpen(false)}>
            Close
          </Button>
        }
      >
        {selectedProduct && (
          <div className={styles.viewProductContent}>
            <div className={styles.viewProductGrid}>
              <div className={styles.viewProductImg}>
                {selectedProduct.image_url ? (
                  <img src={selectedProduct.image_url} alt={selectedProduct.name} />
                ) : (
                  <span>🎇</span>
                )}
              </div>
              <div className={styles.viewProductInfo}>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '12px' }}>
                  <div>
                    <span className={styles.viewLabel}>Category</span>
                    <div style={{ marginTop: '2px' }}>
                      <Badge variant="primary">{selectedProduct.category?.name || 'Uncategorized'}</Badge>
                    </div>
                  </div>
                  {(selectedProduct.type || selectedProduct.quantity) && (
                    <div>
                      <span className={styles.viewLabel}>Packaging</span>
                      <div style={{ fontWeight: '700', color: 'var(--gray-800)', fontSize: '14px', marginTop: '2px' }}>
                        {selectedProduct.quantity || ''}
                        {selectedProduct.quantity && selectedProduct.type ? ' • ' : ''}
                        {selectedProduct.type || ''}
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <span className={styles.viewLabel}>Price</span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '2px' }}>
                    <span className={styles.viewPrice}>{formatCurrency(selectedProduct.price)}</span>
                    {selectedProduct.original_price && (
                      <span className={styles.viewOriginalPrice}>{formatCurrency(selectedProduct.original_price)}</span>
                    )}
                  </div>
                </div>
                <div>
                  <span className={styles.viewLabel}>Stock Status</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                    <span style={{
                      display: 'inline-block',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: stockColor(selectedProduct.stock)
                    }} />
                    <span style={{ fontWeight: '700', color: stockColor(selectedProduct.stock), fontSize: '14px' }}>
                      {selectedProduct.stock} items in stock
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <hr className={styles.viewDivider} />

            <div>
              <span className={styles.viewLabel}>Product Description</span>
              <p className={styles.viewDescription}>
                {selectedProduct.description || 'No description provided for this product.'}
              </p>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleConfirmDelete}
        loading={deleteLoading}
        title="Delete Product?"
        message="This product item will be removed permanently from database records."
      />
    </div>
  )
}
