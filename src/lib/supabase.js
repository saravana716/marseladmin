import { createClient } from '@supabase/supabase-js'

// ⚠️ Replace with your actual Supabase credentials
// Go to: https://supabase.com/dashboard → Your Project → Settings → API
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export const BUCKETS = {
  CATEGORIES: 'category-images',
  PRODUCTS: 'product-images',
  GALLERY: 'gallery-videos',
  PRICE_LIST: 'price-lists',
  RECEIPTS: 'order-receipts',
}

// ─── Cloudinary Configuration ───
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
const CLOUDINARY_API_KEY = import.meta.env.VITE_CLOUDINARY_API_KEY
const CLOUDINARY_API_SECRET = import.meta.env.VITE_CLOUDINARY_API_SECRET

// Helper to generate SHA-1 signature for deletion
async function generateSignature(publicId, timestamp) {
  const str = `public_id=${publicId}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`
  const msgBuffer = new TextEncoder().encode(str)
  const hashBuffer = await crypto.subtle.digest('SHA-1', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// ─── Upload image to Cloudinary ───
export async function uploadImage(file, bucket, prefix = '') {
  const resourceType = file.type.startsWith('video/') ? 'video' : 'image'
  
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
  formData.append('folder', bucket) // Map Supabase bucket to Cloudinary folder

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`, {
    method: 'POST',
    body: formData
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || 'Upload failed')

  return data.secure_url
}

// ─── Delete image from Cloudinary ───
export async function deleteImage(imageUrl, bucket) {
  try {
    if (!imageUrl || !imageUrl.includes('res.cloudinary.com')) return

    // Extract public_id from Cloudinary URL
    const urlParts = imageUrl.split('/')
    const filenameWithExt = urlParts.pop()
    const folder = urlParts.pop() // this should match 'bucket'
    const publicId = `${folder}/${filenameWithExt.split('.')[0]}`
    
    // Cloudinary URLs typically put video resources in the /video/ path
    const resourceType = imageUrl.includes('/video/upload/') ? 'video' : 'image'

    const timestamp = Math.round(new Date().getTime() / 1000)
    const signature = await generateSignature(publicId, timestamp)

    const formData = new FormData()
    formData.append('public_id', publicId)
    formData.append('api_key', CLOUDINARY_API_KEY)
    formData.append('timestamp', timestamp)
    formData.append('signature', signature)

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/destroy`, {
      method: 'POST',
      body: formData
    })
    
    const data = await res.json()
    if (!res.ok) console.warn('Cloudinary delete warning:', data)
  } catch (e) {
    console.warn('Could not delete image from Cloudinary:', e)
  }
}
