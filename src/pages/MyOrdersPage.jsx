import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, query, where, orderBy, onSnapshot, runTransaction, doc, serverTimestamp, collectionGroup } from 'firebase/firestore'
import { useTranslation } from 'react-i18next'
import { db } from '../lib/firebase'
import { createNotification } from '../lib/notifications'
import { useAuth } from '../contexts/AuthContext'
import BottomNav from '../components/BottomNav'
import { StatusPill, OrderStepper, SkeletonCard, EmptyState } from '../components/ui'
import { ShoppingBag, Upload, Clock, X, Star } from 'lucide-react'
import { useNavigate as useNav } from 'react-router-dom'

const TABS = [
  { key: 'semua',      label: 'tab_all' },
  { key: 'aktif',      label: 'tab_active' },
  { key: 'selesai',    label: 'tab_done' },
  { key: 'dibatalkan', label: 'tab_cancelled' },
]

const ACTIVE_STATUSES = ['menunggu_pembayaran', 'menunggu_konfirmasi', 'dibayar', 'dipesan_ke_seller', 'sampai_gudang', 'dikirim_peserta']
const DONE_STATUSES   = ['selesai', 'refund_selesai']
const CANCEL_STATUSES = ['dibatalkan_peserta', 'dibatalkan_gom', 'refund_diproses']

export default function MyOrdersPage() {
  const { user } = useAuth()
  const { t }    = useTranslation()
  const navigate = useNavigate()

  const [orders, setOrders]   = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setTab]   = useState('semua')

  useEffect(() => {
    if (!user) return
    // We'll use a collectionGroup query
    const q = query(
      collectionGroup(db, 'participants'),
      where('uid', '==', user.uid),
      orderBy('joinedAt', 'desc')
    )
    const unsub = onSnapshot(q, (snap) => {
      setOrders(snap.docs.map(d => ({ id: d.id, goId: d.ref.parent.parent.id, ...d.data() })))
      setLoading(false)
    })
    return unsub
  }, [user])

  const filtered = orders.filter(o => {
    if (activeTab === 'semua')      return true
    if (activeTab === 'aktif')      return ACTIVE_STATUSES.includes(o.orderStatus)
    if (activeTab === 'selesai')    return DONE_STATUSES.includes(o.orderStatus)
    if (activeTab === 'dibatalkan') return CANCEL_STATUSES.includes(o.orderStatus)
    return true
  })

  async function handleCancelOrder(order) {
    if (!window.confirm('Apakah Anda yakin ingin membatalkan pesanan ini?')) return
    
    try {
      await runTransaction(db, async (tx) => {
        const goRef = doc(db, 'group_orders', order.goId)
        const goSnap = await tx.get(goRef)
        const goData = goSnap.data()
        
        const pRef = doc(db, 'group_orders', order.goId, 'participants', order.id)
        
        let newRemainingSlots = goData.remainingSlots ?? goData.quota
        const totalPcs = order.items?.reduce((acc, i) => acc + (i.qty || 1), 0) || 0
        newRemainingSlots += totalPcs
        
        const updatedGoItems = [...(goData.items || [])]
        for (const pItem of (order.items || [])) {
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
          orderStatus: 'dibatalkan_peserta',
          cancelledAt: serverTimestamp()
        })
      })
      
      // Notify GOM
      await createNotification(order.goCreatedBy || 'unknown', {
        type: 'cancelled',
        title: 'Pesanan Dibatalkan Peserta',
        body: `${user.displayName} telah membatalkan pesanannya untuk ${order.goName}.`,
        goId: order.goId,
        orderId: order.id
      })
      
      alert('Pesanan berhasil dibatalkan.')
    } catch (err) {
      console.error(err)
      alert('Gagal membatalkan pesanan.')
    }
  }

  const [reviewOrder, setReviewOrder] = useState(null)
  const [rating, setRating] = useState(5)
  const [reviewText, setReviewText] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)

  async function submitReview() {
    if (!reviewOrder || rating < 1) return
    setSubmittingReview(true)
    try {
      let gomUid = reviewOrder.goCreatedBy
      if (!gomUid) {
        const { getDoc } = await import('firebase/firestore')
        const goSnap = await getDoc(doc(db, 'group_orders', reviewOrder.goId))
        gomUid = goSnap.data()?.createdBy
        if (!gomUid) throw new Error('GOM tidak ditemukan')
      }
      await runTransaction(db, async (tx) => {
        const pRef = doc(db, 'group_orders', reviewOrder.goId, 'participants', reviewOrder.id)
        const pSnap = await tx.get(pRef)
        if (pSnap.data().isReviewed) throw new Error('Pesanan ini sudah diulas')

        const gomRef = doc(db, 'users', gomUid)
        const gomSnap = await tx.get(gomRef)
        const gData = gomSnap.data() || {}

        const newCount = (gData.reviewCount || 0) + 1
        const currentTotal = (gData.avgRating || 0) * (gData.reviewCount || 0)
        const newAvg = (currentTotal + rating) / newCount

        const reviewRef = doc(collection(db, 'users', gomUid, 'reviews'))
        tx.set(reviewRef, {
          orderId: reviewOrder.id,
          goId: reviewOrder.goId,
          goName: reviewOrder.goName,
          rating,
          text: reviewText,
          reviewerUid: user.uid,
          reviewerName: user.displayName,
          reviewerPhoto: user.photoURL,
          createdAt: serverTimestamp()
        })

        tx.update(gomRef, { avgRating: newAvg, reviewCount: newCount })
        tx.update(pRef, { isReviewed: true })
      })

      alert('Ulasan berhasil dikirim!')
      setReviewOrder(null)
      setRating(5)
      setReviewText('')
    } catch (err) {
      alert(err.message)
    } finally {
      setSubmittingReview(false)
    }
  }

  return (
    <div style={{ background: 'var(--color-surface)', minHeight: '100dvh' }}>
      {/* Header */}
      <div className="page-header" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
        <h1 style={{ fontSize: '1.125rem', marginBottom: 'var(--space-3)' }}>{t('my_orders_title')}</h1>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 'var(--space-1)', background: 'var(--color-surface)', borderRadius: 'var(--radius-full)', padding: 3 }}>
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setTab(tab.key)}
              style={{
                flex: 1,
                padding: '6px 0',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.75rem',
                fontWeight: 600,
                background: activeTab === tab.key ? 'var(--color-bg)' : 'transparent',
                color: activeTab === tab.key ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                boxShadow: activeTab === tab.key ? 'var(--shadow-sm)' : 'none',
                transition: 'all var(--transition)',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {t(tab.label)}
            </button>
          ))}
        </div>
      </div>

      <div className="page" style={{ paddingTop: 'var(--space-4)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {loading ? (
            Array(3).fill(0).map((_, i) => <SkeletonCard key={i} />)
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              title={t('no_orders')}
              description="Mulai dengan join GO aktif di halaman Beranda."
              action={
                <button className="btn btn-primary" onClick={() => navigate('/')}>{t('explore_title')}</button>
              }
            />
          ) : (
            filtered.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                onUpload={() => navigate(`/pesanan/${order.goId}/${order.id}/bayar`)}
                onDetail={() => navigate(`/go/${order.goId}`)}
                onCancel={() => handleCancelOrder(order)}
                onReview={() => setReviewOrder(order)}
              />
            ))
          )}
        </div>
      </div>

      <BottomNav active="pesanan" />

      {reviewOrder && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 100,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
        }}>
          <div className="card animate-slide" style={{ width: '100%', maxWidth: 480, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, paddingBottom: 'var(--space-8)' }}>
            <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-4)' }}>
              <h2 style={{ fontSize: '1.0625rem' }}>Beri Ulasan</h2>
              <button onClick={() => setReviewOrder(null)}><X size={20} /></button>
            </div>
            
            <p className="text-sm text-secondary" style={{ marginBottom: 'var(--space-4)' }}>Bagaimana pengalamanmu berbelanja di {reviewOrder.goName}?</p>
            
            <div className="flex justify-center gap-2" style={{ marginBottom: 'var(--space-4)' }}>
              {[1, 2, 3, 4, 5].map(star => (
                <button key={star} onClick={() => setRating(star)} style={{ padding: 4 }}>
                  <Star size={32} fill={rating >= star ? 'var(--color-warning)' : 'none'} color={rating >= star ? 'var(--color-warning)' : 'var(--color-text-disabled)'} />
                </button>
              ))}
            </div>

            <textarea
              className="input"
              rows={3}
              placeholder="Tulis ulasan pengalamanmu (opsional)..."
              value={reviewText}
              onChange={e => setReviewText(e.target.value)}
              style={{ marginBottom: 'var(--space-4)', resize: 'none' }}
            />

            <button className="btn btn-primary btn-full" onClick={submitReview} disabled={submittingReview}>
              {submittingReview ? 'Mengirim...' : 'Kirim Ulasan'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function OrderCard({ order, onUpload, onDetail, onCancel, onReview }) {
  const { t } = useTranslation()
  const isActive   = ACTIVE_STATUSES.includes(order.orderStatus)
  const isDone     = DONE_STATUSES.includes(order.orderStatus)
  const isCanceled = CANCEL_STATUSES.includes(order.orderStatus)

  const deadlineDate = order.paymentDeadline?.toDate ? order.paymentDeadline.toDate() : null
  const doneDate     = order.completedAt?.toDate ? order.completedAt.toDate() : null

  return (
    <div className="card animate-slide">
      {/* GO name + status */}
      <div className="flex justify-between items-start" style={{ marginBottom: 'var(--space-3)' }}>
        <h3 style={{ fontSize: '0.9375rem', flex: 1, marginRight: 'var(--space-2)' }} className="truncate">
          {order.goName || 'Group Order'}
        </h3>
        <StatusPill status={order.orderStatus} />
      </div>

      {/* Items */}
      {order.items?.length > 0 && (
        <div style={{ marginBottom: 'var(--space-3)' }}>
          {order.items.map((item, i) => (
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
          <div className="flex justify-between items-center" style={{ marginTop: 'var(--space-2)', paddingTop: 'var(--space-2)', borderTop: '1px solid var(--color-border)' }}>
            <span className="text-xs text-secondary">Total (incl. ongkir)</span>
            <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>
              Rp {order.totalAmount?.toLocaleString('id-ID') || '–'}
            </span>
          </div>
        </div>
      )}

      {/* Stepper for in-progress orders */}
      {isActive && order.orderStatus !== 'menunggu_pembayaran' && (
        <div style={{ marginBottom: 'var(--space-3)' }}>
          <OrderStepper currentStatus={order.orderStatus} />
        </div>
      )}

      {/* Footer actions */}
      {order.orderStatus === 'menunggu_pembayaran' && (
        <div>
          {deadlineDate && (
            <p className="text-xs text-warning" style={{ marginBottom: 'var(--space-2)' }}>
              <Clock size={12} style={{ display: 'inline', marginRight: 4 }} />
              {t('pay_before')} {deadlineDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}
          <div className="flex gap-2">
            <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={onUpload}>
              <Upload size={14} />
              {t('upload_proof')}
            </button>
            <button className="btn btn-outline btn-sm" style={{ color: 'var(--color-error)', borderColor: 'var(--color-error)' }} onClick={onCancel}>
              Batalkan
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-2" style={{ marginTop: 'var(--space-3)' }}>
        <button
          className="btn btn-ghost btn-sm"
          style={{ flex: 1 }}
          onClick={onDetail}
        >
          Lihat Info GO →
        </button>
        {isDone && !order.isReviewed && (
          <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={onReview}>
            Beri Ulasan
          </button>
        )}
      </div>

      {isDone && doneDate && (
        <p className="text-xs text-secondary">
          {t('done_on')} {doneDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      )}
    </div>
  )
}
