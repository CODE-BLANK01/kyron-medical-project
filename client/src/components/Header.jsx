export default function Header() {
  return (
    <header style={{
      padding: '16px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'linear-gradient(135deg, rgba(94,231,196,0.3), rgba(123,140,255,0.3))',
          border: '1px solid rgba(94,231,196,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 2v14M2 9h14" stroke="#5ee7c4" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="9" cy="9" r="7" stroke="rgba(94,231,196,0.4)" strokeWidth="1"/>
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 500 }}>Kyron Medical</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: '0.04em' }}>PATIENT PORTAL</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span className="badge badge-online">
          <span className="badge-dot" />
          AI Online
        </span>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', borderLeft: '1px solid rgba(255,255,255,0.08)', paddingLeft: 16 }}>
          HIPAA Secure
        </div>
      </div>
    </header>
  )
}