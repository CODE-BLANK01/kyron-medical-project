import { useState, useRef, useEffect } from 'react'
import MessageList from './MessageList'
import ChatInput from './ChatInput'
import VoiceButton from './VoiceButton'

let msgCounter = 0
const nextId = () => `msg_${++msgCounter}_${Date.now()}`

const WELCOME = {
  id: 'welcome',
  role: 'assistant',
  content: `Welcome to **Kyron Medical Group**. I'm your AI care coordinator.

I can help you with:
- **Scheduling an appointment** with one of our specialists
- **Prescription refill** status
- **Office hours & locations**

What brings you in today?`,
  timestamp: new Date(),
}

export default function ChatInterface({ patient }) {
  const [messages, setMessages] = useState([WELCOME])
  const [isLoading, setIsLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const sendMessage = async (text) => {
    const userMsg = { id: nextId(), role: 'user', content: text, timestamp: new Date() }
    setMessages(prev => [...prev, userMsg])
    setIsLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          patient,
          history: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      })
      const data = await res.json()
      console.log('API response:', data)
      setMessages(prev => [...prev, {
        id: nextId(),
        role: 'assistant',
        content: data.message,
        slots: data.slots || null,
        appointment: data.appointment || null,
        timestamp: new Date(),
      }])
    } catch {
      setMessages(prev => [...prev, {
        id: nextId(),
        role: 'assistant',
        content: 'Sorry, I ran into a connection issue. Please try again.',
        isError: true,
        timestamp: new Date(),
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSlotSelect = (slot) => {
    const text = `I'd like the ${slot.time} slot on ${slot.date}`
    setMessages(prev => [...prev, { id: nextId(), role: 'user', content: text, timestamp: new Date() }])
    sendMessage(text)
  }

  return (
    <div className="glass" style={{ width: '100%', maxWidth: 780, height: '100%', borderRadius: 'var(--radius-xl)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Chat header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(94,231,196,0.2), rgba(123,140,255,0.2))', border: '1px solid rgba(94,231,196,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
          🏥
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500 }}>Kyron Care Assistant</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
            {patient ? `Assisting ${patient.firstName} ${patient.lastName}` : 'Patient Support'}
          </div>
        </div>

      </div>
    <div style={{ marginLeft: 'auto' }}>
  <VoiceButton patient={patient} messages={messages} />
</div>
      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 20, minHeight: 0 }}>
        <MessageList messages={messages} isLoading={isLoading} onSlotSelect={handleSlotSelect} />
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--glass-border)', flexShrink: 0 }}>
        <ChatInput onSend={sendMessage} disabled={isLoading} />
      </div>

    </div>
  )
}