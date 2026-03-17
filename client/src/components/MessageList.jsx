import ReactMarkdown from 'react-markdown'

export default function MessageList({ messages, isLoading, onSlotSelect }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {messages.map(msg => <Message key={msg.id} msg={msg} onSlotSelect={onSlotSelect} />)}
      {isLoading && <TypingIndicator />}
    </div>
  )
}

function Message({ msg, onSlotSelect }) {
  const isUser = msg.role === 'user'
  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start', gap: 6 }}>
      {!isUser && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 4 }}>
          <div style={{
            width: 20, height: 20, borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(94,231,196,0.3), rgba(123,140,255,0.3))',
            border: '1px solid rgba(94,231,196,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11,
          }}>+</div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Kyron AI · {formatTime(msg.timestamp)}</span>
        </div>
      )}

      <div style={{
        maxWidth: '85%', padding: '11px 15px',
        borderRadius: isUser ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
        background: isUser ? 'linear-gradient(135deg, rgba(94,231,196,0.18), rgba(123,140,255,0.18))' : 'rgba(255,255,255,0.06)',
        border: isUser ? '1px solid rgba(94,231,196,0.25)' : '1px solid rgba(255,255,255,0.08)',
        fontSize: 14, lineHeight: 1.6,
        color: msg.isError ? '#f87171' : 'var(--text-primary)',
      }}>
        <ReactMarkdown components={{
          p:      ({ children }) => <p style={{ margin: '0 0 6px' }}>{children}</p>,
          strong: ({ children }) => <strong style={{ color: 'var(--accent)', fontWeight: 500 }}>{children}</strong>,
          em:     ({ children }) => <em style={{ color: 'var(--text-secondary)' }}>{children}</em>,
          ul:     ({ children }) => <ul style={{ margin: '6px 0', paddingLeft: 18 }}>{children}</ul>,
          li:     ({ children }) => <li style={{ margin: '2px 0', color: 'var(--text-secondary)' }}>{children}</li>,
        }}>
          {msg.content}
        </ReactMarkdown>
      </div>

      {msg.slots?.length > 0 && (
        <div style={{ maxWidth: '85%', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 8, width: '100%' }}>
          {msg.slots.map((slot, i) => (
            <button key={i} onClick={() => onSlotSelect(slot)} style={{
              background: 'rgba(94,231,196,0.06)', border: '1px solid rgba(94,231,196,0.2)',
              borderRadius: 12, padding: '10px 14px', textAlign: 'left', color: 'var(--text-primary)',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(94,231,196,0.12)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(94,231,196,0.06)'; e.currentTarget.style.transform = 'translateY(0)' }}
            >
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--accent)', marginBottom: 3 }}>{slot.time}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{slot.date}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 4 }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>+</div>
      <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px 18px 18px 18px', padding: '12px 16px', display: 'flex', gap: 4, alignItems: 'center' }}>
        <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
      </div>
    </div>
  )
}

function formatTime(date) {
  if (!date) return ''
  return new Date(date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}