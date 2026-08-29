import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, onSnapshot, collection, query, orderBy, updateDoc, serverTimestamp } from 'firebase/firestore'
import { useTranslation } from 'react-i18next'
import { db } from '../lib/firebase'
import { createNotification } from '../lib/notifications'
import { useAuth } from '../contexts/AuthContext'
import { Avatar, StatusPill, OrderStepper, SlotProgress, EmptyState } from '../components/ui'
import GODiscussion from '../components/GODiscussion'
import { ArrowLeft, Download, Users, ChevronDown, Edit3, XCircle, BellRing, X } from 'lucide-react'

const STATUS_FLOW = [
  'menunggu_pembayaran',
  'menunggu_konfirmasi',
  'dibayar',
  'dipesan_ke_seller',
  'sampai_gudang',
  'dikirim_peserta',
  'selesai',
]

const STATUS_I18N = {
  menunggu_pembayaran: 'status_waiting_payment',
  menunggu_konfirmasi: 'status_waiting_confirmation',
  dibayar: 'status_paid',
  dipesan_ke_seller: 'status_ordered',
  sampai_gudang: 'status_warehouse',
  dikirim_peserta: 'status_shipping',
  selesai: 'status_done',
}

export default function GOMDetailPage() {
  const { goId }   = useParams()
  const { user }   = useAuth()
  const { t }      = useTranslation()
  const navigate   = useNavigate()

  const [go, setGO]                 = useState(null)
  const [participants, setParticipants] = useState([])
  const [loading, setLoading]       = useState(true)

  // Broadcast Notification State
  const [showBroadcastModal, setShowBroadcastModal] = useState(false)
  const [broadcastTitle, setBroadcastTitle] = useState('')
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [sendingBroadcast, setSendingBroadcast] = useState(false)

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'group_orders', goId), snap => {
      setGO({ id: snap.id, ...snap.data() })
    })
    return unsub
  }, [goId])

  useEffect(() => {
    const q = query(
      collection(db, 'group_orders', goId, 'participants'),
      orderBy('joinedAt', 'desc')
    )
    const unsub = onSnapshot(q, snap => {
      setParticipants(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return unsub
  }, [goId])

  async function updateStatus(participantId, newStatus) {
    try {
      await updateDoc(
        doc(db, 'group_orders', goId, 'participants', participantId),
        { orderStatus: newStatus, [`${newStatus}At`]: serverTimestamp() }
      )
      const p = participants.find(x => x.id === participantId)
      if (p) {
        await createNotification(p.uid, {
          type: 'status_update',
          title: 'Update Status Pesanan',
          body: `Pesananmu untuk ${go?.name} sekarang berstatus: ${t(STATUS_I18N[newStatus])}`,
          goId,
          orderId: participantId
        })
      }
    } catch (err) {
      console.error(err)
      alert('Gagal update status')
    }
  }

  async function handleBroadcast() {
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) return
    setSendingBroadcast(true)
    try {
      const uids = Array.from(new Set(participants.map(p => p.uid)))
      const promises = uids.map(uid => 
        createNotification(uid, {
          type: 'broadcast',
          title: broadcastTitle.trim(),
          body: broadcastMessage.trim(),
          goId
        })
      )
      await Promise.all(promises)
      alert('Notifikasi berhasil dikirim ke semua peserta!')
      setShowBroadcastModal(false)
      setBroadcastTitle('')
      setBroadcastMessage('')
    } catch (err) {
      console.error('Failed to send broadcast:', err)
      alert('Gagal mengirim notifikasi')
    } finally {
      setSendingBroadcast(false)
    }
  }

  async function handleCancelOrder(participantId, pItems, reason) {
    try {
      await runTransaction(db, async (tx) => {
        const goRef = doc(db, 'group_orders', goId)
        const goSnap = await tx.get(goRef)
        const goData = goSnap.data()
        
        const pRef = doc(db, 'group_orders', goId, 'participants', participantId)
        
        let newRemainingSlots = goData.remainingSlots ?? goData.quota
        const totalPcs = pItems.reduce((acc, i) => acc + (i.qty || 1), 0)
        newRemainingSlots += totalPcs
        
        const updatedGoItems = [...goData.items]
        for (const pItem of pItems) {
          const itemIdx = updatedGoItems.findIndex(i => (i.id || i.name) === (pItem.id || pItem.name))
          if (itemIdx > -1 && updatedGoItems[itemIdx].stock != null) {
            updatedGoItems[itemIdx].stock += (pItem.qty || 1)
          }
        }
        
        tx.update(goRef, {
          remainingSlots: newRemainingSlots,
          items: updatedGoItems,
          participantCount: Math.max(0, (goData.participantCount || 1) - 1)
        })
        
        tx.update(pRef, { 
          orderStatus: 'dibatalkan_gom',
          cancelReason: reason,
          cancelledAt: serverTimestamp()
        })
      })
      
      const p = participants.find(x => x.id === participantId)
      if (p) {
        await createNotification(p.uid, {
          type: 'cancelled',
          title: 'Pesanan Dibatalkan',
          body: `Pesananmu untuk ${go?.name} telah dibatalkan oleh GOM. Alasan: ${reason}`,
          goId,
          orderId: participantId
        })
      }
      alert('Pesanan berhasil dibatalkan dan kuota dikembalikan.')
    } catch (err) {
      console.error(err)
      alert('Gagal membatalkan pesanan.')
    }
  }

  function exportCSV() {
    const headers = ['Nama', 'Status', 'Items', 'Total', 'Tanggal Join']
    const rows = participants.map(p => [
      p.displayName,
      p.orderStatus,
      p.items?.map(i => `${i.name}x${i.qty}`).join('; ') || '',
      p.totalAmount || 0,
      p.joinedAt?.toDate?.()?.toLocaleDateString('id-ID') || '',
    ])

    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `GO_${go?.name}_peserta.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!go) return null

  const filled = go.quota - (go.remainingSlots ?? go.quota)

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-surface)' }}>
      <div className="page-header">
        <button onClick={() => navigate('/gom')} className="btn btn-ghost btn-sm" style={{ marginLeft: -8 }}>
          <ArrowLeft size={18} />
        </button>
        <h1 style={{ fontSize: '1rem', flex: 1, textAlign: 'center' }} className="truncate">{go.name}</h1>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/gom/go/${goId}/edit`)}>
          <Edit3 size={16} style={{ color: 'var(--color-text-secondary)' }} />
        </button>
      </div>

      <div className="page" style={{ paddingTop: 'var(--space-4)' }}>
        {/* GO Summary */}
        <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
          <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-3)' }}>
            <div>
              <p className="text-xs text-secondary">{go.artistGroup}</p>
              <h2 style={{ fontSize: '1rem' }}>{go.name}</h2>
            </div>
            <span className="pill pill-success">{go.status || 'aktif'}</span>
          </div>
          <SlotProgress filled={filled} total={go.quota} />
          <div className="flex items-center gap-1" style={{ marginTop: 'var(--space-2)' }}>
            <Users size={13} style={{ color: 'var(--color-text-secondary)' }} />
            <span className="text-xs text-secondary">{participants.length} peserta bergabung</span>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap" style={{ marginBottom: 'var(--space-4)' }}>
          <button className="btn btn-outline btn-sm" style={{ flex: '1 1 calc(50% - 4px)' }} onClick={exportCSV}>
            <Download size={14} /> Export CSV
          </button>
          <button className="btn btn-outline btn-sm" style={{ flex: '1 1 calc(50% - 4px)' }} onClick={() => setShowBroadcastModal(true)}>
            <BellRing size={14} /> Umumkan
          </button>
          {go.status !== 'selesai' && go.status !== 'tutup' && (
            <button className="btn btn-outline btn-sm" style={{ flex: '1 1 100%', color: 'var(--color-error)', borderColor: 'var(--color-error)' }} onClick={async () => {
              if (window.confirm('Tutup GO ini? Peserta tidak akan bisa join lagi.')) {
                await updateDoc(doc(db, 'group_orders', goId), { status: 'tutup' })
              }
            }}>
              <XCircle size={14} /> Tutup GO
            </button>
          )}
        </div>

        {/* Discussion / Q&A */}
        <div style={{ marginTop: 'var(--space-4)' }}>
          <GODiscussion goId={goId} gomUid={user?.uid} />
        </div>

        {/* Participants */}
        <div className="section-header" style={{ marginTop: 'var(--space-2)' }}>
          <h2>Daftar Peserta</h2>
          <span className="section-badge">{participants.length}</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {loading ? (
            <p className="text-secondary text-sm" style={{ textAlign: 'center', paddingTop: 'var(--space-6)' }}>Memuat...</p>
          ) : participants.length === 0 ? (
            <EmptyState icon={Users} title="Belum ada peserta" description="Bagikan link GO ini ke calon peserta." />
          ) : (
            participants.map(p => (
              <ParticipantCard
                key={p.id}
                participant={p}
                onStatusChange={(newStatus) => handleStatusChange(p.id, newStatus)}
                onCancel={handleCancelOrder}
                t={t}
              />
            ))
          )}
        </div>
      </div>

      {/* Broadcast Modal */}
      {showBroadcastModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-4)'
        }}>
          <div className="card animate-slide" style={{ width: '100%', maxWidth: 400 }}>
            <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-4)' }}>
              <h2 style={{ fontSize: '1.0625rem' }}>Kirim Pengumuman</h2>
              <button onClick={() => setShowBroadcastModal(false)}><X size={20} /></button>
            </div>
            
            <p className="text-sm text-secondary" style={{ marginBottom: 'var(--space-4)' }}>Notifikasi ini akan dikirimkan ke {Array.from(new Set(participants.map(p => p.uid))).length} peserta GO ini.</p>
            
            <input
              className="input"
              placeholder="Judul (Maks 50 karakter)"
              maxLength={50}
              value={broadcastTitle}
              onChange={e => setBroadcastTitle(e.target.value)}
              style={{ marginBottom: 'var(--space-3)' }}
            />

            <textarea
              className="input"
              rows={4}
              placeholder="Isi pengumuman..."
              value={broadcastMessage}
              onChange={e => setBroadcastMessage(e.target.value)}
              style={{ marginBottom: 'var(--space-4)', resize: 'none' }}
            />

            <button 
              className="btn btn-primary btn-full" 
              onClick={handleBroadcast} 
              disabled={sendingBroadcast || !broadcastTitle.trim() || !broadcastMessage.trim()}
            >
              <BellRing size={16} />
              {sendingBroadcast ? 'Mengirim...' : 'Kirim Sekarang'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ParticipantCard({ participant: p, onStatusChange, onCancel, t }) {
  const [expanded, setExpanded] = useState(false)
  const currentIdx = STATUS_FLOW.indexOf(p.orderStatus)
  const nextStatus = STATUS_FLOW[currentIdx + 1]

  return (
    <div className="card animate-slide">
      <div
        className="flex justify-between items-start"
        style={{ cursor: 'pointer' }}
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center gap-3">
          <Avatar src={p.photoURL} name={p.displayName} size="sm" />
          <div>
            <p className="font-semibold" style={{ fontSize: '0.9375rem' }}>{p.displayName}</p>
            <p className="text-xs text-secondary">
              Rp {p.totalAmount?.toLocaleString('id-ID')} · {p.items?.reduce((sum, item) => sum + (item.qty || 1), 0) || 0} pcs
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill status={p.orderStatus} />
          <ChevronDown size={14} style={{
            color: 'var(--color-text-secondary)',
            transform: expanded ? 'rotate(180deg)' : 'none',
            transition: 'transform var(--transition)',
          }} />
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--color-border)' }}>
          {/* Items */}
          <div style={{ marginBottom: 'var(--space-3)' }}>
            {p.items?.map((item, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <div className="flex justify-between items-center" style={{ marginBottom: 2 }}>
                  <span className="text-sm font-medium">{item.name} <span className="text-secondary">x{item.qty}</span></span>
                  <span className="text-sm font-medium">Rp {(item.finalPrice * item.qty).toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-secondary">
                  <span>@ Rp {item.price?.toLocaleString('id-ID') || 0}</span>
                  <span>Ongkir: Rp {item.shippingEstimate?.toLocaleString('id-ID') || 0}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Payment proof */}
          {p.paymentProofUrl && (
            <div style={{ marginBottom: 'var(--space-3)' }}>
              <p className="text-xs text-secondary" style={{ marginBottom: 6 }}>Bukti Bayar:</p>
              <img
                src={p.paymentProofUrl}
                alt="Bukti bayar"
                style={{ maxHeight: 200, borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
              />
            </div>
          )}

          {/* Stepper */}
          <div style={{ marginBottom: 'var(--space-3)' }}>
            <OrderStepper currentStatus={p.orderStatus} />
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2">
            {nextStatus && (
              <button
                className="btn btn-primary btn-sm btn-full"
                onClick={() => onStatusChange(nextStatus)}
              >
                Tandai: {t(STATUS_I18N[nextStatus])}
              </button>
            )}
            
            {!['dibatalkan_gom', 'dibatalkan_peserta', 'refund_diproses', 'selesai'].includes(p.orderStatus) && (
              <button
                className="btn btn-outline btn-sm btn-full"
                style={{ color: 'var(--color-error)', borderColor: 'var(--color-error)' }}
                onClick={() => {
                  const reason = window.prompt('Alasan pembatalan (wajib):')
                  if (reason) onCancel(p.id, p.items, reason)
                }}
              >
                Batalkan Pesanan
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
