import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { useTranslation } from 'react-i18next'
import { db } from '../lib/firebase'
import { useAuth } from '../contexts/AuthContext'
import { ArrowLeft, Plus, Trash2, Calculator } from 'lucide-react'

const SHIPPING_RATE_PER_100G = 5000 // Rp 5.000 per 100g estimasi

function calcFinalPrice(basePrice, shippingEstimate) {
  return (parseFloat(basePrice) || 0) + (parseFloat(shippingEstimate) || 0)
}

function toLocalDatetimeString(date) {
  if (!date) return ''
  const d = new Date(date.getTime() - (date.getTimezoneOffset() * 60000))
  return d.toISOString().slice(0, 16)
}

export default function EditGOPage() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { goId } = useParams()
  
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState('')
  const [originalGo, setOriginalGo] = useState(null)

  const [form, setForm] = useState({
    name: '',
    artistGroup: '',
    deadline: '',
    quota: '',
    description: '',
  })

  const [items, setItems] = useState([])

  useEffect(() => {
    async function fetchGO() {
      try {
        const goSnap = await getDoc(doc(db, 'group_orders', goId))
        if (!goSnap.exists() || goSnap.data().createdBy !== user?.uid) {
          setError('Akses ditolak atau GO tidak ditemukan.')
          setLoading(false)
          return
        }
        const data = goSnap.data()
        setOriginalGo(data)
        
        setForm({
          name: data.name || '',
          artistGroup: data.artistGroup || '',
          deadline: data.deadline?.toDate ? toLocalDatetimeString(data.deadline.toDate()) : '',
          quota: data.quota || '',
          description: data.description || '',
        })
        
        if (data.items) {
          setItems(data.items.map(i => ({
            ...i,
            id: i.id || Date.now() + Math.random()
          })))
        }
      } catch (err) {
        setError('Gagal memuat GO.')
      } finally {
        setLoading(false)
      }
    }
    if (user) fetchGO()
  }, [goId, user])

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

    // Hitung perubahan kuota
    const newQuota = parseInt(form.quota)
    const currentQuota = originalGo.quota
    const diff = newQuota - currentQuota
    const newRemainingSlots = (originalGo.remainingSlots ?? originalGo.quota) + diff
    
    if (newRemainingSlots < 0) {
      setError(`Kuota tidak bisa diubah menjadi ${newQuota} karena peserta sudah mengisi slot lebih dari itu.`)
      return
    }

    try {
      setSaving(true)
      setError('')
      const minPrice = Math.min(...items.map(i => i.finalPrice))

      await updateDoc(doc(db, 'group_orders', goId), {
        name: form.name.trim(),
        artistGroup: form.artistGroup.trim(),
        description: form.description.trim(),
        deadline: new Date(form.deadline),
        quota: newQuota,
        remainingSlots: newRemainingSlots,
        items: items.map(({ id, ...rest }) => ({
          ...rest,
          price: parseFloat(rest.price),
          stock: rest.stock ? parseInt(rest.stock) : null,
          shippingEstimate: parseFloat(rest.shippingEstimate) || 0,
          finalPrice: calcFinalPrice(rest.price, rest.shippingEstimate),
        })),
        minPrice,
      })

      navigate(`/gom/go/${goId}`)
    } catch (err) {
      console.error(err)
      setError('Gagal menyimpan perubahan GO.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p className="text-secondary text-sm">Memuat data...</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-surface)' }}>
      {/* Header */}
      <div className="page-header">
        <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm" style={{ marginLeft: -8 }}>
          <ArrowLeft size={18} />
        </button>
        <h1 style={{ fontSize: '1.0625rem', flex: 1, textAlign: 'center' }}>Edit GO</h1>
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

              <div className="input-group">
                <label className="input-label">{t('artist_group')} <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                <input className="input" placeholder="cth: TWICE" value={form.artistGroup} onChange={e => updateForm('artistGroup', e.target.value)} />
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
            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
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
              Rp {item.finalPrice?.toLocaleString('id-ID')}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
