import React, { useState, useEffect } from 'react'
import {
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Send,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Smartphone,
  Bot,
  Info,
} from 'lucide-react'
import Modal from './Modal'
import { twilioAPI } from '../services/api'

export default function TwilioWhatsAppModal({ isOpen, onClose }) {
  const [loading, setLoading] = useState(false)
  const [twilioStatus, setTwilioStatus] = useState(null)
  const [copied, setCopied] = useState(false)

  // Simulation test state
  const [testPhone, setTestPhone] = useState('+919876543210')
  const [testProfileName, setTestProfileName] = useState('Ramesh Sharma (Kirana Store)')
  const [testMessage, setTestMessage] = useState('Namaste, Soundbox ka monthly charge kitna hai?')
  const [simulating, setSimulating] = useState(false)
  const [simulationResult, setSimulationResult] = useState(null)
  const [simError, setSimError] = useState(null)

  // Outbound test state
  const [activeTab, setActiveTab] = useState('inbound') // 'inbound' | 'outbound' | 'setup'
  const [outboundTo, setOutboundTo] = useState('+919876543210')
  const [outboundBody, setOutboundBody] = useState('Namaste Ramesh ji! Paytm Soundbox counter demo ready hai.')
  const [sendingOutbound, setSendingOutbound] = useState(false)
  const [outboundResult, setOutboundResult] = useState(null)

  const fetchStatus = async () => {
    setLoading(true)
    try {
      const res = await twilioAPI.getStatus()
      if (res && res.data) {
        setTwilioStatus(res.data)
      }
    } catch (err) {
      console.warn('Failed to fetch Twilio status:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchStatus()
    }
  }, [isOpen])

  const webhookFullUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/webhooks/twilio/whatsapp`
    : 'http://localhost:5000/api/webhooks/twilio/whatsapp'

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookFullUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRunSimulation = async (customText = null) => {
    const textToSend = customText || testMessage
    if (!textToSend.trim()) return

    setSimulating(true)
    setSimError(null)
    setSimulationResult(null)

    try {
      const res = await twilioAPI.simulateIncoming({
        from: testPhone,
        profileName: testProfileName,
        body: textToSend.trim(),
      })
      setSimulationResult(res)
    } catch (err) {
      setSimError(err.message || 'Simulation failed')
    } finally {
      setSimulating(false)
    }
  }

  const handleSendOutbound = async () => {
    if (!outboundTo.trim() || !outboundBody.trim()) return

    setSendingOutbound(true)
    setOutboundResult(null)
    setSimError(null)

    try {
      const res = await twilioAPI.sendWhatsApp({
        to: outboundTo.trim(),
        message: outboundBody.trim(),
      })
      setOutboundResult(res.data)
    } catch (err) {
      setSimError(err.message || 'Outbound dispatch failed')
    } finally {
      setSendingOutbound(false)
    }
  }

  if (!isOpen) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Twilio WhatsApp Integration Hub"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">
        {/* Status banner */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3.5 rounded-xl border border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-900">Twilio WhatsApp Gateway</h4>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    twilioStatus?.configured
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      twilioStatus?.configured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                    }`}
                  />
                  {twilioStatus?.configured ? 'Twilio Live Connected' : 'Testing / Ready for Credentials'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Sender:{' '}
                <span className="font-mono text-slate-700 font-semibold">
                  {twilioStatus?.whatsappNumber || 'whatsapp:+14155238886'}
                </span>{' '}
                {twilioStatus?.accountSidMasked && `• SID: ${twilioStatus.accountSidMasked}`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={fetchStatus}
            disabled={loading}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-white rounded-lg border border-slate-200 transition-colors cursor-pointer"
            title="Refresh status"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('inbound')}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'inbound'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Simulate Merchant Inbound
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('outbound')}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'outbound'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Send Outbound WhatsApp
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('setup')}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'setup'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Twilio Setup Guide
          </button>
        </div>

        {/* Tab 1: Simulate Inbound */}
        {activeTab === 'inbound' && (
          <div className="space-y-3 pt-1">
            <p className="text-xs text-slate-500">
              Simulate an incoming WhatsApp message from a shopkeeper. The system will auto-provision the merchant, run the Gemini AI Sales Agent, record conversation history, and generate the TwiML reply.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Merchant Phone Number
                </label>
                <input
                  type="text"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                  placeholder="+919876543210"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Merchant WhatsApp Name
                </label>
                <input
                  type="text"
                  value={testProfileName}
                  onChange={(e) => setTestProfileName(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="Ramesh Sharma"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Incoming Merchant Message
              </label>
              <textarea
                rows={2}
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="Type question in Hindi, Hinglish, or English..."
              />
            </div>

            {/* Quick Sample Message Buttons */}
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-[10px] text-slate-400 font-semibold">Quick Tests:</span>
              <button
                type="button"
                onClick={() => {
                  setTestMessage('Soundbox ka monthly rent kitna hai?')
                  handleRunSimulation('Soundbox ka monthly rent kitna hai?')
                }}
                className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
              >
                💰 Price Inquiry
              </button>
              <button
                type="button"
                onClick={() => {
                  setTestMessage('Mujhe apne store ke liye soundbox lagwana hai.')
                  handleRunSimulation('Mujhe apne store ke liye soundbox lagwana hai.')
                }}
                className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
              >
                🛒 Purchase Intent
              </button>
              <button
                type="button"
                onClick={() => {
                  setTestMessage('STOP')
                  handleRunSimulation('STOP')
                }}
                className="text-[10px] px-2 py-0.5 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 cursor-pointer"
              >
                🛑 STOP (Opt-out)
              </button>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => handleRunSimulation()}
                disabled={simulating || !testMessage.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition-colors cursor-pointer shadow-xs"
              >
                {simulating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                {simulating ? 'Processing Webhook...' : 'Send WhatsApp Message'}
              </button>
            </div>

            {/* Result Box */}
            {simulationResult && (
              <div className="mt-3 p-3 rounded-xl border border-emerald-200 bg-emerald-50/60 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                  <Bot className="w-4 h-4 text-emerald-600" />
                  <span>AI Sales Agent Response (Returned via TwiML XML):</span>
                </div>
                <div className="p-2.5 rounded-lg bg-white border border-emerald-100 text-xs text-slate-800 leading-relaxed font-sans shadow-2xs">
                  {simulationResult.reply}
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-emerald-800 font-mono">
                  <span>From: {simulationResult.input?.from}</span>
                  <span>•</span>
                  <span>Auto-Synced: Shopkeeper &amp; CRM Lead</span>
                </div>
              </div>
            )}

            {simError && (
              <div className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-xs text-rose-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{simError}</span>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Outbound WhatsApp */}
        {activeTab === 'outbound' && (
          <div className="space-y-3 pt-1">
            <p className="text-xs text-slate-500">
              Dispatch an outbound WhatsApp message directly to a merchant phone number using the Twilio REST API.
            </p>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Recipient Phone Number (with Country Code)
              </label>
              <input
                type="text"
                value={outboundTo}
                onChange={(e) => setOutboundTo(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                placeholder="+919876543210"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                WhatsApp Message Content
              </label>
              <textarea
                rows={3}
                value={outboundBody}
                onChange={(e) => setOutboundBody(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="Type outbound sales message..."
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleSendOutbound}
                disabled={sendingOutbound || !outboundTo.trim() || !outboundBody.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition-colors cursor-pointer shadow-xs"
              >
                {sendingOutbound ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                {sendingOutbound ? 'Dispatching...' : 'Dispatch Outbound Message'}
              </button>
            </div>

            {outboundResult && (
              <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/60 space-y-1 text-xs">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Message Dispatched!</span>
                </div>
                <p className="text-slate-700 text-[11px]">
                  SID: <span className="font-mono">{outboundResult.messageSid}</span> • To: {outboundResult.to}
                  {outboundResult.simulated && ' (Simulated execution because credentials are in test mode)'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Setup Instructions */}
        {activeTab === 'setup' && (
          <div className="space-y-3.5 pt-1 text-xs text-slate-700">
            {/* Webhook endpoint copy */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Your Twilio Inbound Webhook URL
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  readOnly
                  value={webhookFullUrl}
                  className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 font-mono text-slate-800"
                />
                <button
                  type="button"
                  onClick={handleCopyWebhook}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                For local development with actual WhatsApp phone devices, expose your local port with ngrok (<code className="font-mono bg-slate-100 px-1 rounded">ngrok http 5000</code>) and paste the URL in Twilio.
              </p>
            </div>

            {/* Step-by-step instructions */}
            <div className="rounded-xl border border-slate-200 p-3 space-y-2 bg-slate-50/50">
              <h5 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-emerald-600" />
                How to Connect Twilio Sandbox in 2 Minutes:
              </h5>
              <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-600 pl-1 leading-relaxed">
                <li>
                  Open your{' '}
                  <a
                    href="https://console.twilio.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-700 font-semibold underline inline-flex items-center gap-0.5"
                  >
                    Twilio Console <ExternalLink className="w-2.5 h-2.5" />
                  </a>{' '}
                  and navigate to <strong>Messaging &gt; Try it out &gt; Send a WhatsApp message</strong>.
                </li>
                <li>
                  From your WhatsApp phone, message your sandbox join phrase (e.g. <code className="bg-slate-200 px-1 py-0.2 rounded font-mono">join &lt;code&gt;</code>) to <strong className="font-mono text-slate-800">+1 415 523 8886</strong>.
                </li>
                <li>
                  In Twilio Console &gt; Sandbox Settings, set <strong>WHEN A MESSAGE COMES IN</strong> to your Webhook URL with method <strong>HTTP POST</strong>.
                </li>
                <li>
                  Add your <code className="bg-slate-200 px-1 py-0.2 rounded font-mono">TWILIO_ACCOUNT_SID</code> and <code className="bg-slate-200 px-1 py-0.2 rounded font-mono">TWILIO_AUTH_TOKEN</code> to your backend <code className="bg-slate-200 px-1 py-0.2 rounded font-mono">.env</code> file.
                </li>
                <li>
                  Done! Any WhatsApp message from a shopkeeper will be answered in real-time by Paytm AI Sales Agent.
                </li>
              </ol>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-[11px] text-slate-400">
          <span>Paytm Sales AI Teammate • WhatsApp Multi-turn Agent</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-medium cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  )
}
