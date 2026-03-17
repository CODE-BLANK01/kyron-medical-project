import { useState, useRef, useEffect } from 'react'
import _VapiModule from '@vapi-ai/web'

const Vapi = _VapiModule.default ?? _VapiModule

export default function VoiceButton({ patient, messages }) {
  const [webStatus, setWebStatus] = useState('idle')
  const [phoneStatus, setPhoneStatus] = useState('idle')
  const vapiRef = useRef(null)

  useEffect(() => {
    const doctorIds = ['dr-chen', 'dr-patel', 'dr-okonkwo', 'dr-morgan']
    Promise.all(
      doctorIds.map(id =>
        fetch(`/api/slots/${id}`).then(r => r.json()).then(slots => ({ id, slots }))
      )
    ).then(results => {
      window.__KYRON_SLOTS__ = {}
      results.forEach(({ id, slots }) => { window.__KYRON_SLOTS__[id] = slots })
    })
  }, [])

  const getContextSummary = () => {
    const history = messages
      .filter(m => m.id !== 'welcome')
      .map(m => `${m.role === 'user' ? 'Patient' : 'Assistant'}: ${m.content}`)
      .join('\n')

    const allDoctors = [
      { id: 'dr-chen',    name: 'Dr. Sarah Chen',    specialty: 'Orthopedic Surgery' },
      { id: 'dr-patel',   name: 'Dr. Raj Patel',     specialty: 'Cardiology' },
      { id: 'dr-okonkwo', name: 'Dr. Amara Okonkwo', specialty: 'Neurology' },
      { id: 'dr-morgan',  name: 'Dr. James Morgan',  specialty: 'Gastroenterology' },
    ]

    const slotsText = allDoctors.map(doc => {
      const slots = (window.__KYRON_SLOTS__?.[doc.id] || []).slice(0, 10)
      const slotLines = slots.length > 0
        ? slots.map(s => `  - ${s.date} at ${s.time}`).join('\n')
        : '  - No slots available'
      return `${doc.name} (${doc.specialty}):\n${slotLines}`
    }).join('\n\n')

    return `You are Kyron, an AI care coordinator for Kyron Medical Group. Be warm, professional, and concise.

PATIENT:
- Name: ${patient.firstName} ${patient.lastName}
- DOB: ${patient.dob}
- Phone: ${patient.phone}
- Email: ${patient.email}
- Reason for visit: ${patient.reason}

CHAT HISTORY:
${history}

AVAILABLE SLOTS BY DOCTOR:
${slotsText}

INSTRUCTIONS:
- Match the patient concern to the right doctor based on their specialty
- Read available slots conversationally when asked, do not list all at once
- Use the bookAppointment tool once the patient confirms a specific date, time, and doctor
- After booking say: "You are all set. A confirmation email has been sent to ${patient.email}."
- Keep responses short — this is a voice call, no bullet points or markdown, speak in plain sentences only

SAFETY — NEVER:
- Provide medical advice, diagnoses, or treatment recommendations
- Comment on medications or dosages
- For emergencies say: "Please call 911 immediately."`
  }

  const startWebCall = async () => {
    if (webStatus === 'connected') {
      vapiRef.current?.stop()
      vapiRef.current = null
      setWebStatus('idle')
      return
    }

    setWebStatus('connecting')

    try {
      const vapi = new Vapi(import.meta.env.VITE_VAPI_PUBLIC_KEY)
      vapiRef.current = vapi

      vapi.on('call-start', () => setWebStatus('connected'))
      vapi.on('call-end',   () => { setWebStatus('idle'); vapiRef.current = null })
      vapi.on('error',      (e) => { console.error('Vapi error:', e); setWebStatus('error'); setTimeout(() => setWebStatus('idle'), 3000) })

      vapi.on('message', async (msg) => {
  if (msg.type === 'tool-calls') {
    const call = msg.toolCallList?.[0]
    if (call?.function?.name === 'bookAppointment') {
      // arguments may already be an object, don't JSON.parse
      const args = typeof call.function.arguments === 'string'
        ? JSON.parse(call.function.arguments)
        : call.function.arguments

      try {
        const res = await fetch('/api/book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...args, patient }),
        })
        const data = await res.json()

        // Send tool result back to Vapi so call doesn't drop
        vapi.send({
          type: 'add-message',
          message: {
            role: 'tool',
            tool_call_id: call.id,
            content: JSON.stringify({ success: true, confirmationId: data.appointment?.confirmationId }),
          },
        })
      } catch (err) {
        console.error('Booking error:', err)
        vapi.send({
          type: 'add-message',
          message: {
            role: 'tool',
            tool_call_id: call.id,
            content: JSON.stringify({ success: false, error: err.message }),
          },
        })
      }
    }
  }
})

      await vapi.start({
        name: 'Kyron Care Assistant',
        firstMessage: `Hi ${patient.firstName}, I'm continuing from your chat session. ${patient.reason ? `I see you are here about ${patient.reason}.` : ''} How can I help you?`,
        model: {
          provider: 'openai',
          model: 'gpt-4o',
          messages: [{ role: 'system', content: getContextSummary() }],
          tools: [
            {
              type: 'function',
              function: {
                name: 'bookAppointment',
                description: 'Books an appointment for the patient once they have confirmed a date, time, and doctor.',
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
      })
    } catch (err) {
      console.error('Vapi start error:', err)
      setWebStatus('error')
      setTimeout(() => setWebStatus('idle'), 3000)
    }
  }

  const callMyPhone = async () => {
    setPhoneStatus('connecting')
    try {
      const res = await fetch('/api/call/outbound', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient,
          context: {
            firstMessage: `Hi ${patient.firstName}, this is Kyron from Kyron Medical calling you back. ${patient.reason ? `I see you are here about ${patient.reason}.` : ''} How can I help you?`,
            systemPrompt: getContextSummary(),
          },
        }),
      })
      const data = await res.json()
      if (data.success) {
        setPhoneStatus('connected')
        setTimeout(() => setPhoneStatus('idle'), 4000)
      } else {
        throw new Error(data.error)
      }
    } catch (err) {
      console.error('Call error:', err)
      setPhoneStatus('error')
      setTimeout(() => setPhoneStatus('idle'), 3000)
    }
  }

  const borderColor = {
    idle:       'rgba(255,255,255,0.12)',
    connecting: 'rgba(251,191,36,0.4)',
    connected:  'rgba(94,231,196,0.4)',
    error:      'rgba(248,113,113,0.4)',
  }

  const bg = {
    idle:       'rgba(255,255,255,0.06)',
    connecting: 'rgba(251,191,36,0.1)',
    connected:  'rgba(94,231,196,0.1)',
    error:      'rgba(248,113,113,0.1)',
  }


  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>

      {/* Phone call button */}
      <button
        onClick={callMyPhone}
        disabled={phoneStatus !== 'idle'}
        style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '7px 12px', borderRadius: 100,
          background: bg[phoneStatus],
          border: `1px solid ${borderColor[phoneStatus]}`,
          color: 'var(--text-primary)',
          fontSize: 12, fontWeight: 500,
          transition: 'all 0.3s ease',
          cursor: phoneStatus !== 'idle' ? 'not-allowed' : 'pointer',
        }}
      >
        <svg width="13" height="13" viewBox="0 0 15 15" fill="none">
          <path d="M5.5 1.5c.3.8.5 1.6.5 2.5 0 .3-.2.5-.4.7L4.2 5.8A10 10 0 0 0 9.2 10.8l1.1-1.4c.2-.2.4-.4.7-.4.9 0 1.7.2 2.5.5.3.1.5.4.5.7v2.3c0 .4-.3.5-.6.5C7 13 2 8 2 2.1c0-.3.1-.6.5-.6H5c.3 0 .5.2.5.5z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {phoneStatus === 'connecting' ? 'Calling...' : phoneStatus === 'connected' ? 'Call Placed!' : phoneStatus === 'error' ? 'Failed — retry' : 'Call My Phone'}
      </button>

      {/* Web voice call button */}
      <button
        onClick={startWebCall}
        disabled={webStatus === 'connecting'}
        style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '7px 12px', borderRadius: 100,
          background: bg[webStatus],
          border: `1px solid ${borderColor[webStatus]}`,
          color: 'var(--text-primary)',
          fontSize: 12, fontWeight: 500,
          transition: 'all 0.3s ease',
          cursor: webStatus === 'connecting' ? 'not-allowed' : 'pointer',
        }}
      >
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
          {webStatus === 'connected' ? (
            <rect x="2" y="2" width="10" height="10" rx="2" fill="rgba(248,113,113,0.8)"/>
          ) : (
            <>
              <circle cx="7" cy="5" r="2.5" stroke="var(--accent)" strokeWidth="1.2"/>
              <path d="M2 12c0-2.8 2.2-5 5-5s5 2.2 5 5" stroke="var(--accent)" strokeWidth="1.2" strokeLinecap="round"/>
            </>
          )}
        </svg>
        {webStatus === 'connected' ? 'End Web Call' : webStatus === 'connecting' ? 'Connecting...' : 'Web Voice Agent'}
      </button>

    </div>
  )
}