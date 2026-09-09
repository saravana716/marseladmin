import React from 'react'
import Modal from './Modal'
import Button from './Button'

export default function ConfirmDialog({ open, onClose, onConfirm, title = 'Are you sure?', message = 'This action cannot be undone.', confirmText = 'Delete', loading = false }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" onClick={onConfirm} loading={loading}>
            {confirmText}
          </Button>
        </>
      }
    >
      <p style={{ fontSize: '14px', color: 'var(--gray-600)', lineHeight: '1.5' }}>
        {message}
      </p>
    </Modal>
  )
}
