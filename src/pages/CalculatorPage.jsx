import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Calculator, Search, Receipt } from 'lucide-react'

// Kurs dan Estimasi Ongkir All-in (EMS + Pajak) per gram
const COUNTRIES = [
  { id: 'kr', name: 'Korea', code: 'KRW', rate: 12.5, emsRate: 180, symbol: '₩', flag: '🇰🇷' },
  { id: 'cn', name: 'China', code: 'CNY', rate: 2250, emsRate: 120, symbol: '¥', flag: '🇨🇳' },
  { id: 'jp', name: 'Jepang', code: 'JPY', rate: 105, emsRate: 200, symbol: '¥', flag: '🇯🇵' },
  { id: 'th', name: 'Thailand', code: 'THB', rate: 450, emsRate: 150, symbol: '฿', flag: '🇹🇭' },
  { id: 'ph', name: 'Filipina', code: 'PHP', rate: 285, emsRate: 150, symbol: '₱', flag: '🇵🇭' },
]

export default function CalculatorPage() {
  const navigate = useNavigate()
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0])
  
  const [price, setPrice] = useState('')
  const [weight, setWeight] = useState('')
  const [fee, setFee] = useState('')

  const numericPrice = parseFloat(price || '0')
  const numericWeight = parseFloat(weight || '0')
  const numericFee = parseFloat(fee || '0')

  const basePriceIdr = numericPrice * selectedCountry.rate
  const shippingIdr = numericWeight * selectedCountry.emsRate
  const estimatedTotal = basePriceIdr + shippingIdr + numericFee

  return (
    <div style={{ background: 'var(--color-bg)', minHeight: '100dvh', paddingBottom: 'var(--space-10)' }}>
      <div className="page-header" style={{ borderBottom: 'none' }}>
        <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm" style={{ marginLeft: -8 }}>
          <ArrowLeft size={18} />
        </button>
        <h1 style={{ fontSize: '1.125rem', flex: 1 }}>Kalkulator Harga</h1>
      </div>

      <div className="page">
        {/* Country Selector */}
        <div className="card" style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-4)' }}>
          <p className="text-xs font-semibold text-secondary" style={{ marginBottom: 'var(--space-3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Asal Negara Produk</p>
          <div style={{ display: 'flex', gap: 'var(--space-3)', overflowX: 'auto', paddingBottom: 'var(--space-2)' }}>
            {COUNTRIES.map(country => (
              <button
                key={country.id}
                onClick={() => setSelectedCountry(country)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-lg)',
                  border: `2px solid ${selectedCountry.id === country.id ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  background: selectedCountry.id === country.id ? 'var(--color-primary-light)' : 'var(--color-surface)',
                  minWidth: 80,
                  transition: 'all 0.2s',
                  opacity: selectedCountry.id === country.id ? 1 : 0.7
                }}
              >
                <span style={{ fontSize: '1.5rem' }}>{country.flag}</span>
                <span style={{ fontSize: '0.75rem', fontWeight: selectedCountry.id === country.id ? 700 : 500 }}>{country.name}</span>
              </button>
            ))}
          </div>
          <div style={{ marginTop: 'var(--space-3)', padding: 'var(--space-2)', background: 'var(--color-bg)', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between' }}>
            <span className="text-xs text-secondary">Kurs: Rp{selectedCountry.rate}</span>
            <span className="text-xs text-secondary">EMS+Pajak: Rp{selectedCountry.emsRate}/g</span>
          </div>
        </div>

        {/* Inputs */}
        <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
          <h2 style={{ fontSize: '0.9375rem', marginBottom: 'var(--space-4)' }}>Detail Barang</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div className="input-group">
              <label className="input-label">Harga Barang Asli ({selectedCountry.symbol})</label>
              <input 
                type="number" 
                className="input" 
                placeholder="cth: 15000" 
                value={price} 
                onChange={(e) => setPrice(e.target.value)} 
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <div className="input-group">
                <label className="input-label">Estimasi Berat (gram)</label>
                <input 
                  type="number" 
                  className="input" 
                  placeholder="cth: 500" 
                  value={weight} 
                  onChange={(e) => setWeight(e.target.value)} 
                />
              </div>
              <div className="input-group">
                <label className="input-label">Fee GOM (Rp)</label>
                <input 
                  type="number" 
                  className="input" 
                  placeholder="cth: 10000" 
                  value={fee} 
                  onChange={(e) => setFee(e.target.value)} 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Result */}
        <div className="card" style={{ marginBottom: 'var(--space-6)', background: 'var(--color-primary)', color: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-4)' }}>
            <Receipt size={18} />
            <h2 style={{ fontSize: '0.9375rem', color: '#fff' }}>Rincian Harga Akhir (IDR)</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', opacity: 0.9 }}>
              <span>Barang ({selectedCountry.symbol}{numericPrice.toLocaleString()})</span>
              <span>Rp {basePriceIdr.toLocaleString('id-ID')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', opacity: 0.9 }}>
              <span>EMS & Pajak ({numericWeight}g)</span>
              <span>Rp {shippingIdr.toLocaleString('id-ID')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', opacity: 0.9 }}>
              <span>Fee GOM</span>
              <span>Rp {numericFee.toLocaleString('id-ID')}</span>
            </div>
          </div>

          <div style={{ borderTop: '1px dashed rgba(255,255,255,0.3)', paddingTop: 'var(--space-3)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Total Estimasi</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>
              Rp {estimatedTotal.toLocaleString('id-ID')}
            </span>
          </div>
        </div>

        <button 
          className="btn btn-outline btn-full"
          onClick={() => navigate(`/?country=${selectedCountry.name}`)}
        >
          <Search size={16} /> Cari GO dari {selectedCountry.name}
        </button>
      </div>
    </div>
  )
}

