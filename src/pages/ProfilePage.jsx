import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, onSnapshot, collection, query, where, orderBy, updateDoc } from 'firebase/firestore'
import { useTranslation } from 'react-i18next'
import { db } from '../lib/firebase'
import { uploadImage } from '../lib/upload'
import { useAuth } from '../contexts/AuthContext'
import BottomNav from '../components/BottomNav'
import { Avatar, VerifiedBadge, StatusPill, EmptyState } from '../components/ui'
import { ArrowLeft, LogOut, ShieldCheck, Award, Settings, ChevronRight, Upload, Star, MessageSquare, Calculator, Globe } from 'lucide-react'
import { timeAgo } from '../lib/utils'

export default function ProfilePage() {
  const { uid }    = useParams()
  const { user, profile, logout, isGOM } = useAuth()
  const { t, i18n }      = useTranslation()
  const navigate   = useNavigate()

  const targetUid  = uid || user?.uid
  const isSelf     = targetUid === user?.uid

  const [targetProfile, setProfile] = useState(null)
  const [goHistory, setGoHistory]   = useState([])
  const [reviews, setReviews]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [uploadingQris, setUploadingQris] = useState(false)

  useEffect(() => {
    if (!targetUid) return
    const unsub = onSnapshot(doc(db, 'users', targetUid), snap => {
      setProfile(snap.exists() ? snap.data() : null)
      setLoading(false)
    })
    return unsub
  }, [targetUid])

  useEffect(() => {
    if (!targetUid) return
    // Only show GO history if viewing a GOM profile
    const q = query(
      collection(db, 'group_orders'),
      where('createdBy', '==', targetUid),
      orderBy('createdAt', 'desc')
    )
    const unsub = onSnapshot(q, snap => {
      setGoHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })

    const qReviews = query(
      collection(db, 'users', targetUid, 'reviews'),
      orderBy('createdAt', 'desc')
    )
    const unsubReviews = onSnapshot(qReviews, snap => {
      setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })

    return () => { unsub(); unsubReviews() }
  }, [targetUid])

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  if (loading) return null

  const shownProfile = targetProfile || profile
  const activeGO   = goHistory.filter(g => g.status === 'aktif').length
  const completedGO = goHistory.filter(g => g.status === 'selesai').length

  return (
    <div style={{ background: 'var(--color-surface)', minHeight: '100dvh' }}>
      <div className="page-header">
        {uid && (
          <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm" style={{ marginLeft: -8 }}>
            <ArrowLeft size={18} />
          </button>
        )}
        <h1 style={{ fontSize: '1.125rem', flex: 1 }}>{t('profile_title')}</h1>
        {isSelf && (
          <button className="btn btn-ghost btn-sm" onClick={handleLogout} style={{ color: 'var(--color-danger)' }}>
            <LogOut size={16} />
          </button>
        )}
      </div>

      <div className="page" style={{ paddingTop: 'var(--space-4)' }}>
        {/* Profile card */}
        <div className="card" style={{ marginBottom: 'var(--space-4)', textAlign: 'center' }}>
          <Avatar
            src={shownProfile?.photoURL}
            name={shownProfile?.displayName}
            size="lg"
            style={{ margin: '0 auto var(--space-3)' }}
          />
          <h2 style={{ marginBottom: 4 }}>{shownProfile?.displayName}</h2>
          <p className="text-sm text-secondary" style={{ marginBottom: 'var(--space-2)' }}>{shownProfile?.email}</p>

          <div className="flex justify-center gap-2">
            {shownProfile?.role === 'gom' && (
              <span className="pill pill-primary">GOM</span>
            )}
            <VerifiedBadge verified={shownProfile?.verificationStatus === 'verified'} />
          </div>

          {shownProfile?.bio && (
            <p className="text-sm text-secondary" style={{ marginTop: 'var(--space-3)' }}>{shownProfile.bio}</p>
          )}
        </div>

        {/* GOM Stats */}
        {(shownProfile?.role === 'gom' || goHistory.length > 0) && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <div className="card" style={{ textAlign: 'center', padding: 'var(--space-3)' }}>
              <p style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-headline)', color: 'var(--color-primary)' }}>
                {completedGO}
              </p>
              <p className="text-xs text-secondary">{t('completed_go')}</p>
            </div>
            <div className="card" style={{ textAlign: 'center', padding: 'var(--space-3)' }}>
              <p style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-headline)', color: 'var(--color-success)' }}>
                {activeGO}
              </p>
              <p className="text-xs text-secondary">{t('active_go_profile')}</p>
            </div>
            <div className="card" style={{ textAlign: 'center', padding: 'var(--space-3)' }}>
              <div className="flex justify-center items-center gap-1">
                <Star size={16} fill="var(--color-warning)" color="var(--color-warning)" />
                <p style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-headline)' }}>
                  {shownProfile?.avgRating ? shownProfile.avgRating.toFixed(1) : '–'}
                </p>
              </div>
              <p className="text-xs text-secondary">{shownProfile?.reviewCount || 0} Ulasan</p>
            </div>
          </div>
        )}

        {/* Verification (self + not verified + gom) */}
        {isSelf && shownProfile?.role === 'gom' && shownProfile?.verificationStatus !== 'verified' && (
          <div 
            className="card" 
            style={{ marginBottom: 'var(--space-4)', borderColor: 'var(--color-primary)', borderWidth: 1.5, cursor: 'pointer' }}
            onClick={async () => {
              const wa = window.prompt('Masukkan nomor WhatsApp Anda untuk verifikasi:')
              if (wa) {
                try {
                  await updateDoc(doc(db, 'users', user.uid), {
                    verificationStatus: 'verified',
                    whatsapp: wa
                  })
                  alert('Berhasil diverifikasi!')
                  window.location.reload()
                } catch (err) {
                  alert('Gagal verifikasi')
                }
              }
            }}
          >
            <div className="flex items-center gap-3">
              <ShieldCheck size={24} style={{ color: 'var(--color-primary)' }} />
              <div style={{ flex: 1 }}>
                <p className="font-semibold">{t('verify_wa')}</p>
                <p className="text-xs text-secondary">Tingkatkan kepercayaan peserta dengan verifikasi nomor WA</p>
              </div>
              <ChevronRight size={16} style={{ color: 'var(--color-text-secondary)' }} />
            </div>
          </div>
        )}


        {/* Settings & Tools (Self Only) */}
        {isSelf && (
          <div className="card" style={{ marginBottom: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <h3 style={{ fontSize: '0.9375rem', marginBottom: 'var(--space-1)' }}>Pengaturan & Alat</h3>
            
            <button 
              className="flex justify-between items-center w-full" 
              style={{ padding: 'var(--space-2) 0', borderBottom: '1px solid var(--color-border)', cursor: 'pointer' }}
              onClick={() => navigate('/kalkulator')}
            >
              <div className="flex items-center gap-3">
                <div style={{ background: 'var(--color-primary-light)', padding: 8, borderRadius: 'var(--radius-sm)' }}>
                  <Calculator size={18} style={{ color: 'var(--color-primary)' }} />
                </div>
                <span className="font-medium">Kalkulator Harga Estimasi</span>
              </div>
              <ChevronRight size={16} style={{ color: 'var(--color-text-secondary)' }} />
            </button>

            <div className="flex justify-between items-center w-full" style={{ padding: 'var(--space-2) 0' }}>
              <div className="flex items-center gap-3">
                <div style={{ background: 'var(--color-primary-light)', padding: 8, borderRadius: 'var(--radius-sm)' }}>
                  <Globe size={18} style={{ color: 'var(--color-primary)' }} />
                </div>
                <span className="font-medium">Bahasa</span>
              </div>
              <select 
                className="input"
                style={{ padding: '4px 8px', height: 'auto', width: 'auto', fontSize: '0.875rem' }}
                value={i18n.language}
                onChange={(e) => i18n.changeLanguage(e.target.value)}
              >
                <option value="id">Indonesia</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>
        )}

        {/* GO History */}
        {goHistory.length > 0 && (
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <div className="section-header">
              <h2>{t('gom_history')}</h2>
              <span className="section-badge">{goHistory.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {goHistory.slice(0, 10).map(go => (
                <div
                  key={go.id}
                  className="card animate-slide"
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: 'var(--space-3)' }}
                  onClick={() => navigate(`/go/${go.id}`)}
                >
                  <div>
                    <h3 style={{ fontSize: '0.9375rem', marginBottom: 2 }} className="truncate">{go.name}</h3>
                    <p className="text-xs text-secondary">{go.artistGroup}</p>
                  </div>
                  <StatusPill status={go.status} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ulasan */}
        {(shownProfile?.role === 'gom' || reviews.length > 0) && (
          <div style={{ paddingBottom: 'var(--space-10)' }}>
            <div className="section-header">
              <h2>Ulasan Peserta</h2>
              <span className="section-badge">{reviews.length}</span>
            </div>
            {reviews.length === 0 ? (
              <EmptyState icon={MessageSquare} title="Belum ada ulasan" description="Peserta dapat memberikan ulasan setelah GO selesai." />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {reviews.map(r => (
                  <div key={r.id} className="card animate-slide" style={{ padding: 'var(--space-3)' }}>
                    <div className="flex justify-between items-start" style={{ marginBottom: 'var(--space-2)' }}>
                      <div className="flex items-center gap-2">
                        <Avatar src={r.reviewerPhoto} name={r.reviewerName} size="xs" />
                        <div>
                          <p className="text-sm font-semibold">{r.reviewerName}</p>
                          <p className="text-xs text-secondary">di {r.goName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star size={12} fill="var(--color-warning)" color="var(--color-warning)" />
                        <span className="text-sm font-semibold">{r.rating}</span>
                      </div>
                    </div>
                    {r.text && <p className="text-sm">{r.text}</p>}
                    <p className="text-xs text-secondary" style={{ marginTop: 'var(--space-2)' }}>
                      {timeAgo(r.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <BottomNav active="profil" />
    </div>
  )
}
