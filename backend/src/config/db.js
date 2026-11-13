import dns from 'node:dns'
import mongoose from 'mongoose'

/**
 * Configure DNS servers for reliable MongoDB Atlas SRV resolution.
 * On Windows/certain network setups, Node's c-ares DNS resolver can default to
 * 127.0.0.1 where no DNS daemon is listening, causing "querySrv ECONNREFUSED".
 */
const configureDnsForAtlas = () => {
  try {
    const servers = dns.getServers()
    // If DNS is set to loopback or empty, fallback to reliable public DNS resolvers
    if (servers.includes('127.0.0.1') || servers.includes('::1') || servers.length === 0) {
      dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1'])
    }
  } catch {
    // If setting custom DNS servers is restricted in the environment, continue with system defaults
  }
}

/**
 * Safely extract host information for logging without exposing credentials
 */
const getSanitizedTarget = (uri) => {
  try {
    const parsed = new URL(uri)
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`
  } catch {
    return 'MongoDB Atlas'
  }
}

/**
 * Determine the appropriate MongoDB URI based on NODE_ENV.
 * Strictly guarantees that integration tests cannot touch the production database.
 */
export const getDatabaseURI = () => {
  if (process.env.NODE_ENV === 'test') {
    const testURI = process.env.MONGODB_TEST_URI
    if (!testURI || testURI.trim() === '') {
      throw new Error(
        'Safety Check Failed: MONGODB_TEST_URI is required when NODE_ENV=test. Refusing to run tests without an isolated test database.'
      )
    }
    // Prevent accidental connection to production database during tests
    const parsed = new URL(testURI)
    const dbName = parsed.pathname.replace(/^\//, '').split('?')[0]
    if (dbName === 'paytm_sales') {
      throw new Error(
        'Safety Check Failed: MONGODB_TEST_URI must not point to production database "paytm_sales". Use a dedicated test database (e.g. paytm_sales_test).'
      )
    }
    return testURI
  }
  return process.env.MONGODB_URI
}

/**
 * Connect to MongoDB Atlas using Mongoose
 */
export const connectDB = async (overrideUri = null) => {
  let mongoURI
  try {
    mongoURI = overrideUri || getDatabaseURI()
    if (process.env.NODE_ENV === 'test' && mongoURI) {
      const parsed = new URL(mongoURI)
      const dbName = parsed.pathname.replace(/^\//, '').split('?')[0]
      if (dbName === 'paytm_sales') {
        throw new Error(
          'Safety Check Failed: Integration tests cannot connect to production database "paytm_sales". Refusing to proceed.'
        )
      }
    }
  } catch (uriErr) {
    console.error(`❌ Database Configuration Error: ${uriErr.message}`)
    throw uriErr
  }

  if (!mongoURI) {
    console.warn('⚠️ MONGODB_URI is not defined in environment variables. Database connection skipped.')
    return
  }

  // Ensure DNS is properly configured for SRV queries
  configureDnsForAtlas()

  try {
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 10000,
    })
    console.log(`✅ MongoDB Connected successfully to: ${conn.connection.host}`)
  } catch (error) {
    // If SRV DNS query failed, attempt retry with public DNS
    if (error.message && error.message.includes('querySrv')) {
      try {
        dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1'])
        const conn = await mongoose.connect(mongoURI, {
          serverSelectionTimeoutMS: 10000,
        })
        console.log(`✅ MongoDB Connected successfully (via fallback DNS): ${conn.connection.host}`)
        return
      } catch (retryError) {
        console.error(`❌ MongoDB Connection Error (${getSanitizedTarget(mongoURI)}): ${retryError.message}`)
        return
      }
    }

    console.error(`❌ MongoDB Connection Error (${getSanitizedTarget(mongoURI)}): ${error.message}`)
  }
}
