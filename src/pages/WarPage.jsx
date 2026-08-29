import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, getDoc, runTransaction, serverTimestamp, onSnapshot } from 'firebase/firestore'
import { useTranslation } from 'react-i18next'
import { db } from '../lib/firebase'
import { createNotification } from '../lib/notifications'
import { useAuth } from '../contexts/AuthContext'
import { ArrowLeft, Zap, ShieldCheck } from 'lucide-react'

export default function WarPage() {
  const { goId } = useParams()
  const { user }  = useAuth()
  const { t }     = useTranslation()
  const navigate  = useNavigate()

  const [go, setGO]             = useState(null)
  const [items, setItems]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [warStarted, setWarStarted] = useState(false)
  const [timeLeft, setTimeLeft] = useState(null)
  const [claiming, setClaiming] = useState({}) // { itemId: true/false }
  const [results, setResults]   = useState({}) // { itemId: 'success'/'failed' }
  const timerRef = useRef(null)

  // Real-time listener for GO and its war items
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'group_orders', goId), (snap) => {
      if (!snap.exists()) return navigate('/')
      const data = snap.data()
      setGO(data)
      setItems(data.warItems || [])
      setLoading(false)
    })
    return unsub
  }, [goId])

  // Countdown timer
  useEffect(() => {
    if (!go?.warStartTime) return

    const warDate = go.warStartTime.toDate ? go.warStartTime.toDate() : new Date(go.warStartTime)

    const tick = () => {
      const now  = Date.now()
      const diff = warDate.getTime() - now
      if (diff <= 0) {
        setWarStarted(true)
        setTimeLeft(null)
        clearInterval(timerRef.current)
      } else {
        setTimeLeft(diff)
      }
    }

    tick()
    timerRef.current = setInterval(tick, 500)
    return () => clearInterval(timerRef.current)
  }, [go?.warStartTime])

  async function handleClaim(item) {
    if (!user || claiming[item.id] || item.stock === 0) return

    setClaiming(prev => ({ ...prev, [item.id]: true }))

    try {
      const goRef       = doc(db, 'group_orders', goId)
      const claimRef    = doc(db, 'group_orders', goId, 'war_claims', `${user.uid}_${item.id}`)
      const userClaimRef = doc(db, 'group_orders', goId, 'war_claims', `${user.uid}_${item.id}`)

      await runTransaction(db, async (tx) => {
        const goSnap = await tx.get(goRef)
        if (!goSnap.exists()) throw new Error('GO tidak ditemukan')

        const goData   = goSnap.data()
        const warItems = goData.warItems || []
        const itemIdx  = warItems.findIndex(i => i.id === item.id)

        if (itemIdx === -1) throw new Error('Item tidak ditemukan')
        if (warItems[itemIdx].stock <= 0) throw new Error('Item sudah habis')

        // Check existing claim from this user
        const existingClaim = await tx.get(userClaimRef)
        if (existingClaim.exists()) throw new Error('Sudah pernah klaim item ini')

        // Atomic decrement
        const updatedItems = [...warItems]
        updatedItems[itemIdx] = { ...updatedItems[itemIdx], stock: updatedItems[itemIdx].stock - 1 }

        tx.update(goRef, { warItems: updatedItems })
        tx.set(claimRef, {
          uid: user.uid,
          displayName: user.displayName,
          itemId: item.id,
          itemName: item.name,
          goId,
          claimedAt: serverTimestamp(), // Server timestamp — tidak bisa dimanipulasi
        })
      })

      setResults(prev => ({ ...prev, [item.id]: 'success' }))
      await createNotification(user.uid, {
        type: 'claim_success',
        title: 'War Berhasil! ⚡',
        body: `Selamat! Anda berhasil mengklaim ${item.name}.`,
        goId
      })
    } catch (err) {
      console.error(err)
      const isSoldOut = err.message === 'Item sudah habis'
      setResults(prev => ({ ...prev, [item.id]: isSoldOut ? 'sold_out' : 'failed' }))
      
      if (isSoldOut) {
        await createNotification(user.uid, {
          type: 'claim_failed',
          title: 'War Gagal 🥲',
          body: `Sayang sekali, ${item.name} sudah habis diklaim orang lain.`,
          goId
        })
      }
    } finally {
      setClaiming(prev => ({ ...prev, [item.id]: false }))
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}>
        <p className="text-secondary">Memuat war...</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg)' }}>
      {/* Header */}
      <div className="page-header">
        <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm" style={{ marginLeft: -8 }}>
          <ArrowLeft size={18} />
        </button>
        <h1 style={{ fontSize: '1rem', flex: 1, textAlign: 'center' }}>
          {t('war_title')}: {go?.artistGroup}
        </h1>
        <div style={{ width: 56 }} />
      </div>

      <div className="page" style={{ paddingTop: 'var(--space-4)' }}>
        {/* War Banner */}
        <div className="war-banner" style={{ flexDirection: 'column', textAlign: 'center' }}>
          <div className="flex items-center justify-center gap-2" style={{ marginBottom: 'var(--space-1)' }}>
            <Zap size={22} style={{ color: 'var(--color-war)' }} />
            <h2>{warStarted ? t('war_started') : 'War akan segera dimulai'}</h2>
          </div>
          <p>{warStarted ? t('war_subtitle') : `Bersiap untuk klaim item terbatas!`}</p>
        </div>

        {/* Countdown */}
        {!warStarted && timeLeft !== null && (
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
            <p className="text-sm text-secondary" style={{ marginBottom: 'var(--space-3)' }}>{t('war_starts_in')}</p>
            <CountdownDisplay ms={timeLeft} />
          </div>
        )}

        {/* Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
          {items.map(item => {
            const isSoldOut = item.stock === 0
            const isClaiming = claiming[item.id]
            const result = results[item.id]
            const claimed = result === 'success'

            return (
              <div
                key={item.id}
                className="card"
                style={{ opacity: isSoldOut && !claimed ? 0.55 : 1 }}
              >
                <div className="flex justify-between items-start" style={{ marginBottom: 'var(--space-2)' }}>
                  <h3 style={{ fontSize: '0.9375rem' }}>{item.name}</h3>
                  {claimed && (
                    <span className="pill pill-success">✓ Berhasil klaim</span>
                  )}
                  {isSoldOut && !claimed && (
                    <span className="pill pill-gray">{t('sold_out')}</span>
                  )}
                  {item.stock <= 3 && item.stock > 0 && !claimed && (
                    <span className="pill pill-danger">Sisa: {item.stock}</span>
                  )}
                </div>

                <p className="text-sm text-secondary" style={{ marginBottom: 'var(--space-3)' }}>
                  {item.stock > 3 ? t('stock_left', { count: item.stock }) : ''}
                </p>

                <div className="flex justify-between items-center">
                  <span style={{ fontWeight: 700, fontSize: '1rem' }}>
                    Rp {item.price?.toLocaleString('id-ID')}
                  </span>

                  {result === 'failed' ? (
                    <span className="pill pill-danger">Gagal — coba lagi</span>
                  ) : claimed ? null : (
                    <button
                      className="btn btn-war btn-sm"
                      disabled={!warStarted || isSoldOut || isClaiming}
                      onClick={() => handleClaim(item)}
                    >
                      <Zap size={14} />
                      {isClaiming ? 'Memproses...' : t('claim_now')}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Trust notice */}
        <div style={{
          background: 'var(--color-primary-light)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-3) var(--space-4)',
          display: 'flex',
          gap: 'var(--space-2)',
          alignItems: 'flex-start',
          marginBottom: 'var(--space-3)',
        }}>
          <ShieldCheck size={16} style={{ color: 'var(--color-primary)', marginTop: 1, flexShrink: 0 }} />
          <p className="text-xs" style={{ color: 'var(--color-primary)' }}>{t('war_notice')}</p>
        </div>

        <p className="text-xs text-secondary" style={{ textAlign: 'center' }}>
          {t('war_history_note')}
        </p>
      </div>
    </div>
  )
}

function CountdownDisplay({ ms }) {
  const totalSec = Math.floor(ms / 1000)
  const hours    = Math.floor(totalSec / 3600)
  const minutes  = Math.floor((totalSec % 3600) / 60)
  const seconds  = totalSec % 60

  const pad = n => String(n).padStart(2, '0')

  return (
    <div className="countdown">
      <div className="countdown-segment">
        <div className="countdown-digit war">{pad(hours)}</div>
        <div className="countdown-label">Jam</div>
      </div>
      <div className="countdown-sep">:</div>
      <div className="countdown-segment">
        <div className="countdown-digit war">{pad(minutes)}</div>
        <div className="countdown-label">Menit</div>
      </div>
      <div className="countdown-sep">:</div>
      <div className="countdown-segment">
        <div className="countdown-digit war">{pad(seconds)}</div>
        <div className="countdown-label">Detik</div>
      </div>
    </div>
  )
}
