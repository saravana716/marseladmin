import { initializeApp } from 'firebase/app'
import { getFirestore, doc, setDoc } from 'firebase/firestore'
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInAnonymously } from 'firebase/auth'
import fs from 'fs'
import path from 'path'

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
const auth = getAuth(app)

async function authenticate() {
  console.log('🔑 Authenticating with Firebase...')
  try {
    const cred = await signInAnonymously(auth)
    console.log('  ✅ Authenticated anonymously:', cred.user.uid)
    return
  } catch (e) {
    console.log('  Notice:', e.message)
  }
}

async function importToFirestore() {
  await authenticate()

  const backupPath = path.join(process.cwd(), 'supabase_data_backup.json')
  if (!fs.existsSync(backupPath)) {
    console.error('❌ Backup file not found!')
    process.exit(1)
  }

  const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'))
  let totalImported = 0

  for (const [table, records] of Object.entries(backupData)) {
    if (!records || records.length === 0) continue
    console.log(`📦 Importing ${records.length} records into Firestore collection "${table}"...`)

    let successCount = 0
    for (const item of records) {
      try {
        const docId = item.id ? String(item.id) : String(Date.now() + Math.random())
        const docRef = doc(db, table, docId)
        await setDoc(docRef, item, { merge: true })
        successCount++
        totalImported++
      } catch (err) {
        console.error(`  ❌ Failed item in ${table}:`, err.message)
      }
    }
    console.log(`  ✅ Successfully imported ${successCount}/${records.length} items into "${table}".\n`)
  }

  console.log(`🎉 Import Summary: ${totalImported} total records processed into Firebase.`)
}

importToFirestore().catch(console.error)
