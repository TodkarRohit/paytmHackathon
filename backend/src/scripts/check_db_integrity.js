import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dns from 'node:dns'
import dotenv from 'dotenv'
import mongoose from 'mongoose'

try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1'])
} catch {}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

async function inspectDb() {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI not found')

  const parsed = new URL(uri)
  const dbName = parsed.pathname.replace(/^\//, '').split('?')[0]
  console.log(`Inspecting database: ${dbName}`)

  await mongoose.connect(uri)
  const collections = await mongoose.connection.db.listCollections().toArray()

  console.log('Collection document counts:')
  for (const col of collections) {
    const count = await mongoose.connection.db.collection(col.name).countDocuments()
    console.log(` - ${col.name}: ${count}`)
  }

  await mongoose.disconnect()
}

inspectDb().catch((err) => {
  console.error('Error:', err.message)
  process.exit(1)
})
