import { useState } from 'react'
import BackgroundCanvas from './components/BackgroundCanvas'
import Header from './components/Header'
import IntakeForm from './components/IntakeForm'
import ChatInterface from './components/ChatInterface'

export default function App() {
  const [patient, setPatient] = useState(null)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <BackgroundCanvas />
      <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Header />
        <main style={{ flex: 1, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px 16px' }}>
          {patient ? (
            <ChatInterface patient={patient} />
          ) : (
            <div className="glass-strong" style={{ width: '100%', maxWidth: 560, borderRadius: 'var(--radius-xl)', padding: 28, overflowY: 'auto', maxHeight: '100%' }}>
              <IntakeForm onSubmit={setPatient} />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}