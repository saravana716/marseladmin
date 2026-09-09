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

// ─── Upload image to Supabase Storage ───
export async function uploadImage(file, bucket, prefix = '') {
  const ext = file.name.split('.').pop()
  const path = `${prefix}${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { cacheControl: '3600', upsert: false })

  if (error) throw error

  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(data.path)
  return publicUrl
}

// ─── Delete image from Supabase Storage ───
export async function deleteImage(imageUrl, bucket) {
  try {
    const url = new URL(imageUrl)
    const path = url.pathname.split(`/storage/v1/object/public/${bucket}/`)[1]
    if (path) await supabase.storage.from(bucket).remove([path])
  } catch (e) {
    console.warn('Could not delete image:', e)
  }
}
