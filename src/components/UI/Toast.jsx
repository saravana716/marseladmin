import styles from './Toast.module.css'

const ICONS = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️',
}

export default function ToastContainer({ toasts, removeToast }) {
  return (
    <div className={styles.container}>
      {toasts.map(t => (
        <div key={t.id} className={`${styles.toast} ${styles[t.type]}`}>
          <span className={styles.icon}>{ICONS[t.type]}</span>
          <span className={styles.message}>{t.message}</span>
          <button className={styles.close} onClick={() => removeToast(t.id)}>✕</button>
        </div>
      ))}
    </div>
  )
}
