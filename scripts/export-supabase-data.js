import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const SUPABASE_URL = 'https://nqaisyfmkbvdxmuwbels.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xYWlzeWZta2J2ZHhtdXdiZWxzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5NjU5NjUsImV4cCI6MjEwNDU0MTk2NX0.bj32IEhWUpsQPwGq--_x8Baq3tqi2tdvfVF5aNjuRyk'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const TABLES = [
  'categories',
  'products',
  'customers',
  'orders',
  'order_items',
  'marquee',
  'gallery',
  'settings',
  'price_list'
]

async function exportAllData() {
  console.log('📥 Backing up all data from Supabase...\n')
  const backup = {}

  for (const table of TABLES) {
    const { data, error } = await supabase.from(table).select('*')
    if (error) {
      console.warn(`⚠️ Skipping ${table}: ${error.message}`)
      continue
    }
    backup[table] = data || []
    console.log(`  ✅ Exported ${backup[table].length} records from "${table}".`)
  }

  const outputPath = path.join(process.cwd(), 'supabase_data_backup.json')
  fs.writeFileSync(outputPath, JSON.stringify(backup, null, 2))
  console.log(`\n🎉 Backup saved to ${outputPath}`)
}

exportAllData()
