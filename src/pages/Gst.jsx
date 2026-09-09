import React, { useState, useEffect } from 'react'
import styles from '../styles/Gst.module.css'
import Modal from '../components/UI/Modal'
import Button from '../components/UI/Button'
import EmptyState from '../components/UI/EmptyState'
import ConfirmDialog from '../components/UI/ConfirmDialog'
import Table from '../components/UI/Table'
import { supabase } from '../lib/supabase'
import { Percent, Trash2, Edit3, Plus } from 'lucide-react'

export default function Gst() {
  const [rates, setRates] = useState([])
  const [loading, setLoading] = useState(true)

  // Modal states
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [modalLoading, setModalLoading] = useState(false)

  // Form fields
  const [label, setLabel] = useState('')
  const [percentage, setPercentage] = useState('')

  // Delete states
  const [deleteId, setDeleteId] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const fetchRates = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('gst_rates')
        .select('*')
        .order('percentage', { ascending: true })

      if (error) throw error
      setRates(data || [])
    } catch (err) {
      console.warn('Error fetching GST rates:', err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRates()
  }, [])

  const handleOpenAdd = () => {
    setEditingId(null)
    setLabel('')
    setPercentage('')
    setModalOpen(true)
  }

  const handleOpenEdit = (rate) => {
    setEditingId(rate.id)
    setLabel(rate.label)
    setPercentage(rate.percentage.toString())
    setModalOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!label || !percentage) {
      alert('Please fill in all required fields.')
      return
    }

    setModalLoading(true)
    try {
      const payload = {
        label,
        percentage: parseFloat(percentage) || 0
      }

      let error
      if (editingId) {
        ({ error } = await supabase
          .from('gst_rates')
          .update(payload)
          .eq('id', editingId))
      } else {
        ({ error } = await supabase
          .from('gst_rates')
          .insert([payload]))
      }

      if (error) throw error

      setModalOpen(false)
      fetchRates()
    } catch (err) {
      alert('Failed to save GST rate: ' + err.message)
    } finally {
      setModalLoading(false)
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
        .from('gst_rates')
        .delete()
        .eq('id', deleteId)

      if (error) throw error

      setDeleteId(null)
      fetchRates()
    } catch (err) {
      alert('Delete failed: ' + err.message)
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className={styles.gst}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>
            📉 GST Settings
            <span className={styles.badge}>{rates.length}</span>
          </h1>
          <p className={styles.subtitle}>Configure GST rate values applied to crackers catalog</p>
        </div>
        <Button variant="primary" onClick={handleOpenAdd} icon={<Plus size={16} />}>
          Add GST Rate
        </Button>
      </div>

      {/* GST Rates List Table */}
      {loading ? (
        <div style={{ background: 'white', padding: '30px', borderRadius: '12px', border: '1.5px solid var(--gray-100)' }}>
          <div className="skeleton" style={{ height: '36px', marginBottom: '12px' }} />
          <div className="skeleton" style={{ height: '24px', marginBottom: '8px' }} />
          <div className="skeleton" style={{ height: '24px', marginBottom: '8px' }} />
          <div className="skeleton" style={{ height: '24px' }} />
        </div>
      ) : rates.length > 0 ? (
        <div className={styles.tableWrapper}>
          <Table headers={['GST Label', 'Percentage (%)', 'Actions']}>
            {rates.map(rate => (
              <tr key={rate.id}>
                <td>
                  <span className={styles.rateLabel}>{rate.label}</span>
                </td>
                <td>
                  <span className={styles.ratePercent}>
                    <Percent size={14} style={{ marginRight: '4px', verticalAlign: 'middle', color: 'var(--primary)' }} />
                    {rate.percentage}%
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<Edit3 size={15} />}
                      onClick={() => handleOpenEdit(rate)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      icon={<Trash2 size={15} />}
                      onClick={() => handleDeleteTrigger(rate.id)}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        </div>
      ) : (
        <EmptyState
          icon="📉"
          title="No GST rates configured"
          text="Configure standard Indian tax slabs (e.g. 5%, 12%, 18%, 28%) for invoice pricing calculations."
        />
      )}

      {/* Add / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? '✏️ Edit GST Rate' : '➕ Add GST Rate'}
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={modalLoading}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={modalLoading}>
              Save Rate
            </Button>
          </>
        }
      >
        <form onSubmit={handleSave} className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Rate Description / Label *</label>
            <input
              type="text"
              className={styles.input}
              placeholder="e.g. CGST (9%) + SGST (9%) or Standard Tax"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              required
              disabled={modalLoading}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>GST Percentage (%) *</label>
            <div style={{ position: 'relative' }}>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                className={styles.input}
                placeholder="18.00"
                value={percentage}
                onChange={(e) => setPercentage(e.target.value)}
                required
                disabled={modalLoading}
                style={{ paddingRight: '36px' }}
              />
              <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: '700', color: 'var(--gray-400)', fontSize: '14px' }}>
                %
              </span>
            </div>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleConfirmDelete}
        loading={deleteLoading}
        title="Delete GST Rate?"
        message="This GST rate option will be permanently removed. Order records historical calculations will remain unaffected."
      />
    </div>
  )
}
