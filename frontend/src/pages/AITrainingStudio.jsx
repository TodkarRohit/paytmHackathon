import React, { useState, useEffect } from 'react'
import {
  GraduationCap,
  Sparkles,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  Bot,
  User,
  Send,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Briefcase,
  Layers,
  Shield,
  MessageSquare,
  RefreshCw,
  Sliders,
} from 'lucide-react'
import { aiTrainingAPI } from '../services/api'

const PERSONAS = [
  'Consultative & Respectful Assistant',
  'Direct & High-Velocity Closer',
  'Empathetic Shopkeeper Partner',
  'Technical Product Specialist',
]

const ALL_LANGUAGES = [
  'Hindi',
  'Hinglish',
  'English',
  'Tamil',
  'Telugu',
  'Bengali',
  'Marathi',
  'Gujarati',
  'Kannada',
  'Malayalam',
  'Punjabi',
]

export default function AITrainingStudio() {
  const [activeTab, setActiveTab] = useState('profile') // 'profile' | 'products' | 'objections' | 'compliance'
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toastMessage, setToastMessage] = useState(null)

  // Training Configuration State
  const [config, setConfig] = useState({
    brandName: 'MerchantConnect AI',
    industryVertical: 'Retail & Fintech Payment Solutions',
    salesPersona: 'Consultative & Respectful Assistant',
    primaryLanguages: ['Hindi', 'Hinglish', 'English'],
    companyTagline: 'Empowering local Indian merchants with seamless payment intelligence & smart business devices.',
    products: [
      {
        name: 'MerchantConnect Smart Soundbox 4.0',
        description: 'Portable wireless audio payment confirmation device for retail counters.',
        pitchSnippet: 'Hear instant voice payment alerts in Hindi, Hinglish, and regional languages as soon as customer scans your QR code.',
      },
      {
        name: 'All-in-One EDC Card Machine',
        description: 'Debit/Credit card swipe & contactless tap terminal with integrated QR printer.',
        pitchSnippet: 'Accept all Visa, RuPay, Mastercard cards with fast settlement and instant receipt printing.',
      },
    ],
    valuePropositions: [
      'Instant audio payment confirmation in local languages',
      'Protects against fake payment screenshots and digital payment fraud',
      'Zero manual SMS checking during busy counter rush hours',
      'All-in-one payment reconciliation via business app',
    ],
    objectionPlaybook: [
      {
        objection: 'Already have a paper QR standee',
        rebuttal: 'A paper QR only shows static details. During rush hours, customers can show fake screenshots. Our smart audio speaker announces payment receipt aloud immediately so you never lose money.',
      },
      {
        objection: 'Shop is too small or low footfall',
        rebuttal: 'Even for small shops, missing even one ₹500 payment hurts profitability. The smart audio alert frees you from checking your personal phone repeatedly.',
      },
    ],
    complianceRules: [
      'Never invent unverified monthly rental fees or hardware costs without official rate card.',
      'Never make absolute fraud prevention claims (explain that audio alert helps verify receipt immediately).',
      'Always address shopkeepers respectfully with [Name] ji.',
      'If customer requests an on-site visit or customized commercial quote, assign to a field representative.',
    ],
  })

  // New items temp inputs
  const [newProp, setNewProp] = useState('')
  const [newRule, setNewRule] = useState('')
  const [newProduct, setNewProduct] = useState({ name: '', description: '', pitchSnippet: '' })
  const [newObjection, setNewObjection] = useState({ objection: '', rebuttal: '' })

  // Simulation testbench state
  const [simMessage, setSimMessage] = useState('')
  const [simHistory, setSimHistory] = useState([
    {
      role: 'agent',
      message: 'Namaste ji! I am your MerchantConnect AI sales assistant. How can I help your store grow today?',
    },
  ])
  const [simLoading, setSimLoading] = useState(false)

  // Load config from backend
  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await aiTrainingAPI.getConfig()
        if (res.status === 'success' && res.data) {
          setConfig(res.data)
        }
      } catch {
        // Use default config
      } finally {
        setLoading(false)
      }
    }
    loadConfig()
  }, [])

  const triggerToast = (msg, type = 'success') => {
    setToastMessage({ msg, type })
    setTimeout(() => setToastMessage(null), 4000)
  }

  // Save config
  const handleSaveConfig = async () => {
    setSaving(true)
    try {
      const res = await aiTrainingAPI.saveConfig(config)
      if (res.status === 'success') {
        triggerToast('AI Training Knowledge Base saved to database successfully!')
      }
    } catch (err) {
      triggerToast('Saved locally in active session: ' + err.message, 'warning')
    } finally {
      setSaving(false)
    }
  }

  // Reset to default
  const handleResetDefaults = async () => {
    if (!window.confirm('Reset all AI training parameters back to default MerchantConnect AI template?')) return
    setLoading(true)
    try {
      const res = await aiTrainingAPI.reset()
      if (res.status === 'success' && res.data) {
        setConfig(res.data)
        triggerToast('AI Training parameters reset to default template.')
      }
    } catch {
      triggerToast('Reset failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Send simulation message
  const handleSendSimulation = async (e) => {
    e?.preventDefault()
    if (!simMessage.trim() || simLoading) return

    const userText = simMessage.trim()
    const nextHistory = [...simHistory, { role: 'user', message: userText }]
    setSimHistory(nextHistory)
    setSimMessage('')
    setSimLoading(true)

    try {
      const res = await aiTrainingAPI.testChat({
        userMessage: userText,
        history: simHistory,
        trainingConfig: config,
      })
      if (res.status === 'success') {
        setSimHistory([...nextHistory, { role: 'agent', message: res.reply }])
      }
    } catch {
      setSimHistory([
        ...nextHistory,
        {
          role: 'agent',
          message: `Namaste ji! As part of ${config.brandName}, we provide ${config.industryVertical} to ensure instant verified transactions for your business.`,
        },
      ])
    } finally {
      setSimLoading(false)
    }
  }

  // Helper toggle language
  const toggleLanguage = (lang) => {
    const list = config.primaryLanguages || []
    if (list.includes(lang)) {
      if (list.length > 1) {
        setConfig({ ...config, primaryLanguages: list.filter((l) => l !== lang) })
      }
    } else {
      setConfig({ ...config, primaryLanguages: [...list, lang] })
    }
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white text-xs px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 border border-slate-700 animate-in slide-in-from-right-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage.msg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-orange-100 text-orange-600">
              <GraduationCap className="w-5 h-5" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-200/60">
              Sales AI Training Studio
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Train AI For Your Business
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Empower new sales representatives to train the AI model according to your company's brand identity, product catalog, regional sales persona, and objection rebuttals.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleResetDefaults}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Defaults
          </button>
          <button
            type="button"
            onClick={handleSaveConfig}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving to Database...' : 'Save AI Training'}
          </button>
        </div>
      </div>

      {/* Main Grid: Config Tabs on Left, Live Simulation on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Training Configuration (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Navigation Pill Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'profile' ? 'bg-white text-orange-600 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              1. Business Profile & Tone
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('products')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'products' ? 'bg-white text-orange-600 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              2. Products & Pitch Deck
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('objections')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'objections' ? 'bg-white text-orange-600 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              3. Objection Battlecards
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('compliance')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'compliance' ? 'bg-white text-orange-600 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              4. Compliance Rules
            </button>
          </div>

          {/* Tab 1: Business Profile & Persona */}
          {activeTab === 'profile' && (
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 space-y-4 shadow-xs">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-orange-600" />
                Company Brand & Sales Voice
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Brand / Company Name
                  </label>
                  <input
                    type="text"
                    value={config.brandName}
                    onChange={(e) => setConfig({ ...config, brandName: e.target.value })}
                    placeholder="e.g. MerchantConnect AI"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-xs"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    The name the AI uses to introduce itself to merchants.
                  </span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Industry / Vertical
                  </label>
                  <input
                    type="text"
                    value={config.industryVertical}
                    onChange={(e) => setConfig({ ...config, industryVertical: e.target.value })}
                    placeholder="e.g. Retail & Fintech Payment Solutions"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-xs"
                  />
                </div>
              </div>

              <div className="text-xs">
                <label className="block font-semibold text-slate-700 mb-1">
                  Sales Persona & Conversation Style
                </label>
                <select
                  value={config.salesPersona}
                  onChange={(e) => setConfig({ ...config, salesPersona: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-xs cursor-pointer"
                >
                  {PERSONAS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-xs">
                <label className="block font-semibold text-slate-700 mb-1">
                  Company Mission / Pitch Tagline
                </label>
                <textarea
                  rows={2}
                  value={config.companyTagline}
                  onChange={(e) => setConfig({ ...config, companyTagline: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-xs"
                />
              </div>

              <div className="text-xs">
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Languages AI Should Support & Detect
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_LANGUAGES.map((lang) => {
                    const isSelected = (config.primaryLanguages || []).includes(lang)
                    return (
                      <button
                        type="button"
                        key={lang}
                        onClick={() => toggleLanguage(lang)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-orange-50 text-orange-700 border-orange-300 font-semibold'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {lang}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Products & Value Propositions */}
          {activeTab === 'products' && (
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 space-y-5 shadow-xs text-xs">
              <div>
                <h2 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-orange-600" />
                  Your Products & Pitch Snippets
                </h2>
                <p className="text-slate-500 text-[11px]">
                  Add the exact products your sales representatives want the AI to pitch during WhatsApp/Phone outreach.
                </p>
              </div>

              {/* Product list */}
              <div className="space-y-3">
                {(config.products || []).map((prod, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <span className="font-bold text-slate-900 text-xs block">{prod.name}</span>
                      <p className="text-slate-600 text-[11px]">{prod.description}</p>
                      <p className="text-orange-700 font-medium text-[11px] bg-orange-50 p-1.5 rounded border border-orange-200/60 mt-1">
                        <strong>Pitch:</strong> "{prod.pitchSnippet}"
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setConfig({
                          ...config,
                          products: config.products.filter((_, i) => i !== idx),
                        })
                      }
                      className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                      title="Remove product"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add product box */}
              <div className="p-3.5 border border-dashed border-slate-300 rounded-lg space-y-2.5 bg-slate-50/30">
                <span className="font-semibold text-slate-800 text-[11px] block">+ Add New Product Offering</span>
                <input
                  type="text"
                  placeholder="Product Name (e.g. Smart Dynamic QR Display)"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded border border-slate-200 bg-white"
                />
                <input
                  type="text"
                  placeholder="Brief description (e.g. Counter display with real-time dynamic UPI QR)"
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded border border-slate-200 bg-white"
                />
                <input
                  type="text"
                  placeholder="Pitch Snippet (What the AI tells the merchant in 1 sentence)"
                  value={newProduct.pitchSnippet}
                  onChange={(e) => setNewProduct({ ...newProduct, pitchSnippet: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded border border-slate-200 bg-white"
                />
                <button
                  type="button"
                  disabled={!newProduct.name.trim()}
                  onClick={() => {
                    if (!newProduct.name.trim()) return
                    setConfig({
                      ...config,
                      products: [...(config.products || []), newProduct],
                    })
                    setNewProduct({ name: '', description: '', pitchSnippet: '' })
                  }}
                  className="px-3 py-1.5 rounded bg-orange-600 text-white text-xs font-semibold hover:bg-orange-700 disabled:opacity-40 cursor-pointer"
                >
                  Add Product to AI Catalog
                </button>
              </div>

              {/* Core Value Props */}
              <div className="pt-2">
                <span className="font-semibold text-slate-800 text-xs block mb-1.5">
                  Core Value Propositions
                </span>
                <div className="flex flex-wrap gap-2 mb-2">
                  {(config.valuePropositions || []).map((vp, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-[11px]"
                    >
                      {vp}
                      <button
                        type="button"
                        onClick={() =>
                          setConfig({
                            ...config,
                            valuePropositions: config.valuePropositions.filter((_, i) => i !== idx),
                          })
                        }
                        className="text-slate-400 hover:text-slate-700 ml-1 cursor-pointer"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add a core value proposition (e.g. Low 0% settlement fee on RuPay)..."
                    value={newProp}
                    onChange={(e) => setNewProp(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded border border-slate-200 text-xs bg-white"
                  />
                  <button
                    type="button"
                    disabled={!newProp.trim()}
                    onClick={() => {
                      if (!newProp.trim()) return
                      setConfig({
                        ...config,
                        valuePropositions: [...(config.valuePropositions || []), newProp.trim()],
                      })
                      setNewProp('')
                    }}
                    className="px-3 py-1.5 bg-slate-800 text-white rounded text-xs font-semibold hover:bg-slate-900 disabled:opacity-40 cursor-pointer"
                  >
                    + Add
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Objection Battlecards */}
          {activeTab === 'objections' && (
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 space-y-4 shadow-xs text-xs">
              <div>
                <h2 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-orange-600" />
                  Objection Handling Battlecards
                </h2>
                <p className="text-slate-500 text-[11px]">
                  Teach the AI how to respond when a customer pushes back, complains, or raises concerns.
                </p>
              </div>

              {/* Objections List */}
              <div className="space-y-3">
                {(config.objectionPlaybook || []).map((item, idx) => (
                  <div key={idx} className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-rose-700 text-xs flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        When Customer Says: "{item.objection}"
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setConfig({
                            ...config,
                            objectionPlaybook: config.objectionPlaybook.filter((_, i) => i !== idx),
                          })
                        }
                        className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="p-2.5 bg-white rounded border border-slate-200 text-slate-800 text-[11px] leading-relaxed">
                      <strong className="text-emerald-700 block mb-0.5">Trained AI Rebuttal:</strong>
                      {item.rebuttal}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Objection Form */}
              <div className="p-3.5 border border-dashed border-slate-300 rounded-lg space-y-2 bg-slate-50/50">
                <span className="font-semibold text-slate-800 text-[11px] block">+ Add Custom Objection & Rebuttal</span>
                <input
                  type="text"
                  placeholder="Customer Objection (e.g. Device rental fee is too high)"
                  value={newObjection.objection}
                  onChange={(e) => setNewObjection({ ...newObjection, objection: e.target.value })}
                  className="w-full px-3 py-1.5 rounded border border-slate-200 text-xs bg-white"
                />
                <textarea
                  rows={2}
                  placeholder="Trained AI Rebuttal (How the AI politely reframes the objection)"
                  value={newObjection.rebuttal}
                  onChange={(e) => setNewObjection({ ...newObjection, rebuttal: e.target.value })}
                  className="w-full px-3 py-1.5 rounded border border-slate-200 text-xs bg-white"
                />
                <button
                  type="button"
                  disabled={!newObjection.objection.trim() || !newObjection.rebuttal.trim()}
                  onClick={() => {
                    if (!newObjection.objection.trim()) return
                    setConfig({
                      ...config,
                      objectionPlaybook: [...(config.objectionPlaybook || []), newObjection],
                    })
                    setNewObjection({ objection: '', rebuttal: '' })
                  }}
                  className="px-3.5 py-1.5 rounded bg-orange-600 text-white font-semibold text-xs hover:bg-orange-700 disabled:opacity-40 cursor-pointer"
                >
                  Save Battlecard
                </button>
              </div>
            </div>
          )}

          {/* Tab 4: Compliance & Guardrails */}
          {activeTab === 'compliance' && (
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 space-y-4 shadow-xs text-xs">
              <div>
                <h2 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-orange-600" />
                  Compliance Guardrails & Prohibited Claims
                </h2>
                <p className="text-slate-500 text-[11px]">
                  Strict instructions preventing the AI from hallucinating pricing, making illegal guarantees, or misrepresenting terms.
                </p>
              </div>

              <div className="space-y-2">
                {(config.complianceRules || []).map((rule, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between gap-3 text-[11px]"
                  >
                    <span className="text-slate-800 leading-snug flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                      {rule}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setConfig({
                          ...config,
                          complianceRules: config.complianceRules.filter((_, i) => i !== idx),
                        })
                      }
                      className="text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <input
                  type="text"
                  placeholder="Add a compliance directive (e.g. Always disclose that loans require KYC approval)..."
                  value={newRule}
                  onChange={(e) => setNewRule(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded border border-slate-200 text-xs bg-white"
                />
                <button
                  type="button"
                  disabled={!newRule.trim()}
                  onClick={() => {
                    if (!newRule.trim()) return
                    setConfig({
                      ...config,
                      complianceRules: [...(config.complianceRules || []), newRule.trim()],
                    })
                    setNewRule('')
                  }}
                  className="px-3.5 py-1.5 bg-slate-800 text-white rounded text-xs font-semibold hover:bg-slate-900 disabled:opacity-40 cursor-pointer"
                >
                  + Add Rule
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Live Simulation Test Bench (5 cols) */}
        <div className="lg:col-span-5 flex flex-col h-full">
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs flex flex-col h-[580px] overflow-hidden">
            {/* Simulation Header */}
            <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-xs font-bold text-slate-900">
                  Live AI Simulation Test Bench
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                Trained: {config.brandName}
              </span>
            </div>

            {/* Simulation Message Log */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-100/60 text-xs">
              {simHistory.map((turn, idx) => {
                const isAgent = turn.role === 'agent'
                return (
                  <div key={idx} className={`flex flex-col ${isAgent ? 'items-start' : 'items-end'}`}>
                    <span className="text-[10px] text-slate-400 mb-0.5 px-1 font-medium">
                      {isAgent ? config.brandName : 'Merchant (You)'}
                    </span>
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2 leading-relaxed text-xs shadow-xs ${
                        isAgent
                          ? 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs'
                          : 'bg-orange-600 text-white rounded-tr-xs'
                      }`}
                    >
                      {turn.message}
                    </div>
                  </div>
                )
              })}

              {simLoading && (
                <div className="flex items-center gap-2 text-slate-500 text-xs italic p-1">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-orange-600" />
                  Generating response using trained business parameters...
                </div>
              )}
            </div>

            {/* Quick Test Prompt Pills */}
            <div className="px-3 py-2 bg-slate-50 border-t border-slate-200 flex items-center gap-1.5 overflow-x-auto text-[11px]">
              <span className="text-[10px] font-bold text-slate-400 shrink-0 uppercase">Try:</span>
              <button
                type="button"
                onClick={() => setSimMessage('Aapka device kitne ka padega?')}
                className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600 hover:text-slate-900 whitespace-nowrap cursor-pointer text-[10px]"
              >
                "Device kitne ka hai?"
              </button>
              <button
                type="button"
                onClick={() => setSimMessage('Pehle se QR standee hai, iski kya zaroorat hai?')}
                className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600 hover:text-slate-900 whitespace-nowrap cursor-pointer text-[10px]"
              >
                "Pehle se QR hai"
              </button>
              <button
                type="button"
                onClick={() => setSimMessage('Meri shop choti hai, mujhe nahi chahiye')}
                className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600 hover:text-slate-900 whitespace-nowrap cursor-pointer text-[10px]"
              >
                "Choti shop hai"
              </button>
            </div>

            {/* Simulation Input */}
            <form onSubmit={handleSendSimulation} className="p-3 border-t border-slate-200 bg-white flex items-center gap-2">
              <input
                type="text"
                placeholder="Ask or raise an objection as a shopkeeper..."
                value={simMessage}
                onChange={(e) => setSimMessage(e.target.value)}
                className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
              <button
                type="submit"
                disabled={!simMessage.trim() || simLoading}
                className="px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold disabled:opacity-40 cursor-pointer transition-colors flex items-center gap-1"
              >
                <Send className="w-3.5 h-3.5" />
                Test
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
