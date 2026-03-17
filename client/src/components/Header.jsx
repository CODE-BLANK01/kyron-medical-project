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