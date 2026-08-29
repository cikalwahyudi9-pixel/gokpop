import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, doc, runTransaction, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../contexts/AuthContext'
import { useCart } from '../contexts/CartContext'
import BottomNav from '../components/BottomNav'
import { ArrowLeft, Trash2, ShoppingBag } from 'lucide-react'
import { EmptyState } from '../components/ui'

export default function CartPage() {
  const { user } = useAuth()
  const { cart, removeFromCart, clearCart } = useCart()
  const navigate = useNavigate()
  const [checkingOut, setCheckingOut] = useState(false)
  const [error, setError] = useState('')

  // Group cart items by GOM
  const groupedCart = cart.reduce((acc, item) => {
    if (!acc[item.gomUid]) {
      acc[item.gomUid] = { gomName: item.gomName, items: [], total: 0 }
    }
    acc[item.gomUid].items.push(item)
    acc[item.gomUid].total += item.totalAmount
    return acc
  }, {})

  async function handleCheckout(gomUid) {
    const gomCart = groupedCart[gomUid]
    if (!gomCart || gomCart.items.length === 0) return

    setCheckingOut(true)
    setError('')

    try {
      // Create participant records for each GO from this GOM
      for (const go of gomCart.items) {
        await runTransaction(db, async (tx) => {
          const goRef = doc(db, 'group_orders', go.goId)
          const goSnap = await tx.get(goRef)
          
          if (!goSnap.exists()) throw new Error(`GO ${go.goName} tidak ditemukan`)
          const goData = goSnap.data()
          
          const totalQty = go.items.reduce((acc, item) => acc + item.qty, 0)
          const currentRemaining = goData.remainingSlots ?? goData.quota ?? 0
          
          if (currentRemaining < totalQty) throw new Error(`Slot penuh untuk ${go.goName}`)

          // Create participant record
          const newParticipantRef = doc(collection(db, 'group_orders', go.goId, 'participants'))
          
          const deadlineTs = goData.deadline?.toDate ? goData.deadline.toDate() : new Date(goData.deadline)
          const paymentDeadline = new Date(deadlineTs.getTime())

          tx.set(newParticipantRef, {
            uid: user.uid,
            displayName: user.displayName,
            photoURL: user.photoURL,
            items: go.items,
            totalAmount: go.totalAmount,
            goName: go.goName,
            orderStatus: 'menunggu_pembayaran',
            paymentDeadline,
            joinedAt: serverTimestamp(),
            paymentProofUrl: null,
          })

          // Deduct slots (we don't deduct stock here to keep it simple, but we deduct slots)
          tx.update(goRef, {
            remainingSlots: currentRemaining - totalQty,
            participantCount: (goData.participantCount || 0) + 1,
          })
        })

        // Remove this GO from cart since it's checked out
        removeFromCart(go.goId)
      }

      alert(`Berhasil checkout dari ${gomCart.gomName}! Silakan lanjut ke Pembayaran.`)
      navigate('/pesanan')
    } catch (err) {
      console.error(err)
      setError(err.message || 'Gagal checkout. Coba lagi.')
    } finally {
      setCheckingOut(false)
    }
  }

  return (
    <div style={{ background: 'var(--color-surface)', minHeight: '100dvh' }}>
      <div className="page-header">
        <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm" style={{ marginLeft: -8 }}>
          <ArrowLeft size={18} />
        </button>
        <h1 style={{ fontSize: '1.125rem', flex: 1 }}>Keranjang</h1>
        {cart.length > 0 && (
          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-error)' }} onClick={clearCart}>
            Bersihkan
          </button>
        )}
      </div>

      <div className="page" style={{ paddingBottom: 'var(--space-20)' }}>
        {error && <div className="alert alert-error" style={{ marginBottom: 'var(--space-4)' }}>{error}</div>}

        {cart.length === 0 ? (
          <EmptyState icon={ShoppingBag} title="Keranjang Kosong" description="Cari dan ikuti GO favoritmu!" />
        ) : (
          Object.entries(groupedCart).map(([gomUid, gomGroup]) => (
            <div key={gomUid} className="card animate-slide" style={{ marginBottom: 'var(--space-4)', padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: 'var(--space-3)', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
                <h2 style={{ fontSize: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span>GOM: {gomGroup.gomName}</span>
                  <span style={{ color: 'var(--color-primary)' }}>Rp {gomGroup.total.toLocaleString('id-ID')}</span>
                </h2>
              </div>
              
              <div style={{ padding: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {gomGroup.items.map(go => (
                  <div key={go.goId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ fontSize: '0.9375rem' }}>{go.goName}</h3>
                      <p className="text-xs text-secondary" style={{ marginBottom: 4 }}>
                        {go.items.map(i => `${i.qty}x ${i.name}`).join(', ')}
                      </p>
                      <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>Rp {go.totalAmount.toLocaleString('id-ID')}</p>
                    </div>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-error)' }} onClick={() => removeFromCart(go.goId)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              <div style={{ padding: 'var(--space-3)', borderTop: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
                <button 
                  className="btn btn-primary btn-full" 
                  onClick={() => handleCheckout(gomUid)}
                  disabled={checkingOut}
                >
                  Checkout GOM ini
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
