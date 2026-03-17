import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import Anthropic from '@anthropic-ai/sdk'
import { Resend } from 'resend'
import pkg from 'twilio'
const { Twilio } = pkg

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const resend = new Resend(process.env.RESEND_API_KEY)
const twilioClient = new Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)

// ── Doctor data ──────────────────────────────────────────────────────────────

const DOCTORS = [
  {
    id: 'dr-chen',
    name: 'Dr. Sarah Chen',
    specialty: 'Orthopedic Surgery',
    keywords: ['bone','joint','knee','hip','shoulder','spine','back','wrist','ankle','fracture','muscle','tendon','ligament','sports','arthritis','elbow'],
  },
  {
    id: 'dr-patel',
    name: 'Dr. Raj Patel',
    specialty: 'Cardiology',
    keywords: ['heart','chest','cardiac','palpitation','blood pressure','hypertension','cholesterol','artery','cardiovascular','shortness of breath','angina'],
  },
  {
    id: 'dr-okonkwo',
    name: 'Dr. Amara Okonkwo',
    specialty: 'Neurology',
    keywords: ['brain','head','headache','migraine','nerve','seizure','stroke','memory','dizziness','vertigo','numbness','tingling','tremor','cognitive'],
  },
  {
    id: 'dr-morgan',
    name: 'Dr. James Morgan',
    specialty: 'Gastroenterology',
    keywords: ['stomach','gut','digestive','abdomen','bowel','colon','liver','gallbladder','acid reflux','heartburn','ibs','nausea','bloating','constipation','diarrhea'],
  },
]

function generateAvailability(doctorId) {
  const slots = []
  const today = new Date()
  const schedules = {
    'dr-chen':    { days: [1,3,5], times: ['9:00 AM','10:30 AM','2:00 PM','3:30 PM'],           skipWeeks: [2] },
    'dr-patel':   { days: [1,2,4], times: ['8:00 AM','9:30 AM','11:00 AM','1:30 PM','3:00 PM'], skipWeeks: [] },
    'dr-okonkwo': { days: [2,3,5], times: ['10:00 AM','11:30 AM','2:30 PM','4:00 PM'],          skipWeeks: [4] },
    'dr-morgan':  { days: [1,3,4], times: ['8:30 AM','10:00 AM','1:00 PM','2:30 PM','4:00 PM'], skipWeeks: [] },
  }
  const s = schedules[doctorId]
  let seed = doctorId.charCodeAt(3)
  const rand = () => { seed = (seed * 1664525 + 1013904223) & 0xffffffff; return Math.abs(seed) / 0xffffffff }

  for (let d = 3; d <= 60; d++) {
    const date = new Date(today)
    date.setDate(today.getDate() + d)
    const dow = date.getDay()
    const week = Math.floor(d / 7)
    if (!s.days.includes(dow)) continue
    if (s.skipWeeks.includes(week)) continue
    const daySlots = [...s.times].sort(() => rand() - 0.5).slice(0, Math.floor(rand() * 2) + 2)
    daySlots.forEach(time => slots.push({
      date: date.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' }),
      time,
      doctorId,
    }))
  }
  return slots
}

const AVAILABILITY = {}
DOCTORS.forEach(doc => { AVAILABILITY[doc.id] = generateAvailability(doc.id) })

const PRACTICE = {
  phone: '(415) 555-0190',
  locations: [
    { name: 'Main Campus',        address: '450 Pacific Medical Plaza, San Francisco, CA 94115', hours: 'Mon–Fri: 8:00 AM – 6:00 PM | Sat: 9:00 AM – 1:00 PM' },
    { name: 'Mission Bay Clinic', address: '1855 4th Street, Suite 200, San Francisco, CA 94158', hours: 'Mon–Thu: 9:00 AM – 5:00 PM | Fri: 9:00 AM – 3:00 PM' },
  ],
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getSlots(doctorId, limit = 6) {
  return (AVAILABILITY[doctorId] || []).slice(0, limit)
}

function getSlotsByDay(doctorId, day) {
  return (AVAILABILITY[doctorId] || [])
    .filter(s => s.date.toLowerCase().includes(day.toLowerCase()))
    .slice(0, 4)
}

function parseIntent(text, patient) {
  const result = { cleanText: text, slots: null, doctor: null, appointment: null, refill: null }

  const refillMatch = text.match(/\[REFILL:([^:]+):([^:]+):([^\]]+)\]/)
  const bookMatch   = text.match(/\[BOOK:\s*([a-z-]+)\s*:\s*([^:\]]+?)\s*:\s*([^\]]+?)\s*\]/)
  const filterMatch = text.match(/\[FILTER_SLOTS:([a-z-]+):([a-z]+)\]/)
  const showMatch   = text.match(/\[SHOW_SLOTS:([a-z-]+)\]/)

  if (refillMatch) {
    const [, medication, doctor, pharmacy] = refillMatch
    result.refill = { medication: medication.trim(), doctor: doctor.trim(), pharmacy: pharmacy.trim() }
    result.cleanText = text.replace(/\[REFILL:[^\]]+\]/, '').trim()
    return result
  }

  if (bookMatch) {
    const [, doctorId, date, time] = bookMatch
    const doctor = DOCTORS.find(d => d.id === doctorId)
    result.appointment = {
      confirmationId: `KM${Date.now().toString(36).toUpperCase()}`,
      doctorName: doctor?.name,
      specialty: doctor?.specialty,
      date: date.trim(),
      time: time.trim(),
      patient,
    }
    result.doctor = doctor
    result.cleanText = text.replace(/\[BOOK:[^\]]+\]/, '').trim()
    return result
  }

  if (filterMatch) {
    const [, doctorId, day] = filterMatch
    result.slots = getSlotsByDay(doctorId, day)
    result.doctor = DOCTORS.find(d => d.id === doctorId)
    result.cleanText = text.replace(/\[FILTER_SLOTS:[^\]]+\]/, '').trim()
    return result
  }

  if (showMatch) {
    const doctorId = showMatch[1]
    result.slots = getSlots(doctorId)
    result.doctor = DOCTORS.find(d => d.id === doctorId)
    result.cleanText = text.replace(/\[SHOW_SLOTS:[^\]]+\]/, '').trim()
    return result
  }

  return result
}

// ── System prompt ─────────────────────────────────────────────────────────────

function buildSystemPrompt(patient) {
  const docs = DOCTORS.map(d => `- ${d.name} (${d.specialty}): ${d.keywords.slice(0,5).join(', ')}`).join('\n')
  const locs = PRACTICE.locations.map(l => `- ${l.name}: ${l.address} | ${l.hours}`).join('\n')

  return `You are Kyron, an AI care coordinator for Kyron Medical Group. Be warm, professional, and concise.

PATIENT:
- Name: ${patient.firstName} ${patient.lastName}
- DOB: ${patient.dob}
- Phone: ${patient.phone}
- Email: ${patient.email}
- Reason: ${patient.reason}

PRACTICE:
Phone: ${PRACTICE.phone}
${locs}

SPECIALISTS:
${docs}

WORKFLOW 1 — APPOINTMENT SCHEDULING:
- Match the patient's concern to a specialist using their keywords
- If matched, include [SHOW_SLOTS:doctor-id] in your reply to display available times
- If patient asks for a specific day (e.g. "do you have a Tuesday?"), include [FILTER_SLOTS:doctor-id:tuesday]
- When patient confirms a slot, you MUST include [BOOK:doctor-id:date:time] in your reply with the EXACT date and time string the patient selected. Example: [BOOK:dr-chen:Wednesday, March 19, 2026:10:30 AM]
- Never paraphrase the date or time — copy it exactly as shown in the slot.
- If no specialist matches, say the practice does not treat that area

WORKFLOW 2 — PRESCRIPTION REFILL:
- Ask for these THREE pieces of information one at a time if not already provided:
  1. Medication name and dosage
  2. Prescribing doctor — MUST be one of our specialists: Dr. Sarah Chen, Dr. Raj Patel, Dr. Amara Okonkwo, or Dr. James Morgan
  3. Preferred pharmacy name and address
- If the prescribing doctor is NOT one of our four specialists, stop and say: "I can only process refill requests for medications prescribed by our doctors. Please contact your prescribing doctor's office directly."
- Do NOT include the [REFILL:...] tag until you have ALL THREE pieces of information confirmed by the patient
- Once you have all three confirmed, include EXACTLY this format in your reply: [REFILL:medication:doctor:pharmacy]
- Example: [REFILL:Lisinopril 10mg:Dr. Sarah Chen:CVS Pharmacy 123 Main St]
- After the tag say: "Your refill request has been submitted. The prescribing doctor will review it within 1-2 business days and send it to your pharmacy."

WORKFLOW 3 — OFFICE HOURS & LOCATIONS:
- If the patient asks about hours, address, location, or directions, respond with the practice information above
- Be specific — give the address and hours for the location most relevant to their question
- If they ask generally, list both locations

WORKFLOW 4 — GENERAL QUESTIONS:
- Answer questions about the practice, doctors, specialties, and services
- For anything outside your knowledge say: "For more details, please call us at ${PRACTICE.phone}"

SAFETY — NEVER:
- Provide medical advice, diagnoses, or treatment recommendations
- Comment on medications, dosages, or drug interactions beyond acknowledging a refill request
- If asked, say: "I'm not able to provide medical advice. Please speak directly with your doctor."
- For emergencies: "If this is a medical emergency, please call 911 immediately."

Keep replies to 2–4 sentences unless showing slots or collecting information. No filler like "Certainly!" or "Of course!".`
}

// ── Notifications ─────────────────────────────────────────────────────────────

async function sendConfirmationEmail(appointment) {
  try {
    await resend.emails.send({
      from: 'Kyron Medical <appointments@abdullahbasarvi.com>',
      to: appointment.patient.email,
      subject: `Appointment Confirmed — ${appointment.date} at ${appointment.time}`,
      html: `
        <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 32px;">
          <div style="background: linear-gradient(135deg, #0f3460, #16213e); padding: 24px; border-radius: 12px; margin-bottom: 24px;">
            <h1 style="color: #5ee7c4; margin: 0; font-size: 22px;">Kyron Medical Group</h1>
            <p style="color: rgba(255,255,255,0.6); margin: 4px 0 0; font-size: 13px;">Appointment Confirmation</p>
          </div>
          <p style="font-size: 16px;">Hi <strong>${appointment.patient.firstName}</strong>,</p>
          <p>Your appointment has been confirmed:</p>
          <div style="background: #f8fafc; border-radius: 10px; padding: 20px; margin: 20px 0; border-left: 4px solid #5ee7c4;">
            <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
              <tr><td style="color: #64748b; padding: 6px 0; width: 120px;">Doctor</td><td style="font-weight: 600;">${appointment.doctorName}</td></tr>
              <tr><td style="color: #64748b; padding: 6px 0;">Specialty</td><td>${appointment.specialty}</td></tr>
              <tr><td style="color: #64748b; padding: 6px 0;">Date</td><td style="font-weight: 600;">${appointment.date}</td></tr>
              <tr><td style="color: #64748b; padding: 6px 0;">Time</td><td style="font-weight: 600;">${appointment.time}</td></tr>
              <tr><td style="color: #64748b; padding: 6px 0;">Confirmation #</td><td style="font-family: monospace; color: #5ee7c4;">${appointment.confirmationId}</td></tr>
            </table>
          </div>
          <p style="font-size: 14px; color: #64748b;">
            To reschedule or cancel, call us at <strong>(415) 555-0190</strong> at least 24 hours in advance.
          </p>
          <p style="font-size: 13px; color: #94a3b8; margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
            Kyron Medical Group · 450 Pacific Medical Plaza, San Francisco, CA 94115
          </p>
        </div>
      `,
    })
  } catch (err) {
    console.error('Email error:', err)
  }
}

async function sendConfirmationSMS(appointment) {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_PHONE_NUMBER) return
  if (!appointment.patient.smsOptIn) return

  try {
    const phone = '+1' + appointment.patient.phone.replace(/\D/g, '').slice(-10)
    // console.log('Sending SMS to:', phone)
    await twilioClient.messages.create({
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
      body: `Kyron Medical: Appointment confirmed!
Doctor: ${appointment.doctorName}
Date: ${appointment.date}
Time: ${appointment.time}
Confirmation #: ${appointment.confirmationId}
Questions? Call (415) 555-0190.`,
    })
  } catch (err) {
    console.error('SMS error:', err)
  }
}

async function sendRefillEmail(refill, patient) {
  try {
    await resend.emails.send({
      from: 'Kyron Medical <appointments@abdullahbasarvi.com>',
      to: patient.email,
      subject: `Prescription Refill Request Received — ${refill.medication}`,
      html: `
        <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 32px;">
          <div style="background: linear-gradient(135deg, #0f3460, #16213e); padding: 24px; border-radius: 12px; margin-bottom: 24px;">
            <h1 style="color: #5ee7c4; margin: 0; font-size: 22px;">Kyron Medical Group</h1>
            <p style="color: rgba(255,255,255,0.6); margin: 4px 0 0; font-size: 13px;">Prescription Refill Request</p>
          </div>
          <p style="font-size: 16px;">Hi <strong>${patient.firstName}</strong>,</p>
          <p>We have received your refill request:</p>
          <div style="background: #f8fafc; border-radius: 10px; padding: 20px; margin: 20px 0; border-left: 4px solid #5ee7c4;">
            <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
              <tr><td style="color: #64748b; padding: 6px 0; width: 160px;">Medication</td><td style="font-weight: 600;">${refill.medication}</td></tr>
              <tr><td style="color: #64748b; padding: 6px 0;">Prescribing Doctor</td><td>${refill.doctor}</td></tr>
              <tr><td style="color: #64748b; padding: 6px 0;">Pharmacy</td><td>${refill.pharmacy}</td></tr>
            </table>
          </div>
          <p style="font-size: 14px; color: #64748b;">
            Your doctor will review this request within <strong>1–2 business days</strong> and send the prescription to your pharmacy.
          </p>
          <p style="font-size: 14px; color: #64748b;">
            Questions? Call us at <strong>(415) 555-0190</strong>.
          </p>
          <p style="font-size: 13px; color: #94a3b8; margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
            Kyron Medical Group · 450 Pacific Medical Plaza, San Francisco, CA 94115
          </p>
        </div>
      `,
    })
  } catch (err) {
    console.error('Refill email error:', err)
  }
}

async function sendNotifications(appointment) {
  await Promise.allSettled([
    sendConfirmationEmail(appointment),
    sendConfirmationSMS(appointment),
  ])
}

// ── Routes ────────────────────────────────────────────────────────────────────

app.post('/api/chat', async (req, res) => {
  const { message, patient, history = [] } = req.body
  if (!message || !patient) return res.status(400).json({ error: 'Missing fields' })

  try {
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      system: buildSystemPrompt(patient),
      messages: [
        ...history.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: message },
      ],
    })

    const raw = response.content[0].text
    const parsed = parseIntent(raw, patient)
    console.log('raw Claude response:', raw)
console.log('parsed refill:', parsed.refill)

    if (parsed.appointment) await sendNotifications(parsed.appointment)
    if (parsed.refill) await sendRefillEmail(parsed.refill, patient)

    res.json({
      message: parsed.cleanText,
      slots: parsed.slots,
      doctor: parsed.doctor,
      appointment: parsed.appointment,
      refill: parsed.refill,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "I'm having trouble connecting right now. Please try again." })
  }
})

app.post('/api/call/outbound', async (req, res) => {
  const { patient, context } = req.body

  try {
    const response = await fetch('https://api.vapi.ai/call', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.VAPI_PRIVATE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
        customer: {
          number: '+1' + patient.phone.replace(/\D/g, '').slice(-10),
          name: `${patient.firstName} ${patient.lastName}`,
        },
        metadata: { patient },
        assistant: {
          name: 'Kyron Care Assistant',
          firstMessage: context.firstMessage,
          model: {
            provider: 'openai',
            model: 'gpt-4o',
            messages: [{ role: 'system', content: context.systemPrompt }],
            tools: [
              {
                type: 'function',
                function: {
                  name: 'bookAppointment',
                  description: 'Books an appointment once the patient confirms a date, time, and doctor.',
                  parameters: {
                    type: 'object',
                    properties: {
                      doctorId:   { type: 'string', description: 'Doctor ID e.g. dr-chen' },
                      doctorName: { type: 'string', description: 'Full name of the doctor' },
                      date:       { type: 'string', description: 'Appointment date exactly as listed in the slots' },
                      time:       { type: 'string', description: 'Appointment time exactly as listed in the slots' },
                    },
                    required: ['doctorId', 'doctorName', 'date', 'time'],
                  },
                },
              },
            ],
          },
          voice: {
            provider: 'openai',
            voiceId: 'shimmer',
          },
          serverUrl: `${process.env.SERVER_URL}/api/vapi/webhook`,
        },
      }),
    })

    const data = await response.json()
    if (!response.ok) throw new Error(data.message || 'Call failed')
    res.json({ success: true, callId: data.id })
  } catch (err) {
    console.error('Outbound call error:', err)
    res.status(500).json({ success: false, error: err.message })
  }
})

app.post('/api/vapi/webhook', async (req, res) => {
  const { message } = req.body

  if (message?.type === 'tool-calls') {
    const call = message.toolCallList?.[0]
    if (call?.function?.name === 'bookAppointment') {
      const args = typeof call.function.arguments === 'string'
        ? JSON.parse(call.function.arguments)
        : call.function.arguments

      const patient = message.call?.metadata?.patient

      try {
        const doctor = DOCTORS.find(d => d.id === args.doctorId)
        const appointment = {
          confirmationId: `KM${Date.now().toString(36).toUpperCase()}`,
          doctorName: doctor?.name || args.doctorName,
          specialty: doctor?.specialty || '',
          date: args.date,
          time: args.time,
          patient,
        }

        if (patient) await sendNotifications(appointment)

        return res.json({
          results: [{
            toolCallId: call.id,
            result: JSON.stringify({ success: true, confirmationId: appointment.confirmationId }),
          }]
        })
      } catch (err) {
        return res.json({
          results: [{
            toolCallId: call.id,
            result: JSON.stringify({ success: false, error: err.message }),
          }]
        })
      }
    }
  }

  res.json({ received: true })
})

app.get('/api/slots/:doctorId', (req, res) => {
  const slots = AVAILABILITY[req.params.doctorId] || []
  res.json(slots)
})

app.post('/api/book', async (req, res) => {
  const { doctorId, date, time, patient } = req.body
  const doctor = DOCTORS.find(d => d.id === doctorId)
  if (!doctor) return res.status(404).json({ error: 'Doctor not found' })

  const appointment = {
    confirmationId: `KM${Date.now().toString(36).toUpperCase()}`,
    doctorName: doctor.name,
    specialty: doctor.specialty,
    date,
    time,
    patient,
  }

  await sendNotifications(appointment)
  res.json({ success: true, appointment })
})

app.get('/api/health', (_, res) => res.json({ status: 'ok' }))

app.listen(process.env.PORT || 4000, () => {
  console.log(`Server running on http://localhost:${process.env.PORT || 4000}`)
})