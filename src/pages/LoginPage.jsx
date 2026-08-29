import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { LanguageToggle } from '../components/ui'
import { ShieldCheck, Bell, TrendingUp } from 'lucide-react'

export default function LoginPage() {
  const { signInWithGoogle } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const from = location.state?.from?.pathname || '/'

  async function handleGoogleSignIn() {
    try {
      setLoading(true)
      setError('')
      await signInWithGoogle()
      navigate(from, { replace: true })
    } catch (err) {
      console.error(err)
      setError('Gagal masuk. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  const features = [
    { icon: TrendingUp, text: t('realtime_tracking') },
    { icon: Bell,       text: t('auto_notif') },
    { icon: ShieldCheck, text: t('anti_scam') },
  ]

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--color-bg)',
      padding: 'var(--space-4)',
      maxWidth: 640,
      margin: '0 auto',
    }}>
      {/* Top bar */}
      <div className="flex justify-between items-center" style={{ paddingTop: 'var(--space-3)' }}>
        <div className="flex items-center gap-2">
          <div style={{
            width: 32, height: 32,
            background: 'var(--color-primary)',
            borderRadius: 'var(--radius-md)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: '0.875rem', fontFamily: 'var(--font-headline)' }}>G</span>
          </div>
          <span style={{ fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: '1.125rem', color: 'var(--color-primary)' }}>
            GOKpop
          </span>
        </div>
        <LanguageToggle />
      </div>

      {/* Hero */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: 'var(--space-8)', paddingBottom: 'var(--space-6)' }}>
        {/* Illustration */}
        <div style={{
          width: '100%',
          maxWidth: 280,
          margin: '0 auto var(--space-8)',
          aspectRatio: '1',
          background: 'var(--color-primary-light)',
          borderRadius: 'var(--radius-xl)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Abstract shapes */}
          <svg viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '80%' }}>
            <circle cx="120" cy="120" r="80" fill="#DBEAFE" />
            <circle cx="120" cy="120" r="50" fill="#BFDBFE" />
            {/* People dots */}
            {[0,60,120,180,240,300].map((angle, i) => {
              const rad = (angle * Math.PI) / 180
              const x = 120 + 68 * Math.cos(rad)
              const y = 120 + 68 * Math.sin(rad)
              return <circle key={i} cx={x} cy={y} r="10" fill="var(--color-primary)" opacity={0.7 + i * 0.05} />
            })}
            {/* Connection lines */}
            {[0,60,120,180,240,300].map((angle, i) => {
              const rad = (angle * Math.PI) / 180
              const x = 120 + 68 * Math.cos(rad)
              const y = 120 + 68 * Math.sin(rad)
              return <line key={i} x1={120} y1={120} x2={x} y2={y} stroke="var(--color-primary)" strokeWidth="1.5" strokeDasharray="4 2" opacity="0.4" />
            })}
            <circle cx="120" cy="120" r="16" fill="var(--color-primary)" />
            <text x="120" y="125" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">GO</text>
          </svg>
        </div>

        {/* Tagline */}
        <h1 style={{ textAlign: 'center', marginBottom: 'var(--space-2)', fontSize: '1.5rem' }}>
          {t('tagline')}
        </h1>
        <p className="text-secondary text-sm" style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
          Platform GO Kpop yang lebih rapi, transparan, dan mudah dipantau.
        </p>

        {/* Sign in card */}
        <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
          <h2 style={{ marginBottom: 'var(--space-5)', fontSize: '1.125rem', textAlign: 'center' }}>
            {t('sign_in_subtitle')}
          </h2>

          {error && (
            <div style={{
              background: 'var(--color-danger-bg)',
              color: 'var(--color-danger)',
              padding: 'var(--space-3)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.875rem',
              marginBottom: 'var(--space-4)',
              textAlign: 'center',
            }}>
              {error}
            </div>
          )}

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-3)',
              padding: '12px var(--space-5)',
              border: '1.5px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              background: '#fff',
              fontSize: '0.9375rem',
              fontWeight: 600,
              fontFamily: 'var(--font-body)',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'all var(--transition)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            {/* Google logo SVG */}
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {loading ? t('signing_in') : t('sign_in_with_google')}
          </button>

          <p className="text-xs text-secondary" style={{ textAlign: 'center', marginTop: 'var(--space-3)' }}>
            {t('auto_register')}
          </p>
        </div>
      </div>

      {/* Feature highlights */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-around',
        paddingBottom: 'var(--space-6)',
        borderTop: '1px solid var(--color-border)',
        paddingTop: 'var(--space-5)',
      }}>
        {features.map(({ icon: Icon, text }) => (
          <div key={text} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-1)' }}>
            <Icon size={18} style={{ color: 'var(--color-primary)' }} />
            <span className="text-xs text-secondary" style={{ textAlign: 'center', maxWidth: 80 }}>{text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
