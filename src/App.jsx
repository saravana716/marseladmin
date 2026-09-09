import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import AppLayout from './components/Layout/AppLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Categories from './pages/Categories'
import Products from './pages/Products'
import Orders from './pages/Orders'
import Customers from './pages/Customers'
import PriceList from './pages/PriceList'
import Gallery from './pages/Gallery'
import Gst from './pages/Gst'
import Marquee from './pages/Marquee'
import Settings from './pages/Settings'
import Spinner from './components/UI/Spinner'

// Protected Route wrapper
function ProtectedRoute({ children }) {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--gray-50)'
      }}>
        <Spinner size="lg" />
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return children
}

// Guest Route wrapper (prevent logged in users from hitting /login)
function GuestRoute({ children }) {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--gray-50)'
      }}>
        <Spinner size="lg" />
      </div>
    )
  }

  if (session) {
    return <Navigate to="/" replace />
  }

  return children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Guest routes */}
          <Route path="/login" element={
            <GuestRoute>
              <Login />
            </GuestRoute>
          } />

          {/* Protected admin shell routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="categories" element={<Categories />} />
            <Route path="products" element={<Products />} />
            <Route path="orders" element={<Orders />} />
            <Route path="customers" element={<Customers />} />
            <Route path="price-list" element={<PriceList />} />
            <Route path="gallery" element={<Gallery />} />
            <Route path="gst" element={<Gst />} />
            <Route path="marquee" element={<Marquee />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
