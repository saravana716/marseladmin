import { createContext, useContext, useEffect, useState } from 'react'
import { firebase as supabase } from '../lib/firebase'

const AuthContext = createContext(null)

const ADMIN_EMAIL = 'admin@gmail.com'
const ADMIN_PASSWORD = 'Admin@123'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check saved local admin session first
    const savedSessionStr = localStorage.getItem('marsel_admin_session')
    if (savedSessionStr) {
      try {
        const saved = JSON.parse(savedSessionStr)
        if (saved && saved.user) {
          setSession(saved)
          setUser(saved.user)
          setLoading(false)
          return
        }
      } catch (e) {}
    }

    // Get initial Firebase auth session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session)
        setUser(session?.user ?? null)
      }
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setSession(session)
        setUser(session?.user ?? null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email, password) => {
    // Check master admin credentials fallback first
    if (email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase() && password === ADMIN_PASSWORD) {
      const adminUser = {
        id: 'admin-master-uid',
        email: ADMIN_EMAIL,
        role: 'admin'
      }
      const adminSession = { user: adminUser, access_token: 'admin-token' }
      setUser(adminUser)
      setSession(adminSession)
      localStorage.setItem('marsel_admin_session', JSON.stringify(adminSession))
      return { user: adminUser, session: adminSession }
    }

    // Attempt Firebase Auth sign in
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      throw new Error(error.message || 'Invalid email or password')
    }
    
    if (data?.session) {
      setUser(data.user)
      setSession(data.session)
      localStorage.setItem('marsel_admin_session', JSON.stringify(data.session))
    }
    return data
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.warn('SignOut notice:', err?.message || err)
    } finally {
      setSession(null)
      setUser(null)
      localStorage.removeItem('marsel_admin_session')
    }
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
