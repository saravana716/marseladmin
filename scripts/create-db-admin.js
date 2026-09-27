import { initializeApp } from 'firebase/app'
import { getFirestore, doc, setDoc } from 'firebase/firestore'

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

const ADMIN_DATA = {
  id: 'admin_account_master',
  email: 'admin@gmail.com',
  name: 'Admin User',
  role: 'admin',
  phone: '9876543210',
  active: true,
  created_at: new Date().toISOString()
}

async function addAdminToFirestore() {
  console.log('📦 Adding Admin Account to Firestore Database...')

  try {
    // 1. Add to 'admins' collection
    await setDoc(doc(db, 'admins', 'admin_account_master'), ADMIN_DATA, { merge: true })
    console.log('  ✅ Saved to Firestore "admins" collection!')

    // 2. Add to 'users' collection
    await setDoc(doc(db, 'users', 'admin_account_master'), ADMIN_DATA, { merge: true })
    console.log('  ✅ Saved to Firestore "users" collection!')

    console.log('\n🎉 Admin account successfully added to Firestore Database!')
  } catch (error) {
    console.error('❌ Error writing admin to Firestore:', error.message)
  }

  process.exit(0)
}

addAdminToFirestore()
