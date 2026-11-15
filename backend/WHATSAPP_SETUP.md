# WhatsApp — Connect the Paytm AI Sales Bot

The AI bot (Gemini) already works in-app. This webhook connects it to
real WhatsApp, so a shopkeeper can message the bot on WhatsApp and get
the same AI reply, saved in the same `Conversation` in MongoDB.

## What was built (branch `rohit`)

- `GET /webhooks/whatsapp` — Meta verification (`hub.mode` / `hub.verify_token` / `hub.challenge`)
- `POST /webhooks/whatsapp` — incoming Meta Cloud API messages
- `POST /webhooks/whatsapp/twilio` — incoming Twilio WhatsApp Sandbox messages (form-encoded)
- `backend/src/services/whatsappService.js` — Meta parse, phone normalisation,
  Shopkeeper lookup by phone, send via Graph API (`graph.facebook.com/v21.0/<phone-number-id>/messages`)
- `backend/src/services/twilioService.js` — Twilio parse (`From` / `Body` / `MessageSid`),
  TwiML replies, send via Twilio Messages API when configured
- `backend/src/services/whatsappChatService.js` — shared chat core used by
  both providers: opt-in check, find/create Active WhatsApp `Conversation`,
  reuse `generateSalesResponse`, save both messages
- `backend/src/controllers/whatsappController.js` — Meta webhook
- `backend/src/controllers/twilioController.js` — Twilio webhook
- No JWT on the webhooks — Meta / Twilio call them directly. Do not put them behind `/api` auth.

Rules enforced in code:
- Unknown phone number -> ignored, no unsolicited AI reply.
- `whatsappOptIn === false` -> ignored. Opt-in is consent.
- Messages are saved in MongoDB even if the WhatsApp send fails, so a
  human agent can see them in the dashboard.

## 1. Get Meta credentials (10 min)

1. Go to [Meta for Developers](https://developers.facebook.com) > Create App > **Other** > **Business**.
2. In the app: **Add Product > WhatsApp > Set up**.
3. In WhatsApp > API Setup, note:
   - **Phone Number ID**
   - **Temporary access token** (24h, for testing) — later create a permanent
     token in Business Settings > System Users, or use a long-lived user token.
   - The test number Meta gives you (1555...) can receive/send to test phones you add.
4. Add your own phone as a test recipient in API Setup.

## 2. Configure the backend

In `backend/.env`:

```env
WHATSAPP_VERIFY_TOKEN=pick_a_random_secret_string
WHATSAPP_ACCESS_TOKEN=<token from step 1>
WHATSAPP_PHONE_NUMBER_ID=<phone number id from step 1>
WHATSAPP_API_VERSION=v21.0
```

Restart the backend: `npm run dev`

## 3. Make the backend public (webhook needs HTTPS)

Meta cannot call `localhost`. For a hackathon demo:

```bash
ngrok http 5000
# copy the https URL, e.g. https://abcd-1234.ngrok-free.app
```

Your webhook URL is:

```
https://<your-ngrok-domain>/webhooks/whatsapp
```

For production, deploy the backend (Render / Railway / VPS) with HTTPS
and use that domain instead of ngrok.

## 4. Subscribe the webhook in Meta

WhatsApp > Configuration > Webhook > Edit:

- Callback URL: `https://<your-domain>/webhooks/whatsapp`
- Verify token: the same string as `WHATSAPP_VERIFY_TOKEN`
- Click **Verify and save** — Meta calls `GET /webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...`
  and expects the challenge back as plain text.
- Subscribe to **messages** under Webhook fields.

## 5. Test end-to-end

1. In MongoDB, make sure the test shopkeeper exists and has:
   - `phoneNumber` = your test WhatsApp number (e.g. `+91 99999 88888`)
   - `whatsappOptIn: true`
2. From that phone, send a WhatsApp message to the Meta test number, e.g.:
   `Namaste, Soundbox ka price kya hai?`
3. Expected: AI reply in WhatsApp in Hindi/Hinglish, and the same
   conversation appears in the dashboard under Conversations, channel `WhatsApp`.

Quick local test without Meta (no DB / no Gemini needed):

```bash
cd backend
node src/scripts/test_whatsapp_webhook.js
```

It tests phone normalisation, Meta payload parsing, webhook
verification, and that send is safely skipped when not configured.

## Troubleshooting

- **Verify fails (403):** `WHATSAPP_VERIFY_TOKEN` in `.env` must exactly
  match the token you typed in Meta, and the backend must be restarted.
- **No reply, but message is in the dashboard:** WhatsApp send failed —
  check the backend logs for `[whatsapp] Send failed`, and that
  `WHATSAPP_ACCESS_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` are correct.
  A temporary token expires after 24h.
- **No reply and nothing in the dashboard:** check the backend logs for
  `[whatsapp] Ignoring message from unknown number` (phone not in DB)
  or `opted_out` (`whatsappOptIn` is false).
- **Meta says webhook not responding:** your public URL must return 200
  fast. Check `curl https://<domain>/api/health` and ngrok is running.

## Twilio Sandbox — fastest demo (no Meta Business setup)

Use this for the hackathon demo. No Twilio keys are needed in `.env`
for the basic demo — replies are returned as TwiML in the webhook
response and Twilio delivers them.

1. Make a free Twilio account at https://www.twilio.com/try-twilio
2. In Twilio Console: Messaging > Try it out > Send a WhatsApp message.
   Note the Sandbox number `+1 415 523 8886` and your join code, e.g. `join happy-cat`.
3. On your phone, WhatsApp `+1 415 523 8886` and send the join code.
4. Make the backend public (see step 3 above, ngrok):
   ```bash
   ngrok http 5000
   ```
5. In Twilio, set **When a message comes in** to:
   ```
   https://<your-ngrok-domain>/webhooks/whatsapp/twilio
   ```
   Method: POST. Save.
6. Make sure the test shopkeeper exists in the app with:
   - `phoneNumber` = your test WhatsApp number (e.g. `+91 99999 88888`)
   - `whatsappOptIn: true`
7. From that phone, WhatsApp the Sandbox number, e.g.:
   `Namaste, Soundbox ka price kya hai?`
   Expected: AI reply in WhatsApp, and the same conversation in the
   dashboard under Conversations, channel `WhatsApp`.

Optional — send via Twilio Messages API instead of TwiML:
in `backend/.env`, set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`,
`TWILIO_WHATSAPP_FROM=whatsapp:+14155238886`, restart, and the
controller will send via the API and return an empty TwiML response.
Without those keys, it replies via TwiML automatically — no duplicate.

Quick local test without Twilio (no DB / no Gemini needed):

```bash
cd backend
node src/scripts/test_twilio_webhook.js
node src/scripts/test_whatsapp_webhook.js
```

