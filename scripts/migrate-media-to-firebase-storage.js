import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore'
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'

const firebaseConfig = {
  apiKey: "AIzaSyDmq29-wUXzEolXoXUcPHdCrn6LVY43B5k",
  authDomain: "marseltraders-88a20.firebaseapp.com",
  projectId: "marseltraders-88a20",
  storageBucket: "marseltraders-88a20.firebasestorage.app",
  messagingSenderId: "306472344918",
  appId: "1:306472344918:web:5e17ac83c353bc63a9caf7",
  measurementId: "G-F435MY921P"
};

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)
const storage = getStorage(app)

const URL_FIELDS = [
  { collection: 'categories', bucket: 'category-images', fields: ['image_url'] },
  { collection: 'products', bucket: 'product-images', fields: ['image_url', 'video_url'] },
  { collection: 'orders', bucket: 'order-receipts', fields: ['receipt_url', 'payment_screenshot_url'] },
  { collection: 'gallery', bucket: 'gallery-videos', fields: ['video_url', 'thumbnail_url'] },
  { collection: 'price_list', bucket: 'price-lists', fields: ['file_url'] },
]

async function downloadFileBuffer(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP error ${res.status} fetching ${url}`)
  const arrayBuffer = await res.arrayBuffer()
  const contentType = res.headers.get('content-type') || 'application/octet-stream'
  return { buffer: Buffer.from(arrayBuffer), contentType }
}

async function migrateMediaFiles() {
  console.log('🚀 Starting Media Migration to Firebase Storage...\n')
  let totalReplaced = 0

  for (const item of URL_FIELDS) {
    console.log(`📦 Checking collection "${item.collection}"...`)
    const snapshot = await getDocs(collection(db, item.collection))
    
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data()
      const updates = {}

      for (const field of item.fields) {
        const currentUrl = data[field]
        if (!currentUrl || typeof currentUrl !== 'string' || currentUrl.trim() === '') continue
        if (currentUrl.includes('firebasestorage.googleapis.com')) {
          console.log(`  ℹ️ Doc ${docSnap.id} [${field}] is already on Firebase Storage.`)
          continue
        }

        console.log(`  ⏬ Downloading [${field}] for doc ${docSnap.id} (${currentUrl.slice(0, 60)}...)...`)
        try {
          const { buffer, contentType } = await downloadFileBuffer(currentUrl)
          const ext = currentUrl.split('?')[0].split('.').pop() || 'bin'
          const safeExt = ext.length <= 5 ? ext : 'jpg'
          const storageFileName = `${docSnap.id}_${field}_${Date.now()}.${safeExt}`
          const storageRef = ref(storage, `${item.bucket}/${storageFileName}`)

          const uploadSnap = await uploadBytes(storageRef, buffer, { contentType })
          const firebaseStorageUrl = await getDownloadURL(uploadSnap.ref)

          updates[field] = firebaseStorageUrl
          console.log(`  ✅ Successfully uploaded to Firebase Storage and generated URL.`)
          totalReplaced++
        } catch (err) {
          console.warn(`  ⚠️ Could not download/upload ${currentUrl}:`, err.message)
        }
      }

      if (Object.keys(updates).length > 0) {
        await updateDoc(doc(db, item.collection, docSnap.id), updates)
        console.log(`  💾 Updated Firestore doc ${docSnap.id} with new Firebase Storage URLs.`)
      }
    }
  }

  console.log(`\n🎉 Media Migration Complete! Replaced ${totalReplaced} image/video URLs with Firebase Storage URLs.`)
  process.exit(0)
}

migrateMediaFiles().catch(console.error)
