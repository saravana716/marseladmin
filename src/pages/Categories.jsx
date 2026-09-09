import React, { useState, useEffect } from 'react'
import styles from '../styles/Categories.module.css'
import Modal from '../components/UI/Modal'
import Button from '../components/UI/Button'
import ImageUpload from '../components/UI/ImageUpload'
import EmptyState from '../components/UI/EmptyState'
import ConfirmDialog from '../components/UI/ConfirmDialog'
import Spinner from '../components/UI/Spinner'
import { supabase, uploadImage, deleteImage, BUCKETS } from '../lib/supabase'
import { Eye, Edit3, Trash2 } from 'lucide-react'

export default function Categories() {
  const [categories, setCategories] = useState([])
  const [filtered, setFiltered] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Add/Edit modal states
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [existingImageUrl, setExistingImageUrl] = useState('')
  const [modalLoading, setModalLoading] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [imageFile, setImageFile] = useState(null)

  // View modal states
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [viewModalLoading, setViewModalLoading] = useState(false)

  // Confirm delete state
  const [deleteId, setDeleteId] = useState(null)
  const [deleteImageUrl, setDeleteImageUrl] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)

  const fetchCategories = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setCategories(data || [])
      setFiltered(data || [])
    } catch (err) {
      alert('Error fetching categories: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  // Filter categories by search query
  useEffect(() => {
    const q = search.toLowerCase()
    const result = categories.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.description || '').toLowerCase().includes(q)
    )
    setFiltered(result)
  }, [search, categories])

  const handleOpenAdd = () => {
    setEditingId(null)
    setExistingImageUrl('')
    setName('')
    setDescription('')
    setImageFile(null)
    setModalOpen(true)
  }

  const handleOpenEdit = (cat) => {
    setEditingId(cat.id)
    setExistingImageUrl(cat.image_url || '')
    setName(cat.name)
    setDescription(cat.description || '')
    setImageFile(null)
    setModalOpen(true)
  }

  const handleOpenView = async (cat) => {
    setSelectedCategory(cat)
    setViewModalOpen(true)
    setViewModalLoading(true)

    try {
      const { data, error } = await supabase
        .from('products')
        .select('*, category:category_id(name)')
        .eq('category_id', cat.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setSelectedCategory(prev => ({ ...prev, products: data || [] }))
    } catch (err) {
      alert('Failed to load products in this category: ' + err.message)
    } finally {
      setViewModalLoading(false)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!name) {
      alert('Please enter a category name.')
      return
    }

    setModalLoading(true)
    try {
      let imageUrl = existingImageUrl
      if (imageFile) {
        imageUrl = await uploadImage(imageFile, BUCKETS.CATEGORIES, 'cat-')
        if (editingId && existingImageUrl) {
          await deleteImage(existingImageUrl, BUCKETS.CATEGORIES)
        }
      }

      const payload = { name, description, image_url: imageUrl }

      let error
      if (editingId) {
        ({ error } = await supabase.from('categories').update(payload).eq('id', editingId))
      } else {
        ({ error } = await supabase.from('categories').insert([payload]))
      }

      if (error) throw error

      setModalOpen(false)
      fetchCategories()
    } catch (err) {
      alert('Failed to save category: ' + err.message)
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
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', deleteId)

      if (error) throw error

      if (deleteImageUrl) {
        await deleteImage(deleteImageUrl, BUCKETS.CATEGORIES)
      }

      setDeleteId(null)
      fetchCategories()
    } catch (err) {
      alert('Failed to delete category: ' + err.message)
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className={styles.categories}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>
            🗂️ Categories
            <span className={styles.badge}>{filtered.length}</span>
          </h1>
          <p className={styles.subtitle}>Organize your products by category</p>
        </div>
        <Button variant="primary" onClick={handleOpenAdd}>
          ➕ Add Category
        </Button>
      </div>

      {/* Filter and search bar */}
      <div className={styles.filterBar}>
        <div className={styles.searchBox}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Categories Content Grid */}
      {loading ? (
        <div className={styles.grid}>
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className={styles.card}>
              <div className="skeleton" style={{ height: '160px' }} />
              <div style={{ padding: '16px' }}>
                <div className="skeleton" style={{ height: '20px', marginBottom: '8px', width: '70%' }} />
                <div className="skeleton" style={{ height: '14px', marginBottom: '4px' }} />
                <div className="skeleton" style={{ height: '14px', width: '50%' }} />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className={styles.grid}>
          {filtered.map(cat => (
            <div key={cat.id} className={styles.card}>
              <div className={styles.cardImg}>
                {cat.image_url ? (
                  <img src={cat.image_url} alt={cat.name} />
                ) : (
                  <span className={styles.fallbackEmoji}>🎆</span>
                )}
              </div>
              <div className={styles.cardBody}>
                <h3 className={styles.cardName}>{cat.name}</h3>
                <p className={styles.cardDesc}>{cat.description || 'No description'}</p>
                <div className={styles.cardActions}>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Eye size={15} />}
                    onClick={() => handleOpenView(cat)}
                  >
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Edit3 size={15} />}
                    onClick={() => handleOpenEdit(cat)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    icon={<Trash2 size={15} />}
                    onClick={() => handleDeleteTrigger(cat.id, cat.image_url)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon="🗂️"
          title="No categories found"
          text="Click 'Add Category' above to create a category layout."
        />
      )}

      {/* Add/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? '✏️ Edit Category' : '➕ Add Category'}
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={modalLoading}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} loading={modalLoading}>
              Save Category
            </Button>
          </>
        }
      >
        <form onSubmit={handleSave} className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Category Name *</label>
            <input
              type="text"
              className={styles.input}
              placeholder="e.g. Ground Chakkar, Fountains"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Description</label>
            <textarea
              className={styles.textarea}
              placeholder="Enter category description..."
              rows="3"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Category Image</label>
            <ImageUpload
              value={imageFile || existingImageUrl}
              onChange={setImageFile}
              placeholder="Drop or select category image"
            />
          </div>
        </form>
      </Modal>

      {/* View Category Modal */}
      <Modal
        open={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        title={selectedCategory ? `🗂️ Category Details: ${selectedCategory.name}` : ''}
        size="lg"
        footer={
          <Button variant="outline" onClick={() => setViewModalOpen(false)}>
            Close
          </Button>
        }
      >
        {selectedCategory && (
          <div className={styles.viewCategoryContent}>
            <div className={styles.viewCategoryGrid}>
              <div className={styles.viewCategoryImg}>
                {selectedCategory.image_url ? (
                  <img src={selectedCategory.image_url} alt={selectedCategory.name} />
                ) : (
                  <span>🎆</span>
                )}
              </div>
              <div className={styles.viewCategoryDetails}>
                <div style={{ marginBottom: '16px' }}>
                  <label className={styles.viewLabel}>Category Name</label>
                  <div className={styles.viewValue}>{selectedCategory.name}</div>
                </div>
                <div>
                  <label className={styles.viewLabel}>Description</label>
                  <div className={styles.viewValue} style={{ fontSize: '14px', lineHeight: '1.5' }}>
                    {selectedCategory.description || 'No description provided.'}
                  </div>
                </div>
              </div>
            </div>

            <hr className={styles.viewDivider} />

            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px', color: 'var(--gray-900)' }}>
              Products in this Category
            </h3>

            {viewModalLoading ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <Spinner />
              </div>
            ) : selectedCategory.products && selectedCategory.products.length > 0 ? (
              <div className={styles.modalTableWrapper}>
                <table className={styles.modalTable}>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Price</th>
                      <th>Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedCategory.products.map(p => (
                      <tr key={p.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '6px', overflow: 'hidden', flexShrink: 0, background: 'var(--primary-bg)', display: 'flex', alignItems: 'center', justify: 'center' }}>
                              {p.image_url ? <img src={p.image_url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🎆'}
                            </div>
                            <span style={{ fontWeight: '600' }}>{p.name}</span>
                          </div>
                        </td>
                        <td style={{ fontWeight: '700', color: 'var(--primary-dark)' }}>
                          {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(p.price)}
                        </td>
                        <td>
                          <span style={{
                            fontWeight: '700',
                            color: p.stock === 0 ? 'var(--danger)' : p.stock < 10 ? 'var(--warning)' : 'var(--success)'
                          }}>
                            {p.stock} in stock
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ color: 'var(--gray-400)', fontStyle: 'italic', textAlign: 'center', padding: '16px' }}>
                No products found in this category.
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleConfirmDelete}
        loading={deleteLoading}
        title="Delete Category?"
        message="This category will be permanently removed. Products associated with it will be uncategorized."
      />
    </div>
  )
}
