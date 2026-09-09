# 🎆 Crackers Admin Panel

A premium, full-featured admin panel for a fireworks/crackers e-commerce store built with HTML + Vanilla JS + Supabase.

---

## 🚀 Quick Start

### Step 1: Set Up Supabase

1. Go to [https://supabase.com](https://supabase.com) → Create a new project
2. Go to **SQL Editor** → Paste contents of `supabase-setup.sql` → Run
3. Go to **Storage** → Create two public buckets:
   - `category-images`
   - `product-images`
4. For each bucket, set policies to allow authenticated uploads and public reads

### Step 2: Add Your Credentials

Open `js/supabase.js` and replace:
```js
const SUPABASE_URL = 'YOUR_SUPABASE_PROJECT_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

Get these from: **Supabase Dashboard → Your Project → Settings → API**

### Step 3: Create Admin User

Go to **Supabase Dashboard → Authentication → Users → Invite User**
- Enter your email and a strong password
- Use these credentials to log in to the admin panel

### Step 4: Open the App

Open `index.html` in your browser (or use a local server like Live Server in VS Code)

---

## 📁 Project Structure

```
New crackers admin/
├── index.html              ← Login page
├── dashboard.html          ← Main admin SPA
├── supabase-setup.sql      ← Database setup script
├── css/
│   ├── main.css            ← Design system & shared styles
│   ├── login.css           ← Login page styles
│   └── dashboard.css       ← Dashboard layout styles
└── js/
    ├── supabase.js         ← Supabase client & storage helpers
    ├── auth.js             ← Authentication module
    ├── utils.js            ← Toast, Modal, formatting utilities
    ├── dashboard.js        ← KPIs, charts, recent orders
    ├── categories.js       ← Category CRUD with image upload
    ├── products.js         ← Product CRUD with image upload
    ├── orders.js           ← Order management + PDF invoice
    └── customers.js        ← Customer view + order history
```

---

## ✨ Features

| Feature | Details |
|---|---|
| 🔐 Login | Email/password via Supabase Auth |
| 📊 Dashboard | KPI cards, 7-day revenue chart, category donut chart, recent orders, low-stock alert |
| 🗂️ Categories | Add with image upload, view cards, delete |
| 🎇 Products | Add/Edit/Delete with image upload, grid/table view, search & filter by category |
| 📦 Orders | View all orders, filter by status, update order status, view order details, download PDF invoice |
| 👥 Customers | View all customers, order count & total spend, view order history modal |
| 🚪 Logout | Secure Supabase signout |
| 📱 Responsive | Works on mobile, tablet, and desktop |
| 🎆 Design | Light theme with vibrant orange/red/gold crackers aesthetic |

---

## 🛠️ Tech Stack

- **Frontend**: HTML5 + Vanilla JS + Vanilla CSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **PDF Generation**: jsPDF
- **Charts**: Chart.js
- **Fonts**: Google Fonts (Inter + Poppins)

---

## 📝 Database Schema

```
categories        → id, name, description, image_url, created_at
products          → id, category_id, name, description, price, stock, image_url, created_at
customers         → id, name, email, phone, address, created_at
orders            → id, customer_id, status, total_amount, notes, created_at
order_items       → id, order_id, product_id, product_name, quantity, unit_price, created_at
```

---

## 🔧 Customization

- **Brand name**: Search for "Crackers Admin" in HTML files and replace
- **Currency**: Change `'INR'` in `js/utils.js` → `formatCurrency()`
- **Colors**: Modify CSS variables in `css/main.css` → `:root {}`
- **Storage bucket names**: Change in `js/supabase.js` → `STORAGE_BUCKETS`
