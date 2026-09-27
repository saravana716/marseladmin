import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore'

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

async function populateOrderItems() {
  console.log('📦 Generating sample line items for existing orders in Firestore...')

  const prodsSnap = await getDocs(collection(db, 'products'))
  const products = prodsSnap.docs.map(d => ({ id: d.id, ...d.data() }))

  if (products.length === 0) {
    console.log('❌ No products found!')
    process.exit(1)
  }

  const ordersSnap = await getDocs(collection(db, 'orders'))
  for (const orderDoc of ordersSnap.docs) {
    const orderData = orderDoc.data()
    const orderId = orderDoc.id
    console.log(`Processing Order ${orderId} (Total: ₹${orderData.total_amount})...`)

    // Pick 2-4 products from database
    const selectedProds = products.slice(0, 3)
    const items = selectedProds.map((p, idx) => ({
      id: `item_${orderId}_${idx + 1}`,
      order_id: orderId,
      product_id: p.id,
      product_name: p.name,
      quantity: idx + 2,
      unit_price: p.price || 100,
      product: {
        name: p.name,
        image_url: p.image_url || ''
      }
    }))

    // 1. Embed items array directly into the order document
    await updateDoc(doc(db, 'orders', orderId), { items })

    // 2. Also insert into order_items collection
    for (const item of items) {
      await setDoc(doc(db, 'order_items', item.id), item, { merge: true })
    }

    console.log(`  ✅ Added ${items.length} items to Order ${orderId}.`)
  }

  console.log('\n🎉 Successfully updated all orders with line items!')
  process.exit(0)
}

populateOrderItems().catch(console.error)
