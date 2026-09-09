import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import styles from '../styles/Login.module.css'
import { Mail, Lock, Eye, EyeOff, AlertCircle, CheckSquare, Square } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSavedUser, setIsSavedUser] = useState(false)
  const { signIn } = useAuth()

  useEffect(() => {
    const savedEmail = localStorage.getItem('marsel_remember_email')
    const savedRemember = localStorage.getItem('marsel_remember_me')
    if (savedEmail) {
      setEmail(savedEmail)
      setIsSavedUser(true)
    }
    if (savedRemember !== null) {
      setRememberMe(savedRemember === 'true')
    }
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Please fill in all fields.')
      return
    }

    setError('')
    setLoading(true)

    try {
      await signIn(email, password)

      // Store or clear login credentials based on Remember Me option
      if (rememberMe) {
        localStorage.setItem('marsel_remember_email', email)
        localStorage.setItem('marsel_remember_me', 'true')
      } else {
        localStorage.removeItem('marsel_remember_email')
        localStorage.removeItem('marsel_remember_me')
      }
    } catch (err) {
      setError(err.message || 'Invalid login details.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.loginPage}>
      {/* Background soft glowing blur decorations */}
      <div className={`${styles.decoration} ${styles.decor1}`} />
      <div className={`${styles.decoration} ${styles.decor2}`} />
      <div className={`${styles.decoration} ${styles.decor3}`} />

      <div className={styles.loginContainer}>
        <div className={styles.loginCard}>
          {/* Brand */}
          <div className={styles.brand}>
            <img src="/logo.png" alt="Marsel Traders" className={styles.logoImg} />
            <p className={styles.subtitle}>Sign in to manage your store</p>
          </div>


          {/* Error Message */}
          {error && (
            <div className={styles.loginError}>
              <AlertCircle size={18} className={styles.errorIcon} />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form className={styles.form} onSubmit={handleLogin}>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="email">Email Address</label>
              <div className={styles.inputGroup}>
                <span className={styles.inputIcon}>
                  <Mail size={18} />
                </span>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={styles.input}
                  placeholder="admin@crackers.com"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="password">Password</label>
              <div className={styles.inputGroup}>
                <span className={styles.inputIcon}>
                  <Lock size={18} />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={styles.input}
                  placeholder="Enter password"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex="-1"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember Me Option */}
            <div className={styles.rememberRow}>
              <label className={styles.rememberLabel}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className={styles.checkboxInput}
                />
                <span className={styles.rememberText}>Remember me on this device</span>
              </label>
            </div>

            <button type="submit" className={styles.loginBtn} disabled={loading}>
              {loading ? (
                <>
                  <span className={styles.spinner} />
                  <span>Signing In...</span>
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className={styles.footer}>
            <p>Marsel Traders Admin Panel &nbsp;|&nbsp; Store Management</p>
          </div>
        </div>
      </div>
    </div>
  )
}
