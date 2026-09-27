import { initializeApp } from 'firebase/app'
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth'
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query as fsQuery,
  where,
  orderBy as fsOrderBy,
  limit as fsLimit
} from 'firebase/firestore'
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'firebase/storage'

export const firebaseConfig = {
  apiKey: "AIzaSyDmq29-wUXzEolXoXUcPHdCrn6LVY43B5k",
  authDomain: "marseltraders-88a20.firebaseapp.com",
  projectId: "marseltraders-88a20",
  storageBucket: "marseltraders-88a20.firebasestorage.app",
  messagingSenderId: "306472344918",
  appId: "1:306472344918:web:5e17ac83c353bc63a9caf7",
  measurementId: "G-F435MY921P"
};

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

export const BUCKETS = {
  CATEGORIES: 'category-images',
  PRODUCTS: 'product-images',
  GALLERY: 'gallery-videos',
  PRICE_LIST: 'price-lists',
  RECEIPTS: 'order-receipts',
}

// Upload file to Firebase Storage
export async function uploadImage(file, bucket = 'general', prefix = '') {
  if (!file) return ''
  try {
    const cleanFileName = (file.name || 'file').replace(/[^a-zA-Z0-9.-]/g, '_')
    const filename = `${prefix ? prefix + '-' : ''}${Date.now()}-${cleanFileName}`
    const storageRef = ref(storage, `${bucket}/${filename}`)
    const snapshot = await uploadBytes(storageRef, file)
    const downloadURL = await getDownloadURL(snapshot.ref)
    return downloadURL
  } catch (error) {
    console.error('Error uploading file to Firebase Storage:', error)
    throw error
  }
}

// Delete file from Firebase Storage
export async function deleteImage(imageUrl, bucket) {
  try {
    if (!imageUrl) return
    if (imageUrl.includes('firebasestorage.googleapis.com')) {
      const storageRef = ref(storage, imageUrl)
      await deleteObject(storageRef)
    }
  } catch (e) {
    console.warn('Could not delete image from Firebase Storage:', e)
  }
}

// Firebase Firestore Query Helper
class FirestoreQueryBuilder {
  constructor(collectionName) {
    this.collectionName = collectionName
    this.conditions = []
    this.orderBys = []
    this.filterConfigs = []
    this.orderConfigs = []
    this.limitVal = null
    this.isSingle = false
    this.countMode = false
    this.selectFields = null
    this._pendingAction = null
    this._pendingData = null
    this._applyClientSideFilters = false
  }

  select(fields, options = {}) {
    if (options?.count === 'exact') {
      this.countMode = true
    }
    if (fields && fields !== '*') {
      this.selectFields = fields.split(',').map(s => s.trim())
    }
    return this
  }

  eq(field, value) {
    this.conditions.push(where(field, '==', value))
    this.filterConfigs.push({ field, op: '==', val: value })
    return this
  }

  gte(field, value) {
    this.conditions.push(where(field, '>=', value))
    this.filterConfigs.push({ field, op: '>=', val: value })
    return this
  }

  lte(field, value) {
    this.conditions.push(where(field, '<=', value))
    this.filterConfigs.push({ field, op: '<=', val: value })
    return this
  }

  in(field, values) {
    if (Array.isArray(values) && values.length > 0) {
      this.conditions.push(where(field, 'in', values.slice(0, 10)))
      this.filterConfigs.push({ field, op: 'in', val: values })
    }
    return this
  }

  order(field, { ascending = true } = {}) {
    this.orderBys.push(fsOrderBy(field, ascending ? 'asc' : 'desc'))
    this.orderConfigs.push({ field, ascending })
    return this
  }

  limit(n) {
    this.limitVal = n
    return this
  }

  range(from, to) {
    this.limitVal = (to - from) + 1
    return this
  }

  single() {
    this.isSingle = true
    return this
  }

  async insert(data) {
    try {
      const items = Array.isArray(data) ? data : [data]
      const inserted = []
      const colRef = collection(db, this.collectionName)
      for (const item of items) {
        const itemCopy = { ...item, created_at: item.created_at || new Date().toISOString() }
        let docRef
        if (itemCopy.id) {
          docRef = doc(db, this.collectionName, String(itemCopy.id))
          await setDoc(docRef, itemCopy)
        } else {
          docRef = await addDoc(colRef, itemCopy)
          itemCopy.id = docRef.id
          await updateDoc(docRef, { id: docRef.id })
        }
        inserted.push(itemCopy)
      }
      return { data: Array.isArray(data) ? inserted : inserted[0], error: null }
    } catch (error) {
      console.error(`Error inserting into ${this.collectionName}:`, error)
      return { data: null, error }
    }
  }

  update(data) {
    this._pendingAction = 'update'
    this._pendingData = data
    return this
  }

  async upsert(data, options = {}) {
    try {
      const items = Array.isArray(data) ? data : [data]
      const upserted = []
      for (const item of items) {
        const itemCopy = { ...item }
        let docId = itemCopy.id
        if (!docId && options.onConflict && itemCopy[options.onConflict]) {
          docId = itemCopy[options.onConflict]
        }
        if (docId) {
          const docRef = doc(db, this.collectionName, String(docId))
          await setDoc(docRef, itemCopy, { merge: true })
          upserted.push(itemCopy)
        } else {
          const colRef = collection(db, this.collectionName)
          const docRef = await addDoc(colRef, itemCopy)
          itemCopy.id = docRef.id
          await updateDoc(docRef, { id: docRef.id })
          upserted.push(itemCopy)
        }
      }
      return { data: Array.isArray(data) ? upserted : upserted[0], error: null }
    } catch (error) {
      console.error(`Error upserting ${this.collectionName}:`, error)
      return { data: null, error }
    }
  }

  delete() {
    this._pendingAction = 'delete'
    return this
  }

  then(resolve, reject) {
    this._executeQuery()
      .then(resolve)
      .catch(reject)
  }

  async _executeQuery() {
    try {
      if (this._pendingAction === 'update') {
        const snapshot = await this._getDocsSnapshot()
        const updated = []
        for (const docSnap of snapshot.docs) {
          const docRef = doc(db, this.collectionName, docSnap.id)
          await updateDoc(docRef, this._pendingData)
          updated.push({ id: docSnap.id, ...docSnap.data(), ...this._pendingData })
        }
        return { data: updated, error: null }
      }

      if (this._pendingAction === 'delete') {
        const snapshot = await this._getDocsSnapshot()
        for (const docSnap of snapshot.docs) {
          await deleteDoc(doc(db, this.collectionName, docSnap.id))
        }
        return { data: true, error: null }
      }

      const snapshot = await this._getDocsSnapshot()
      let results = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))

      if (this._applyClientSideFilters) {
        if (this.filterConfigs.length > 0) {
          results = results.filter(item => {
            for (const cond of this.filterConfigs) {
              const val = item[cond.field]
              if (cond.op === '==' && String(val) !== String(cond.val)) return false
              if (cond.op === '>=' && val < cond.val) return false
              if (cond.op === '<=' && val > cond.val) return false
              if (cond.op === 'in' && Array.isArray(cond.val) && !cond.val.includes(val)) return false
            }
            return true
          })
        }
        if (this.orderConfigs.length > 0) {
          for (const orderConfig of this.orderConfigs) {
            const { field, ascending } = orderConfig
            results.sort((a, b) => {
              const valA = a[field] ?? ''
              const valB = b[field] ?? ''
              if (valA < valB) return ascending ? -1 : 1
              if (valA > valB) return ascending ? 1 : -1
              return 0
            })
          }
        }
        if (this.limitVal) {
          results = results.slice(0, this.limitVal)
        }
      }

      let count = results.length
      if (this.isSingle) {
        return { data: results[0] || null, error: null, count }
      }
      return { data: results, error: null, count }
    } catch (error) {
      console.error(`Error querying ${this.collectionName}:`, error)
      return { data: null, error, count: 0 }
    }
  }

  async _getDocsSnapshot() {
    const colRef = collection(db, this.collectionName)
    try {
      const queryConstraints = [...this.conditions, ...this.orderBys]
      if (this.limitVal) {
        queryConstraints.push(fsLimit(this.limitVal))
      }
      const q = fsQuery(colRef, ...queryConstraints)
      return await getDocs(q)
    } catch (err) {
      console.warn(`Firestore query fallback triggered for "${this.collectionName}":`, err.message)
      const snapshot = await getDocs(colRef)
      this._applyClientSideFilters = true
      return snapshot
    }
  }
}

export const firebase = {
  from(collectionName) {
    return new FirestoreQueryBuilder(collectionName)
  },
  channel(name) {
    const channelObj = {
      name,
      unsubscribeFn: null,
      on(event, config, callback) {
        if (config && config.table) {
          try {
            const colRef = collection(db, config.table)
            this.unsubscribeFn = onSnapshot(colRef, () => {
              if (callback) callback()
            }, (err) => console.warn('Realtime snapshot notice:', err?.message || err))
          } catch (e) {
            console.warn('Realtime channel error:', e)
          }
        }
        return this
      },
      subscribe() {
        return this
      }
    }
    return channelObj
  },
  removeChannel(ch) {
    if (ch && typeof ch.unsubscribeFn === 'function') {
      try {
        ch.unsubscribeFn()
      } catch (e) {}
    }
  },
  auth: {
    async getSession() {
      return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          unsubscribe()
          if (user) {
            resolve({ data: { session: { user, access_token: 'firebase-token' } } })
          } else {
            resolve({ data: { session: null } })
          }
        })
      })
    },
    onAuthStateChange(callback) {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        const session = user ? { user, access_token: 'firebase-token' } : null
        callback(user ? 'SIGNED_IN' : 'SIGNED_OUT', session)
      })
      return { data: { subscription: { unsubscribe } } }
    },
    async signInWithPassword({ email, password }) {
      try {
        const credential = await signInWithEmailAndPassword(auth, email, password)
        return { data: { user: credential.user, session: { user: credential.user } }, error: null }
      } catch (error) {
        return { data: null, error }
      }
    },
    async signOut() {
      try {
        await firebaseSignOut(auth)
        return { error: null }
      } catch (error) {
        return { error }
      }
    }
  }
}

export const supabase = firebase

export default app
