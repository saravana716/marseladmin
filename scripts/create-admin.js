import { initializeApp } from 'firebase/app'
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth'

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
const auth = getAuth(app)

const EMAIL = 'admin@gmail.com'
const PASSWORD = 'Admin@123'

async function createAdminUser() {
  console.log(`🔐 Creating Admin Account in Firebase Auth (${EMAIL})...`)

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, EMAIL, PASSWORD)
    console.log('✅ Admin user successfully created in Firebase Auth!')
    console.log('  UID:', userCredential.user.uid)
    console.log('  Email:', userCredential.user.email)
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      console.log('ℹ️ Admin user already exists in Firebase Auth. Verifying login...')
      try {
        const signin = await signInWithEmailAndPassword(auth, EMAIL, PASSWORD)
        console.log('✅ Verified! Admin credentials are valid and active.')
        console.log('  UID:', signin.user.uid)
      } catch (signinErr) {
        console.error('❌ Could not sign in existing admin:', signinErr.message)
      }
    } else {
      console.error('❌ Error creating admin user:', error.message, error.code)
    }
  }

  process.exit(0)
}

createAdminUser()
