# Kyron Medical — AI Patient Portal

> Full-stack AI-powered patient scheduling system with voice handoff capability.
> Built by **Abdullah Basarvi** | March 2026

**Live Site:** https://kyron-medical-project.abdullahbasarvi.com  
**GitHub:** https://github.com/abdullahbasarvi/kyron-medical-project

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Features](#features)
3. [Tech Stack](#tech-stack)
4. [Project Structure](#project-structure)
5. [Getting Started](#getting-started)
6. [Environment Variables](#environment-variables)
7. [How It Works](#how-it-works)
8. [Workflows](#workflows)
9. [Voice Handoff](#voice-handoff)
10. [Deployment](#deployment)
11. [Known Limitations](#known-limitations)

---

## Project Overview

Kyron Medical is a patient-facing web app built for physician groups. Patients interact with an AI care coordinator via a real-time chat interface and can seamlessly hand off the conversation to a live voice call — retaining full context.

The system handles four core workflows:
- Appointment scheduling with semantic doctor matching
- Prescription refill requests
- Office hours and location lookup
- General practice questions

---

## Features

| Feature | Status | Notes |
|---|---|---|
| Patient intake form | ✅ Working | Name, DOB, phone, email, reason, SMS opt-in |
| Claude-powered chat | ✅ Working | Full conversation memory per session |
| Semantic doctor matching | ✅ Working | Keyword-based matching across 4 specialists |
| Appointment slot cards | ✅ Working | Clickable, filterable by day |
| Appointment booking | ✅ Working | Confirmation ID generated |
| Email confirmation | ✅ Working | Sent via Resend on booking |
| Prescription refill workflow | ✅ Working | Collects med, doctor, pharmacy — sends email |
| Office hours & locations | ✅ Working | Both locations with hours |
| Switch to Voice (web) | ✅ Working | Vapi SDK in-browser with full chat context |
| Outbound phone call | ✅ Working | Vapi REST API, calls patient's phone |
| Voice appointment booking | ✅ Working | Vapi tool calling hits /api/book |
| SMS confirmation | ⚠️ Partial | Code complete, Twilio trial restriction on unverified numbers |
| Call-back memory | 🔜 Planned | Session store exists, webhook in place |

---

## Tech Stack

| Technology | Role | Why |
|---|---|---|
| React + Vite | Frontend | Fast dev, clean component model |
| Node.js + Express | Backend API | Lightweight, async, same language stack |
| Claude (Anthropic) | AI brain | Best instruction-following for complex multi-workflow prompts, strong safety defaults |
| Vapi.ai | Voice AI | Only platform with browser SDK + outbound calls + tool calling |
| Resend | Email | Modern API, 2-min setup, free tier |
| Twilio | SMS | Industry standard, opt-in captured at intake |
| nginx | Web server | Serves static build, proxies /api to Node |
| PM2 | Process manager | Auto-restart on crash or reboot |
| certbot | SSL | Let's Encrypt HTTPS |
| Hostinger VPS | Hosting | Ubuntu VPS, full control |

---

## Project Structure

```
kyron-medical/
├── client/                         # React frontend (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── App.jsx             # Root — intake vs chat state
│   │   │   ├── BackgroundCanvas.jsx # Animated orb background
│   │   │   ├── Header.jsx          # Logo, status badge
│   │   │   ├── IntakeForm.jsx      # Patient intake with validation
│   │   │   ├── ChatInterface.jsx   # Main chat container
│   │   │   ├── MessageList.jsx     # Messages + slot cards
│   │   │   ├── ChatInput.jsx       # Textarea + send button
│   │   │   ├── VoiceButton.jsx     # Vapi web + outbound phone call
│   │   │   └── AppointmentCard.jsx # Booking confirmation card
│   │   └── index.css               # Liquid glass design system
│   ├── .env                        # VITE_VAPI_PUBLIC_KEY, VITE_VAPI_ASSISTANT_ID
│   └── vite.config.js              # Vite + /api proxy to localhost:4000
│
└── server/
    ├── index.js                    # Express API — all routes + AI + notifications
    └── .env                        # API keys
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### 1. Clone the repo

```bash
git clone https://github.com/abdullahbasarvi/kyron-medical-project.git
cd kyron-medical-project
```

### 2. Install dependencies

```bash
# Client
cd client && npm install

# Server
cd ../server && npm install
```

### 3. Set up environment variables

```bash
cp client/.env.example client/.env
cp server/.env.example server/.env
# Fill in your keys — see Environment Variables section below
```

### 4. Run locally

```bash
# Terminal 1 — backend
cd server && node --watch index.js

# Terminal 2 — frontend
cd client && npm run dev
```

Open http://localhost:5173

---

## Environment Variables

### `client/.env`

```env
VITE_VAPI_PUBLIC_KEY=your_vapi_public_key
VITE_VAPI_ASSISTANT_ID=your_vapi_assistant_id
```

### `server/.env`

```env
# Required
ANTHROPIC_API_KEY=sk-ant-...

# Email (resend.com — free tier)
RESEND_API_KEY=re_...

# Voice (dashboard.vapi.ai)
VAPI_PRIVATE_KEY=...
VAPI_PHONE_NUMBER_ID=...
VAPI_ASSISTANT_ID=...

# SMS (twilio.com)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...

# Deployment
SERVER_URL=https://kyron-medical-project.abdullahbasarvi.com
PORT=4000
```

---

## How It Works

### Patient Intake
Patient fills in name, DOB, phone, email, reason for visit, and SMS opt-in. On submit, the patient object is passed as props into the chat interface and included in every API request so Claude always has full context.

### Claude Integration
Every message hits `POST /api/chat`. The server builds a system prompt injecting patient data, practice info, all four specialists with their keywords, and four explicit workflow instructions. Claude returns natural language with embedded intent tags like `[SHOW_SLOTS:dr-chen]`, `[BOOK:dr-chen:date:time]`, and `[REFILL:medication:doctor:pharmacy]`. The `parseIntent()` function extracts these with regex, strips them from the clean text, and returns structured data alongside the message.

### Doctor Matching
Each doctor has a keyword array. When a patient describes their symptoms, Claude includes the matching doctor's `[SHOW_SLOTS:]` tag in its response. If no doctor matches, Claude tells the patient the practice does not treat that area.

### Availability
Slots are generated on server start using a seeded random function — stable across restarts, realistic-feeling schedules with vacation weeks built in. Each doctor has different days of the week and time slots.

---

## Workflows

### 1. Appointment Scheduling
1. Patient describes symptom
2. Claude matches to specialist, responds with `[SHOW_SLOTS:doctor-id]`
3. Frontend renders clickable slot cards
4. Patient clicks a slot or asks "do you have a Tuesday?" — Claude filters with `[FILTER_SLOTS:doctor-id:tuesday]`
5. Patient confirms — Claude responds with `[BOOK:doctor-id:date:time]`
6. Server sends email + SMS confirmation

### 2. Prescription Refill
1. Patient mentions a refill
2. Claude collects: medication name, prescribing doctor (must be one of our four), pharmacy
3. Once all three collected, Claude includes `[REFILL:medication:doctor:pharmacy]`
4. Server sends refill confirmation email to patient

### 3. Office Hours & Locations
Patient asks about hours or address — Claude responds directly from practice data in the system prompt.

### 4. General Questions
Any question about the practice, doctors, or specialties — Claude answers from the system prompt or redirects to the practice phone number.

---

## Voice Handoff

### Switch to Voice (Web Call)
- Vapi SDK runs entirely in the browser
- On click, `getContextSummary()` builds a system prompt from chat history + all available slots for all four doctors
- `vapi.start()` is called with the full context injected
- The AI picks up exactly where the chat left off
- Tool calling: `bookAppointment` function defined inline — when the AI wants to book, it calls the tool, the `message` event listener intercepts it, hits `POST /api/book`, sends the tool result back to Vapi

### Call My Phone (Outbound)
- Patient clicks the phone icon
- Frontend hits `POST /api/call/outbound` with patient data + context summary
- Server calls Vapi's REST API to initiate an outbound call to the patient's number
- Same assistant config, same context — includes all slots and the `bookAppointment` tool
- Tool calls during phone calls are handled by `POST /api/vapi/webhook` (server-side)
- Webhook requires a public URL — set `SERVER_URL` in `.env`

---

## Deployment

The app is deployed on a Hostinger VPS running Ubuntu.

### Architecture

```
Internet → nginx (port 443, HTTPS)
              ├── /          → /root/kyron-medical-project/client/dist (static)
              └── /api       → localhost:4000 (Node.js via PM2)
```

### Deploy steps

```bash
# On VPS
git clone https://github.com/abdullahbasarvi/kyron-medical-project.git
cd kyron-medical-project

# Install and build
cd client && npm install && npm run build
cd ../server && npm install

# Start server
pm2 start index.js --name kyron-server
pm2 save && pm2 startup

# nginx + SSL
sudo apt install -y nginx certbot python3-certbot-nginx
# configure /etc/nginx/sites-available/kyron-medical-project
sudo certbot --nginx -d kyron-medical-project.abdullahbasarvi.com
```

### Updating the app

```bash
git pull
cd client && npm run build   # rebuild frontend
pm2 restart kyron-server     # restart backend
```

---

## Known Limitations

- **SMS on trial Twilio** — requires verified numbers. Works in production with a paid account.
- **No database** — appointments are not persisted across server restarts. Sufficient for demo; production would use PostgreSQL.
- **Call-back memory** — the session store and webhook are in place but full call-back context retrieval is not yet wired end-to-end.
- **Outbound calls need public URL** — `SERVER_URL` must be a reachable domain for Vapi webhooks. Works fine on the deployed VPS.

---

## Safety

The voice AI and chat AI are both instructed to never:
- Provide medical advice, diagnoses, or treatment recommendations
- Comment on medications or dosages
- Say anything misleading about health outcomes

All emergency situations are redirected to 911.