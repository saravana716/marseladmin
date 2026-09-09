import React, { useState, useEffect } from 'react'
import styles from '../styles/Settings.module.css'
import Modal from '../components/UI/Modal'
import Button from '../components/UI/Button'
import EmptyState from '../components/UI/EmptyState'
import Table from '../components/UI/Table'
import { supabase } from '../lib/supabase'
import { Settings as SettingsIcon, Edit3 } from 'lucide-react'

export default function Settings() {
  const [settings, setSettings] = useState([])
  const [loading, setLoading] = useState(true)

  // Modal states
  const [modalOpen, setModalOpen] = useState(false)
  const [editingSetting, setEditingSetting] = useState(null)
  const [modalLoading, setModalLoading] = useState(false)

  // Form value
  const [value, setValue] = useState('')

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .order('key', { ascending: true })

      if (error) throw error
      setSettings(data || [])
    } catch (err) {
      console.warn('Error fetching settings:', err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const handleOpenEdit = (setting) => {
    setEditingSetting(setting)
    setValue(setting.value)
    setModalOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!value.trim()) {
      alert('Please fill in the setting value.')
      return
    }

    // Specific validation for min_order_amount
    if (editingSetting?.key === 'min_order_amount') {
      const parsed = parseFloat(value)
      if (isNaN(parsed) || parsed < 0) {
        alert('Please enter a valid positive number for the minimum order amount.')
        return
      }
    }

    setModalLoading(true)
    try {
      const { error } = await supabase
        .from('settings')
        .update({
          value: value.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', editingSetting.id)

      if (error) throw error

      setModalOpen(false)
      fetchSettings()
    } catch (err) {
      alert('Failed to save setting: ' + err.message)
    } finally {
      setModalLoading(false)
    }
  }

  // Helper to format settings values for display
  const formatValue = (key, val) => {
    if (key === 'min_order_amount') {
      return `₹ ${parseFloat(val).toLocaleString('en-IN')}`
    }
    return val
  }

  return (
    <div className={styles.settingsContainer}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>
            ⚙️ Store Settings
            <span className={styles.badge}>{settings.length}</span>
          </h1>
          <p className={styles.subtitle}>Configure general shop rules and checkout conditions</p>
        </div>
      </div>

      {/* Settings List */}
      {loading ? (
        <div style={{ background: 'white', padding: '30px', borderRadius: '12px', border: '1.5px solid var(--gray-100)' }}>
          <div className="skeleton" style={{ height: '36px', marginBottom: '12px' }} />
          <div className="skeleton" style={{ height: '24px', marginBottom: '8px' }} />
          <div className="skeleton" style={{ height: '24px' }} />
        </div>
      ) : settings.length > 0 ? (
        <div className={styles.tableWrapper}>
          <Table headers={['Setting Name', 'Configured Value', 'Last Updated', 'Actions']}>
            {settings.map(setting => (
              <tr key={setting.id}>
                <td>
                  <span className={styles.settingLabelCell}>{setting.label}</span>
                </td>
                <td>
                  <span className={styles.settingValueCell}>
                    {formatValue(setting.key, setting.value)}
                  </span>
                </td>
                <td>
                  <span className={styles.timestamp}>
                    {new Date(setting.updated_at).toLocaleString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </td>
                <td>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Edit3 size={15} />}
                    onClick={() => handleOpenEdit(setting)}
                  >
                    Edit
                  </Button>
                </td>
              </tr>
            ))}
          </Table>
        </div>
      ) : (
        <EmptyState
          icon="⚙️"
          title="No settings found"
          text="Initialize your store settings table in your Supabase SQL editor to manage Minimum Order Amount and other rules."
        />
      )}

      {/* Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => !modalLoading && setModalOpen(false)}
        title={`✏️ Edit ${editingSetting?.label || 'Setting'}`}
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={modalLoading}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={modalLoading}>
              Save Config
            </Button>
          </>
        }
      >
        {editingSetting && (
          <form onSubmit={handleSave} className={styles.form}>
            <div className={styles.formGroup}>
              <label className={styles.label}>{editingSetting.label} Value *</label>
              <input
                type={editingSetting.key === 'min_order_amount' ? 'number' : 'text'}
                min={editingSetting.key === 'min_order_amount' ? '0' : undefined}
                className={styles.input}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                required
                disabled={modalLoading}
                placeholder="Enter value"
              />
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
