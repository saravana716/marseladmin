import React from 'react'
import styles from './Table.module.css'

export default function Table({ headers, children, minWidth = '800px' }) {
  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table} style={{ minWidth }}>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {children}
        </tbody>
      </table>
    </div>
  )
}
