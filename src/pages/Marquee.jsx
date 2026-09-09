import React, { useState, useEffect } from 'react'
import styles from '../styles/Marquee.module.css'
import Modal from '../components/UI/Modal'
import Button from '../components/UI/Button'
import EmptyState from '../components/UI/EmptyState'
import ConfirmDialog from '../components/UI/ConfirmDialog'
import Table from '../components/UI/Table'
import { supabase } from '../lib/supabase'
import { Megaphone, Trash2, Edit3, Plus, Volume2 } from 'lucide-react'

export default function Marquee() {
  const [marquees, setMarquees] = useState([])
  const [loading, setLoading] = useState(true)

  // Modal states
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [modalLoading, setModalLoading] = useState(false)

  // Form fields
  const [text, setText] = useState('')
  const [active, setActive] = useState(true)

  // Delete states
  const [deleteId, setDeleteId] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const fetchMarquees = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('marquee')
        .select('*')
        .order('updated_at', { ascending: false })

      if (error) throw error
      setMarquees(data || [])
    } catch (err) {
      console.warn('Error fetching marquee:', err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMarquees()
  }, [])

  const handleOpenAdd = () => {
    setEditingId(null)
    setText('')
    setActive(true)
    setModalOpen(true)
  }

  const handleOpenEdit = (marq) => {
    setEditingId(marq.id)
    setText(marq.text)
    setActive(marq.active)
    setModalOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!text.trim()) {
      alert('Please fill in all required fields.')
      return
    }

    setModalLoading(true)
    try {
      const payload = {
        text: text.trim(),
        active,
        updated_at: new Date().toISOString()
      }

      // If set to active, deactivate all other marquees (since usually only one banner scrolls at a time)
      if (active) {
        await supabase
          .from('marquee')
          .update({ active: false })
          .neq('id', editingId || '00000000-0000-0000-0000-000000000000')
      }

      let error
      if (editingId) {
        ({ error } = await supabase
          .from('marquee')
          .update(payload)
          .eq('id', editingId))
      } else {
        ({ error } = await supabase
          .from('marquee')
          .insert([payload]))
      }

      if (error) throw error

      setModalOpen(false)
      fetchMarquees()
    } catch (err) {
      alert('Failed to save marquee text: ' + err.message)
    } finally {
      setModalLoading(false)
    }
  }

  const handleToggleActive = async (marq) => {
    try {
      const newActiveState = !marq.active

      // If activating this one, deactivate all other marquees first
      if (newActiveState) {
        await supabase
          .from('marquee')
          .update({ active: false })
          .neq('id', marq.id)
      }

      const { error } = await supabase
        .from('marquee')
        .update({ active: newActiveState, updated_at: new Date().toISOString() })
        .eq('id', marq.id)

      if (error) throw error
      fetchMarquees()
    } catch (err) {
      alert('Failed to update status: ' + err.message)
    }
  }

  const handleDeleteTrigger = (id) => {
    setDeleteId(id)
  }

  const handleConfirmDelete = async () => {
    if (!deleteId) return
    setDeleteLoading(true)
    try {
      const { error } = await supabase
        .from('marquee')
        .delete()
        .eq('id', deleteId)

      if (error) throw error

      setDeleteId(null)
      fetchMarquees()
    } catch (err) {
      alert('Delete failed: ' + err.message)
    } finally {
      setDeleteLoading(false)
    }
  }

  // Find active marquee to show in live preview banner
  const activeMarquee = marquees.find(m => m.active)

  return (
    <div className={styles.marqueeContainer}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>
            📢 Marquee Banner
            <span className={styles.badge}>{marquees.length}</span>
          </h1>
          <p className={styles.subtitle}>Configure running text announcements displayed on client store</p>
        </div>
        <Button variant="primary" onClick={handleOpenAdd} icon={<Plus size={16} />}>
          Add Announcement
        </Button>
      </div>

      {/* Live Preview Banner */}
      <div>
        <div style={{ marginBottom: '8px', fontSize: '12px', fontWeight: '700', color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Live Banner Preview:
        </div>
        {activeMarquee ? (
          <div className={styles.previewBanner}>
            <div className={styles.previewLabel}>Active</div>
            <div className={styles.previewTextWrapper}>
              <div className={styles.previewText}>{activeMarquee.text}</div>
            </div>
            <Volume2 size={16} style={{ flexShrink: 0 }} />
          </div>
        ) : (
          <div className={`${styles.previewBanner} ${styles.previewInactive}`}>
            No active marquee banner. The banner will be hidden on the store client website.
          </div>
        )}
      </div>

      {/* Marquee Rate list */}
      {loading ? (
        <div style={{ background: 'white', padding: '30px', borderRadius: '12px', border: '1.5px solid var(--gray-100)' }}>
          <div className="skeleton" style={{ height: '36px', marginBottom: '12px' }} />
          <div className="skeleton" style={{ height: '24px', marginBottom: '8px' }} />
          <div className="skeleton" style={{ height: '24px', marginBottom: '8px' }} />
          <div className="skeleton" style={{ height: '24px' }} />
        </div>
      ) : marquees.length > 0 ? (
        <div className={styles.tableWrapper}>
          <Table headers={['Announcement Text', 'Status', 'Last Updated', 'Actions']}>
            {marquees.map(marq => (
              <tr key={marq.id}>
                <td>
                  <span className={styles.marqueeTextCell}>{marq.text}</span>
                </td>
                <td>
                  <span 
                    className={`${styles.statusBadge} ${marq.active ? styles.statusActive : styles.statusInactive}`}
                    onClick={() => handleToggleActive(marq)}
                    style={{ cursor: 'pointer' }}
                    title="Click to toggle status"
                  >
                    <span style={{ fontSize: '8px', marginRight: '4px' }}>●</span>
                    {marq.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <span className={styles.timestamp}>
                    {new Date(marq.updated_at).toLocaleString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<Edit3 size={15} />}
                      onClick={() => handleOpenEdit(marq)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      icon={<Trash2 size={15} />}
                      onClick={() => handleDeleteTrigger(marq.id)}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        </div>
      ) : (
        <EmptyState
          icon="📢"
          title="No marquee announcements"
          text="Add a marquee text announcement to notify visitors about special sales, cracker arrivals, or festival discount alerts."
        />
      )}

      {/* Add / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => !modalLoading && setModalOpen(false)}
        title={editingId ? '✏️ Edit Announcement' : '📢 Add Announcement'}
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={modalLoading}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={modalLoading}>
              Save Announcement
            </Button>
          </>
        }
      >
        <form onSubmit={handleSave} className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Announcement Text *</label>
            <textarea
              className={styles.textarea}
              placeholder="Type your banner alert message here (e.g. Diwalii special discount! Get up to 50% off on all family cracker packages! Order online now.)"
              value={text}
              onChange={(e) => setText(e.target.value)}
              required
              disabled={modalLoading}
              maxLength={400}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.checkboxContainer}>
              <input
                type="checkbox"
                className={styles.checkbox}
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                disabled={modalLoading}
              />
              <span className={styles.checkboxLabel}>Set as active banner</span>
            </label>
            <p style={{ fontSize: '11px', color: 'var(--gray-400)', marginTop: '-4px', marginLeft: '28px' }}>
              Setting this marquee text to active will automatically deactivate all other announcements.
            </p>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleConfirmDelete}
        loading={deleteLoading}
        title="Delete Announcement?"
        message="This announcement text will be permanently deleted from the database database records."
      />
    </div>
  )
}
