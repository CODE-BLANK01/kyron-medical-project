import { useState } from 'react'

export default function ChatInput({ onSend, disabled }) {
  const [value, setValue] = useState('')

  const handleSend = () => {
    if (!value.trim() || disabled) return
    onSend(value.trim())
    setValue('')
  }

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
      <textarea
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
        placeholder="Type your message..."
        disabled={disabled}
        rows={1}
        style={{ flex: 1, padding: '10px 14px', fontSize: 14, resize: 'none', lineHeight: 1.5, maxHeight: 120, opacity: disabled ? 0.5 : 1 }}
      />
      <button
        onClick={handleSend}
        disabled={disabled || !value.trim()}
        style={{
          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
          background: value.trim() && !disabled ? 'linear-gradient(135deg, rgba(94,231,196,0.3), rgba(123,140,255,0.25))' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${value.trim() && !disabled ? 'rgba(94,231,196,0.4)' : 'rgba(255,255,255,0.08)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: disabled || !value.trim() ? 0.4 : 1, transition: 'all 0.2s',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M2 8h12M10 4l4 4-4 4" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  )
}