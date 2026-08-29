import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { ShieldCheck } from 'lucide-react'

/**
 * Status pill component
 * @param {string} status - order status key
 */
export function StatusPill({ status }) {
  const { t } = useTranslation()

  const config = {
    aktif:                   { label: t('status_active'),          cls: 'pill-success' },
    menunggu_pembayaran:     { label: t('status_waiting_payment'), cls: 'pill-warning' },
    menunggu_konfirmasi:     { label: t('status_waiting_confirmation'), cls: 'pill-warning' },
    dibayar:                 { label: t('status_paid'),            cls: 'pill-primary' },
    dipesan_ke_seller:       { label: t('status_ordered'),         cls: 'pill-primary' },
    sampai_gudang:           { label: t('status_warehouse'),       cls: 'pill-primary' },
    dikirim_peserta:         { label: t('status_shipping'),        cls: 'pill-war'     },
    selesai:                 { label: t('status_done'),            cls: 'pill-success' },
    dibatalkan_peserta:      { label: t('status_cancelled_participant'), cls: 'pill-danger' },
    dibatalkan_gom:          { label: t('status_cancelled_gom'),   cls: 'pill-danger'  },
    refund_diproses:         { label: t('status_refund_processing'), cls: 'pill-warning' },
    refund_selesai:          { label: t('status_refund_done'),     cls: 'pill-success' },
  }

  const { label, cls } = config[status] || { label: status, cls: 'pill-gray' }

  return <span className={`pill ${cls}`}>{label}</span>
}

/**
 * Slot progress indicator
 */
export function SlotProgress({ filled, total }) {
  const pct = Math.min((filled / total) * 100, 100)
  return (
    <div>
      <div className="flex justify-between mb-1" style={{ marginBottom: 4 }}>
        <span className="text-xs text-secondary">Sisa Slot: {total - filled}/{total}</span>
        <span className="text-xs text-secondary">{Math.round(pct)}%</span>
      </div>
      <div className="progress-bar">
        <div className="progress-bar__fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

/**
 * GOM Verified badge
 */
export function VerifiedBadge({ verified, small = false }) {
  const { t } = useTranslation()
  if (!verified) return null
  return (
    <span className="verified-badge">
      <ShieldCheck size={small ? 12 : 14} />
      {t('verified')}
    </span>
  )
}

/**
 * Order stepper — shows progress through order states
 */
export function OrderStepper({ currentStatus }) {
  const steps = [
    { key: 'bayar',            label: 'Bayar' },
    { key: 'dipesan_ke_seller', label: 'Dipesan' },
    { key: 'sampai_gudang',    label: 'Gudang' },
    { key: 'dikirim_peserta',  label: 'Kirim' },
    { key: 'selesai',          label: 'Selesai' },
  ]

  const activeIndexMap = {
    menunggu_konfirmasi: 0,
    dibayar: 1,
    dipesan_ke_seller: 2,
    sampai_gudang: 3,
    dikirim_peserta: 4,
    selesai: 5,
  }
  
  const currentActiveStep = activeIndexMap[currentStatus] ?? -1

  return (
    <div className="stepper">
      {steps.map((step, i) => {
        const done = currentActiveStep > i
        const active = currentActiveStep === i

        return (
          <div key={step.key} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? '1' : 'none' }}>
            <div className={`step ${done ? 'done' : active ? 'active' : ''}`}>
              <div className="step-dot">{done ? '✓' : i + 1}</div>
              <div className="step-label">{step.label}</div>
            </div>
            {i < steps.length - 1 && (
              <div className={`step-line${done ? ' done' : ''}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

/**
 * Skeleton card loader
 */
export function SkeletonCard() {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <div className="skeleton" style={{ height: 18, width: '60%' }} />
      <div className="skeleton" style={{ height: 14, width: '40%' }} />
      <div className="skeleton" style={{ height: 6 }} />
      <div className="skeleton" style={{ height: 36, borderRadius: 'var(--radius-md)' }} />
    </div>
  )
}

/**
 * Empty state
 */
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div style={{ textAlign: 'center', padding: 'var(--space-12) var(--space-6)' }}>
      {Icon && <Icon size={48} style={{ margin: '0 auto var(--space-4)', color: 'var(--color-text-disabled)' }} />}
      <h3 style={{ marginBottom: 'var(--space-2)', color: 'var(--color-text-secondary)' }}>{title}</h3>
      {description && <p className="text-sm text-secondary">{description}</p>}
      {action && <div style={{ marginTop: 'var(--space-5)' }}>{action}</div>}
    </div>
  )
}

/**
 * Avatar with fallback initials
 */
export function Avatar({ src, name, size = 'md' }) {
  const initials = name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?'

  if (src) {
    return <img src={src} alt={name} className={`avatar avatar-${size}`} />
  }

  return (
    <div
      className={`avatar avatar-${size}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-primary-subtle)',
        color: 'var(--color-primary)',
        fontSize: size === 'sm' ? '0.625rem' : size === 'lg' ? '1rem' : '0.75rem',
        fontWeight: 700,
        fontFamily: 'var(--font-headline)',
      }}
    >
      {initials}
    </div>
  )
}

/**
 * Language toggle pill
 */
export function LanguageToggle() {
  const { i18n } = useTranslation()
  const lang = i18n.language

  return (
    <div style={{
      display: 'flex',
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-full)',
      padding: 2,
      gap: 2,
    }}>
      {['id', 'en'].map(l => (
        <button
          key={l}
          onClick={() => i18n.changeLanguage(l)}
          style={{
            padding: '3px 10px',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.75rem',
            fontWeight: 600,
            background: lang === l ? 'var(--color-primary)' : 'transparent',
            color: lang === l ? '#fff' : 'var(--color-text-secondary)',
            transition: 'all var(--transition)',
          }}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
