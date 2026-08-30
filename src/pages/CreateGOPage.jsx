import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore'
import { useTranslation } from 'react-i18next'
import { db } from '../lib/firebase'
import { uploadImage } from '../lib/upload'
import { createNotification } from '../lib/notifications'
import { useAuth } from '../contexts/AuthContext'
import { ArrowLeft, Plus, Trash2, Calculator } from 'lucide-react'

const SHIPPING_RATE_PER_100G = 5000 // Rp 5.000 per 100g estimasi

function calcFinalPrice(basePrice, shippingEstimate) {
  return (parseFloat(basePrice) || 0) + (parseFloat(shippingEstimate) || 0)
}



export default function CreateGOPage() {
  const { user, profile } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const [form, setForm] = useState({
    name: '',
    artistGroup: '',
    originCountry: 'Korea', // Default
    deadline: '',
    quota: '',
    description: '',
    qrisUrl: '',
    bankName: '',
    bankAccount: '',
  })

  const [uploadingQris, setUploadingQris] = useState(false)

  const [items, setItems] = useState([
    { id: 1, name: '', price: '', stock: '', shippingEstimate: '', finalPrice: 0 }
  ])

  function updateForm(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function addItem() {
    setItems(prev => [...prev, {
      id: Date.now(),
      name: '', price: '', stock: '', shippingEstimate: '', finalPrice: 0
    }])
  }

  function removeItem(id) {
    if (items.length === 1) return
    setItems(prev => prev.filter(i => i.id !== id))
  }

  function updateItem(id, field, value) {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item
      const updated = { ...item, [field]: value }
      updated.finalPrice = calcFinalPrice(
        field === 'price' ? value : item.price,
        field === 'shippingEstimate' ? value : item.shippingEstimate
      )
      return updated
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name || !form.artistGroup || !form.deadline || !form.quota) {
      setError('Lengkapi semua field yang wajib diisi.')
      return
    }
    if (items.some(i => !i.name || !i.price)) {
      setError('Lengkapi nama dan harga semua item.')
      return
    }

    try {
      setSaving(true)
      setError('')
      const minPrice = Math.min(...items.map(i => i.finalPrice))

      const docRef = await addDoc(collection(db, 'group_orders'), {
        name: form.name.trim(),
        artistGroup: form.artistGroup.trim(),
        originCountry: form.originCountry,
        description: form.description.trim(),
        deadline: new Date(form.deadline),
        quota: parseInt(form.quota),
        remainingSlots: parseInt(form.quota),
        qrisUrl: form.qrisUrl,
        bankName: form.bankName.trim(),
        bankAccount: form.bankAccount.trim(),
        status: 'aktif',
        items: items.map(({ id, ...rest }) => ({
          ...rest,
          price: parseFloat(rest.price),
          stock: parseInt(rest.stock) || null,
          shippingEstimate: parseFloat(rest.shippingEstimate) || 0,
          finalPrice: calcFinalPrice(rest.price, rest.shippingEstimate),
        })),
        minPrice,
        createdBy: user.uid,
        gomName: profile?.displayName || user.displayName,
        gomPhotoURL: profile?.photoURL || user.photoURL,
        gomVerified: profile?.verificationStatus === 'verified',
        participantCount: 0,
        createdAt: serverTimestamp(),
      })

      // Notify followers
      try {
        const followersQ = query(
          collection(db, 'users'),
          where('followingArtists', 'array-contains', form.artistGroup.trim())
        )
        const followersSnap = await getDocs(followersQ)
        
        const notifyPromises = followersSnap.docs
          .filter(d => d.id !== user.uid) // Don't notify the GOM themselves
          .map(d => createNotification(d.id, {
            type: 'new_go',
            title: 'GO Baru Dibuka! 🎉',
            body: `GO baru untuk ${form.artistGroup.trim()} telah dibuka oleh ${profile?.displayName || user.displayName}. Buruan cek!`,
            goId: docRef.id
          }))
          
        await Promise.all(notifyPromises)
      } catch (notifyErr) {
        console.error('Failed to notify followers:', notifyErr)
      }

      navigate('/gom')
    } catch (err) {
      console.error(err)
      setError('Gagal menyimpan GO. Coba lagi.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-surface)' }}>
      {/* Header */}
      <div className="page-header">
        <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm" style={{ marginLeft: -8 }}>
          <ArrowLeft size={18} />
        </button>
        <h1 style={{ fontSize: '1.0625rem', flex: 1, textAlign: 'center' }}>{t('create_go_title')}</h1>
        <div style={{ width: 56 }} />
      </div>

      <form onSubmit={handleSubmit}>
        <div className="page" style={{ paddingTop: 'var(--space-4)' }}>
          {error && (
            <div style={{
              background: 'var(--color-danger-bg)',
              color: 'var(--color-danger)',
              padding: 'var(--space-3)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.875rem',
              marginBottom: 'var(--space-4)',
            }}>
              {error}
            </div>
          )}

          {/* Basic info */}
          <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
            <h2 style={{ fontSize: '0.9375rem', marginBottom: 'var(--space-4)' }}>Informasi GO</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div className="input-group">
                <label className="input-label">{t('go_name')} <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                <input className="input" placeholder="cth: TWICE WITH YOU-TH Album GO" value={form.name} onChange={e => updateForm('name', e.target.value)} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div className="input-group">
                  <label className="input-label">{t('artist_group')} <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                  <input className="input" placeholder="cth: TWICE" value={form.artistGroup} onChange={e => updateForm('artistGroup', e.target.value)} />
                </div>
                <div className="input-group">
                  <label className="input-label">Asal Negara <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                  <select className="input" value={form.originCountry} onChange={e => updateForm('originCountry', e.target.value)}>
                    <option value="Korea">Korea</option>
                    <option value="China">China</option>
                    <option value="Jepang">Jepang</option>
                    <option value="Thailand">Thailand</option>
                    <option value="Filipina">Filipina</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div className="input-group">
                  <label className="input-label">{t('deadline_label')} <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                  <input className="input" type="datetime-local" value={form.deadline} onChange={e => updateForm('deadline', e.target.value)} />
                </div>
                <div className="input-group">
                  <label className="input-label">{t('quota')} <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                  <input className="input" type="number" placeholder="30" min="1" value={form.quota} onChange={e => updateForm('quota', e.target.value)} />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Deskripsi (opsional)</label>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="Info tambahan tentang GO ini..."
                  value={form.description}
                  onChange={e => updateForm('description', e.target.value)}
                  style={{ resize: 'none' }}
                />
              </div>
            </div>
          </div>

          {/* Payment Info */}
          <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
            <h2 style={{ fontSize: '0.9375rem', marginBottom: 'var(--space-4)' }}>Metode Pembayaran</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              
              <div className="input-group">
                <label className="input-label">Upload QRIS (Opsional)</label>
                {form.qrisUrl && (
                  <img src={form.qrisUrl} alt="QRIS" style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-2)' }} />
                )}
                <label className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-start' }}>
                  {uploadingQris ? 'Mengupload...' : (form.qrisUrl ? 'Ganti QRIS' : 'Pilih Gambar QRIS')}
                  <input type="file" accept="image/*" style={{ display: 'none' }} disabled={uploadingQris} onChange={async (e) => {
                    const f = e.target.files?.[0]
                    if (!f) return
                    setUploadingQris(true)
                    try {
                      const url = await uploadImage(f)
                      updateForm('qrisUrl', url)
                    } catch (err) {
                      alert('Gagal mengupload QRIS')
                    } finally {
                      setUploadingQris(false)
                    }
                  }} />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div className="input-group">
                  <label className="input-label">Nama Bank / E-Wallet (Opsional)</label>
                  <input className="input" placeholder="cth: BCA / Dana" value={form.bankName} onChange={e => updateForm('bankName', e.target.value)} />
                </div>
                <div className="input-group">
                  <label className="input-label">No. Rekening (Opsional)</label>
                  <input className="input" placeholder="cth: 1234567890" value={form.bankAccount} onChange={e => updateForm('bankAccount', e.target.value)} />
                </div>
              </div>

            </div>
          </div>

          {/* Items */}
          <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
            <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-4)' }}>
              <h2 style={{ fontSize: '0.9375rem' }}>
                {t('items')}
                <span style={{
                  marginLeft: 6, background: 'var(--color-primary-subtle)', color: 'var(--color-primary)',
                  fontSize: '0.75rem', fontWeight: 700, padding: '2px 6px', borderRadius: 'var(--radius-full)'
                }}>{items.length}</span>
              </h2>
              <button type="button" className="btn btn-outline btn-sm" onClick={addItem}>
                <Plus size={14} /> {t('add_item')}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {items.map((item, idx) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  idx={idx}
                  onUpdate={(field, val) => updateItem(item.id, field, val)}
                  onRemove={() => removeItem(item.id)}
                  canRemove={items.length > 1}
                  t={t}
                />
              ))}
            </div>
          </div>

          {/* Submit */}
          <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={saving}>
            {saving ? 'Menyimpan...' : t('publish')}
          </button>
        </div>
      </form>
    </div>
  )
}

function ItemRow({ item, idx, onUpdate, onRemove, canRemove, t }) {
  return (
    <div style={{
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-md)',
      padding: 'var(--space-3)',
      background: 'var(--color-surface)',
    }}>
      <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-3)' }}>
        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Item {idx + 1}</span>
        {canRemove && (
          <button type="button" onClick={onRemove} style={{ color: 'var(--color-danger)', padding: 4 }}>
            <Trash2 size={15} />
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <div className="input-group">
          <label className="input-label" style={{ fontSize: '0.8125rem' }}>{t('item_name')} *</label>
          <input className="input" style={{ fontSize: '0.875rem' }} placeholder="cth: Karina ver Album" value={item.name} onChange={e => onUpdate('name', e.target.value)} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
          <div className="input-group">
            <label className="input-label" style={{ fontSize: '0.8125rem' }}>Harga Dasar (Rp) *</label>
            <input className="input" style={{ fontSize: '0.875rem' }} type="number" placeholder="150000" value={item.price} onChange={e => onUpdate('price', e.target.value)} />
          </div>
          <div className="input-group">
            <label className="input-label" style={{ fontSize: '0.8125rem' }}>Stok</label>
            <input className="input" style={{ fontSize: '0.875rem' }} type="number" placeholder="∞" value={item.stock} onChange={e => onUpdate('stock', e.target.value)} />
          </div>
        </div>

        <div className="input-group">
          <label className="input-label" style={{ fontSize: '0.8125rem' }}>
            <Calculator size={12} style={{ display: 'inline', marginRight: 4 }} />
            {t('shipping_estimate')} (Rp)
          </label>
          <input
            className="input"
            style={{ fontSize: '0.875rem' }}
            type="number"
            placeholder="35000"
            value={item.shippingEstimate}
            onChange={e => onUpdate('shippingEstimate', e.target.value)}
          />
        </div>

        {/* Final price preview */}
        {(item.price || item.shippingEstimate) && (
          <div style={{
            background: 'var(--color-primary-light)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-2) var(--space-3)',
            display: 'flex',
            justifyContent: 'space-between',
          }}>
            <span className="text-xs" style={{ color: 'var(--color-primary)' }}>{t('final_price')}</span>
            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-primary)' }}>
              Rp {item.finalPrice.toLocaleString('id-ID')}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
