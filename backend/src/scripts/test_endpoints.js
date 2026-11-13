import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()

const BASE_URL = 'http://localhost:5000'

async function runTests() {
  const results = []

  const logTest = (endpoint, method, requestBody, expectedResponse, status, passed, details) => {
    results.push({
      endpoint,
      method,
      requestBody: requestBody ? JSON.stringify(requestBody) : 'None',
      expectedStatus: expectedResponse.status,
      actualStatus: status,
      passed,
      details,
    })
    console.log(`[${passed ? 'PASS' : 'FAIL'}] ${method} ${endpoint} (Status: ${status})`)
  }

  try {
    console.log('--- Starting API Endpoints Testing ---')

    // Safety Guard: Refuse to execute destructive test suite against production/development server
    const initialHealth = await fetch(`${BASE_URL}/api/health`).then(r => r.json()).catch(() => null)
    if (
      !initialHealth ||
      initialHealth.environment !== 'test' ||
      initialHealth.database?.name === 'paytm_sales'
    ) {
      console.error(
        '❌ SAFETY ABORT: test_endpoints.js creates and deletes records. It is strictly barred from running against any server connected to "paytm_sales". Only test servers with environment="test" and database="paytm_sales_test" are permitted.'
      )
      return
    }

    // 1. Health Endpoint
    {
      const res = await fetch(`${BASE_URL}/api/health`)
      const data = await res.json()
      const passed = res.status === 200 && data.status === 'ok'
      logTest('/api/health', 'GET', null, { status: 200 }, res.status, passed, data)
    }

    // 2. Dashboard Stats
    {
      const res = await fetch(`${BASE_URL}/api/dashboard/stats`)
      const data = await res.json()
      const passed = res.status === 200 && data.status === 'success' && data.data?.overview !== undefined
      logTest('/api/dashboard/stats', 'GET', null, { status: 200 }, res.status, passed, data)
    }

    // 3. Create Shopkeeper
    let shopkeeperId = null
    const uniquePhone = `+91 98${Math.floor(10000000 + Math.random() * 90000000)}`
    const shopkeeperPayload = {
      name: 'TEST_TEMP_Ramesh Gupta',
      shopName: 'TEST_TEMP_Gupta Kirana & General Store',
      phoneNumber: uniquePhone,
      category: 'Kirana / Grocery',
      address: {
        street: 'Shop 12, Main Market',
        city: 'Jaipur',
        state: 'Rajasthan',
        pincode: '302001',
      },
      preferredLanguage: 'Hindi',
      status: 'New',
      whatsappOptIn: true,
    }
    {
      const res = await fetch(`${BASE_URL}/api/shopkeepers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shopkeeperPayload),
      })
      const data = await res.json()
      const passed = res.status === 201 && data.status === 'success' && data.data?._id
      shopkeeperId = data.data?._id
      logTest('/api/shopkeepers', 'POST', shopkeeperPayload, { status: 201 }, res.status, passed, data)
    }

    // 4. Get All Shopkeepers (Search, Filter, Pagination)
    {
      const res = await fetch(`${BASE_URL}/api/shopkeepers?search=Gupta&city=Jaipur&page=1&limit=5`)
      const data = await res.json()
      const passed = res.status === 200 && data.status === 'success' && Array.isArray(data.data)
      logTest('/api/shopkeepers?search=Gupta&city=Jaipur', 'GET', null, { status: 200 }, res.status, passed, data)
    }

    // 5. Get Shopkeeper by ID
    {
      const res = await fetch(`${BASE_URL}/api/shopkeepers/${shopkeeperId}`)
      const data = await res.json()
      const passed = res.status === 200 && data.status === 'success' && data.data?._id === shopkeeperId
      logTest(`/api/shopkeepers/${shopkeeperId}`, 'GET', null, { status: 200 }, res.status, passed, data)
    }

    // 6. Update Shopkeeper
    const shopkeeperUpdatePayload = { status: 'Interested', notes: 'Interested in Soundbox 4.0' }
    {
      const res = await fetch(`${BASE_URL}/api/shopkeepers/${shopkeeperId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shopkeeperUpdatePayload),
      })
      const data = await res.json()
      const passed = res.status === 200 && data.data?.status === 'Interested'
      logTest(`/api/shopkeepers/${shopkeeperId}`, 'PATCH', shopkeeperUpdatePayload, { status: 200 }, res.status, passed, data)
    }

    // 7. Create Campaign
    let campaignId = null
    const campaignPayload = {
      campaignName: 'TEST_TEMP_Jaipur Kirana Soundbox Festive Q4',
      productFocus: 'Paytm Soundbox 4.0',
      channel: 'WhatsApp',
      targetAudience: { city: 'Jaipur', category: 'Kirana / Grocery', minDailyTransactions: 20 },
      campaignStatus: 'Active',
    }
    {
      const res = await fetch(`${BASE_URL}/api/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaignPayload),
      })
      const data = await res.json()
      const passed = res.status === 201 && data.status === 'success' && data.data?._id
      campaignId = data.data?._id
      logTest('/api/campaigns', 'POST', campaignPayload, { status: 201 }, res.status, passed, data)
    }

    // 8. Get All Campaigns
    {
      const res = await fetch(`${BASE_URL}/api/campaigns?status=Active`)
      const data = await res.json()
      const passed = res.status === 200 && Array.isArray(data.data)
      logTest('/api/campaigns?status=Active', 'GET', null, { status: 200 }, res.status, passed, data)
    }

    // 9. Get Campaign by ID
    {
      const res = await fetch(`${BASE_URL}/api/campaigns/${campaignId}`)
      const data = await res.json()
      const passed = res.status === 200 && data.data?._id === campaignId
      logTest(`/api/campaigns/${campaignId}`, 'GET', null, { status: 200 }, res.status, passed, data)
    }

    // 10. Update Campaign
    const campaignUpdatePayload = { campaignStatus: 'Paused' }
    {
      const res = await fetch(`${BASE_URL}/api/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaignUpdatePayload),
      })
      const data = await res.json()
      const passed = res.status === 200 && data.data?.campaignStatus === 'Paused'
      logTest(`/api/campaigns/${campaignId}`, 'PATCH', campaignUpdatePayload, { status: 200 }, res.status, passed, data)
    }

    // 11. Create Lead
    let leadId = null
    const leadPayload = {
      shopkeeperId,
      campaignId,
      interestedProducts: ['Paytm Soundbox 4.0'],
      leadStatus: 'Hot',
      confidenceScore: 85,
      stage: 'Identified',
      priority: 'High',
      aiSummary: 'TEST_TEMP_Customer inquired about battery backup and UPI voice alerts.',
    }
    {
      const res = await fetch(`${BASE_URL}/api/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leadPayload),
      })
      const data = await res.json()
      const passed = res.status === 201 && data.status === 'success' && data.data?._id
      leadId = data.data?._id
      logTest('/api/leads', 'POST', leadPayload, { status: 201 }, res.status, passed, data)
    }

    // 12. Get All Leads (Filtering by Hot, Warm, Cold)
    {
      const res = await fetch(`${BASE_URL}/api/leads?leadStatus=Hot&priority=High`)
      const data = await res.json()
      const passed = res.status === 200 && Array.isArray(data.data) && data.data.length > 0
      logTest('/api/leads?leadStatus=Hot', 'GET', null, { status: 200 }, res.status, passed, data)
    }

    // 13. Get Lead by ID
    {
      const res = await fetch(`${BASE_URL}/api/leads/${leadId}`)
      const data = await res.json()
      const passed = res.status === 200 && data.data?._id === leadId
      logTest(`/api/leads/${leadId}`, 'GET', null, { status: 200 }, res.status, passed, data)
    }

    // 14. Update Lead Status
    const statusUpdatePayload = { leadStatus: 'Warm' }
    {
      const res = await fetch(`${BASE_URL}/api/leads/${leadId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(statusUpdatePayload),
      })
      const data = await res.json()
      const passed = res.status === 200 && data.data?.leadStatus === 'Warm'
      logTest(`/api/leads/${leadId}/status`, 'PATCH', statusUpdatePayload, { status: 200 }, res.status, passed, data)
    }

    // 15. Update General Lead Fields
    const leadUpdatePayload = { priority: 'Medium', stage: 'Demo Scheduled' }
    {
      const res = await fetch(`${BASE_URL}/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leadUpdatePayload),
      })
      const data = await res.json()
      const passed = res.status === 200 && data.data?.stage === 'Demo Scheduled'
      logTest(`/api/leads/${leadId}`, 'PATCH', leadUpdatePayload, { status: 200 }, res.status, passed, data)
    }

    // 16. Create Sales Agent
    let agentId = null
    const agentEmail = `test_temp_agent_${Date.now()}@paytm-sales.local`
    const agentPayload = {
      name: 'TEST_TEMP_Vikas Sharma',
      email: agentEmail,
      phone: '+91 98112 34567',
      territory: 'Jaipur North',
      status: 'Available',
    }
    {
      const res = await fetch(`${BASE_URL}/api/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agentPayload),
      })
      const data = await res.json()
      const passed = res.status === 201 && data.status === 'success' && data.data?._id
      agentId = data.data?._id
      logTest('/api/agents', 'POST', agentPayload, { status: 201 }, res.status, passed, data)
    }

    // 17. Get All Agents
    {
      const res = await fetch(`${BASE_URL}/api/agents?status=Available`)
      const data = await res.json()
      const passed = res.status === 200 && Array.isArray(data.data) && data.data.length > 0
      logTest('/api/agents?status=Available', 'GET', null, { status: 200 }, res.status, passed, data)
    }

    // 18. Get Agent by ID
    {
      const res = await fetch(`${BASE_URL}/api/agents/${agentId}`)
      const data = await res.json()
      const passed = res.status === 200 && data.data?._id === agentId
      logTest(`/api/agents/${agentId}`, 'GET', null, { status: 200 }, res.status, passed, data)
    }

    // 19. Update Agent
    const agentUpdatePayload = { territory: 'Jaipur Central' }
    {
      const res = await fetch(`${BASE_URL}/api/agents/${agentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agentUpdatePayload),
      })
      const data = await res.json()
      const passed = res.status === 200 && data.data?.territory === 'Jaipur Central'
      logTest(`/api/agents/${agentId}`, 'PATCH', agentUpdatePayload, { status: 200 }, res.status, passed, data)
    }

    // 20. Assign Lead to Agent (Atomic Assignment)
    const assignPayload = {
      leadId,
      agentId,
      assignedBy: 'Admin',
      priority: 'High',
      notes: 'TEST_TEMP_Please visit store on Monday for Soundbox demo.',
    }
    {
      const res = await fetch(`${BASE_URL}/api/agents/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assignPayload),
      })
      const data = await res.json()
      const passed = res.status === 200 && data.status === 'success' && data.data?.isActive === true
      logTest('/api/agents/assign', 'POST', assignPayload, { status: 200 }, res.status, passed, data)
    }

    // 21. Track Assigned Leads for Agent
    {
      const res = await fetch(`${BASE_URL}/api/agents/${agentId}/leads`)
      const data = await res.json()
      const passed = res.status === 200 && data.data?.totalAssignedLeads === 1
      logTest(`/api/agents/${agentId}/leads`, 'GET', null, { status: 200 }, res.status, passed, data)
    }

    // 22. Relational Protection: Attempt to delete Shopkeeper with active lead
    {
      const res = await fetch(`${BASE_URL}/api/shopkeepers/${shopkeeperId}`, { method: 'DELETE' })
      const data = await res.json()
      const passed = res.status === 400 && data.status === 'error' // Safeguard triggered!
      logTest(`/api/shopkeepers/${shopkeeperId} (Protected)`, 'DELETE', null, { status: 400 }, res.status, passed, data)
    }

    // 23. Relational Protection: Attempt to delete Campaign with active lead
    {
      const res = await fetch(`${BASE_URL}/api/campaigns/${campaignId}`, { method: 'DELETE' })
      const data = await res.json()
      const passed = res.status === 400 && data.status === 'error' // Safeguard triggered!
      logTest(`/api/campaigns/${campaignId} (Protected)`, 'DELETE', null, { status: 400 }, res.status, passed, data)
    }

    // 24. Relational Protection: Attempt to delete Agent with active assignment
    {
      const res = await fetch(`${BASE_URL}/api/agents/${agentId}`, { method: 'DELETE' })
      const data = await res.json()
      const passed = res.status === 400 && data.status === 'error' // Safeguard triggered!
      logTest(`/api/agents/${agentId} (Protected)`, 'DELETE', null, { status: 400 }, res.status, passed, data)
    }

    // 25. Invalid ObjectId Format Test
    {
      const res = await fetch(`${BASE_URL}/api/shopkeepers/invalid-id-xyz`)
      const data = await res.json()
      const passed = res.status === 400 && data.status === 'error'
      logTest('/api/shopkeepers/invalid-id-xyz', 'GET', null, { status: 400 }, res.status, passed, data)
    }

    // Clean up test records (reversing dependency order)
    console.log('--- Cleaning up test records ---')
    // Delete lead (also removes assignments)
    await fetch(`${BASE_URL}/api/leads/${leadId}`, { method: 'DELETE' })
    // Delete shopkeeper
    await fetch(`${BASE_URL}/api/shopkeepers/${shopkeeperId}`, { method: 'DELETE' })
    // Delete campaign
    await fetch(`${BASE_URL}/api/campaigns/${campaignId}`, { method: 'DELETE' })
    // Delete agent
    await fetch(`${BASE_URL}/api/agents/${agentId}`, { method: 'DELETE' })
    console.log('--- Test cleanup complete ---')

    console.log(JSON.stringify(results, null, 2))
  } catch (err) {
    console.error('Test execution error:', err)
  }
}

runTests()

