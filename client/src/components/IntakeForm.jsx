import { useState } from 'react'

export default function IntakeForm({ onSubmit }) {
  const [form, setForm] = useState({
    firstName: '', lastName: '', dob: '',
    phone: '', email: '', reason: '', smsOptIn: false,
  })
  const [errors, setErrors] = useState({})

  const validate = () => {
    const e = {}
    if (!form.firstName.trim()) e.firstName = 'Required'
    if (!form.lastName.trim()) e.lastName = 'Required'
    if (!form.dob) e.dob = 'Required'
    if (!form.phone.trim()) e.phone = 'Required'
    if (!form.email.includes('@')) e.email = 'Valid email required'
    if (!form.reason.trim()) e.reason = 'Required'
    return e
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    onSubmit(form)
  }

  const field = (key) => ({
    value: form[key],
    onChange: (e) => {
      setForm(f => ({ ...f, [key]: e.target.value }))
      setErrors(er => ({ ...er, [key]: undefined }))
    },
  })

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 400, fontStyle: 'italic', marginBottom: 4 }}>
          Patient Information
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Fill in your details to begin</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="First Name" error={errors.firstName}>
          <input type="text" placeholder="Jane" {...field('firstName')} style={{ width: '100%', padding: '10px 12px', fontSize: 14 }} />
        </Field>
        <Field label="Last Name" error={errors.lastName}>
          <input type="text" placeholder="Smith" {...field('lastName')} style={{ width: '100%', padding: '10px 12px', fontSize: 14 }} />
        </Field>
        <Field label="Date of Birth" error={errors.dob}>
          <input type="date" {...field('dob')} style={{ width: '100%', padding: '10px 12px', fontSize: 14, colorScheme: 'dark' }} />
        </Field>
        <Field label="Phone Number" error={errors.phone}>
          <input type="tel" placeholder="(415) 555-0100" {...field('phone')} style={{ width: '100%', padding: '10px 12px', fontSize: 14 }} />
        </Field>
      </div>

      <Field label="Email Address" error={errors.email}>
        <input type="email" placeholder="jane@example.com" {...field('email')} style={{ width: '100%', padding: '10px 12px', fontSize: 14 }} />
      </Field>

      <Field label="Reason for Visit" error={errors.reason}>
        <textarea placeholder="Describe your symptoms or what you'd like help with..." {...field('reason')} rows={2}
          style={{ width: '100%', padding: '10px 12px', fontSize: 14, resize: 'vertical', lineHeight: 1.5 }} />
      </Field>

      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
        <div
          onClick={() => setForm(f => ({ ...f, smsOptIn: !f.smsOptIn }))}
          style={{
            marginTop: 2, width: 18, height: 18, borderRadius: 5, flexShrink: 0,
            border: `1px solid ${form.smsOptIn ? 'var(--accent)' : 'var(--glass-border-strong)'}`,
            background: form.smsOptIn ? 'var(--accent-dim)' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
          }}
        >
          {form.smsOptIn && (
            <svg width="11" height="8" viewBox="0 0 11 8" fill="none">
              <path d="M1 4l3 3 6-6" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          I agree to receive appointment confirmations and reminders via SMS. Message & data rates may apply.
        </span>
      </label>

      <button type="submit" style={{
        background: 'linear-gradient(135deg, rgba(94,231,196,0.2), rgba(123,140,255,0.2))',
        border: '1px solid rgba(94,231,196,0.4)',
        borderRadius: 'var(--radius-sm)',
        color: 'var(--text-primary)',
        padding: '12px', fontSize: 15, fontWeight: 500,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}>
        Begin Consultation
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M3 8h10M9 4l4 4-4 4" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </form>
  )
}

function Field({ label, error, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
        {label}
        {error && <span style={{ color: '#f87171', marginLeft: 6 }}>{error}</span>}
      </label>
      {children}
    </div>
  )
}