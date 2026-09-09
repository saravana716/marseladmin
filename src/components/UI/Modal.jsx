import { useEffect, useRef } from 'react'
import styles from './Modal.module.css'

export default function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  const overlayRef = useRef(null)

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape' && open) onClose?.() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className={styles.overlay}
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose?.() }}
    >
      <div className={`${styles.modal} ${styles[size]}`} role="dialog" aria-modal="true">
        {title && (
          <div className={styles.header}>
            <h2 className={styles.title}>{title}</h2>
            <button className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
          </div>
        )}
        <div className={styles.body}>
          {children}
        </div>
        {footer && (
          <div className={styles.footer}>{footer}</div>
        )}
      </div>
    </div>
  )
}
