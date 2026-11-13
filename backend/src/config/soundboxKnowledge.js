/**
 * Verified Paytm Soundbox Knowledge Base
 * 
 * STRICT COMPLIANCE RULES:
 * 1. Only verified facts confirmed in the project are included.
 * 2. Exact pricing, rental numbers, and promotions are explicitly marked as UNAVAILABLE.
 * 3. The AI agent must never invent fees, discounts, or hardware specs.
 * 4. Absolute claims (e.g. "100% sure", "prevents all fraud") are strictly prohibited.
 */

export const VERIFIED_SOUNDBOX_KNOWLEDGE = {
  product: {
    name: 'Paytm Soundbox',
    primaryPurpose: 'Instant audio confirmation of UPI payments for retail merchants.',
    supportedPaymentMethods: [
      'Paytm QR',
      'Google Pay',
      'PhonePe',
      'BHIM UPI',
      'Any UPI-enabled banking app',
    ],
    supportedLanguages: [
      'English',
      'Hindi',
      'Tamil',
      'Telugu',
      'Kannada',
      'Malayalam',
      'Bengali',
      'Gujarati',
      'Punjabi',
      'Odia',
      'Marathi',
    ],
    keyBenefits: [
      'Instant audio voice alert upon receiving payment.',
      'Helps protect merchants against fake "Payment Successful" screenshots by providing an audible payment confirmation; merchants can verify transactions on the Paytm for Business app for large or disputed amounts.',
      'Merchants do not need to check SMS or unlock their personal phone during busy hours.',
      'Loud, clear speaker suited for noisy market environments.',
    ],
  },

  productCatalog: [
    'Paytm Soundbox',
    'Paytm Music Soundbox',
    'Paytm NFC Card Soundbox',
    'Paytm EDC Card Machine',
    'Paytm Dynamic QR',
    'Paytm Merchant Loan',
  ],

  // Facts explicitly forbidden from being invented
  unverifiedInformationPolicy: {
    pricing: 'UNAVAILABLE: Do not invent monthly rental fees, purchase prices, or deposits. Official pricing, rental plans, and promotional fee waivers should be confirmed through an authorized Paytm sales representative or the Paytm for Business app. I do not want to give you an incorrect price.',
    promotions: 'UNAVAILABLE: Do not invent zero-cost trials, cashbacks, or limited-time promotional discounts.',
    hardwareSpecs: 'UNAVAILABLE: Do not invent battery mAh, cellular band technical details, or internal chip specs unless officially documented.',
    guarantees: 'UNAVAILABLE: Do not make binding legal promises or loan approval guarantees.',
  },

  // Objection Handling Playbook
  objectionGuidelines: [
    {
      objection: 'Already have a QR standee',
      rebuttal:
        'A paper QR only displays a static code, making it difficult to detect fake payment screenshots during rush hours. The Soundbox announces payment receipt aloud instantly so you do not have to rely only on customer screens. For large or disputed transactions, merchants can always verify immediately in the Paytm for Business app.',
    },
    {
      objection: 'Shop is too small or low footfall',
      rebuttal:
        'Even for smaller shops, missing or disputed payments cost time and money. The Soundbox makes digital transactions effortless and builds trust with customers who hear their payment announced.',
    },
    {
      objection: 'Language barrier',
      rebuttal:
        'The Soundbox supports 11 Indian languages (including Hindi, English, Tamil, Telugu, Kannada, Malayalam, Bengali, Gujarati, Punjabi, Odia, and Marathi), so voice alerts can play in the language you and your staff are most comfortable with.',
    },
    {
      objection: 'Pricing and cost inquiries',
      rebuttal:
        'Official pricing, rental plans, and promotional fee waivers should be confirmed through an authorized Paytm sales representative or the Paytm for Business app. I do not want to give you an incorrect price.',
    },
  ],
}

export default VERIFIED_SOUNDBOX_KNOWLEDGE
