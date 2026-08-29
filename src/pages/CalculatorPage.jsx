import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Calculator, Search } from 'lucide-react'

// Dummy rates for calculation (Foreign to IDR)
const COUNTRIES = [
  { id: 'kr', name: 'Korea', code: 'KRW', rate: 12, symbol: '₩', flag: '🇰🇷' },
  { id: 'cn', name: 'China', code: 'CNY', rate: 2150, symbol: '¥', flag: '🇨🇳' },
  { id: 'jp', name: 'Jepang', code: 'JPY', rate: 104, symbol: '¥', flag: '🇯🇵' },
  { id: 'th', name: 'Thailand', code: 'THB', rate: 430, symbol: '฿', flag: '🇹🇭' },
  { id: 'ph', name: 'Filipina', code: 'PHP', rate: 280, symbol: '₱', flag: '🇵🇭' },
]

export default function CalculatorPage() {
  const navigate = useNavigate()
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0])
  const [inputValue, setInputValue] = useState('')

  const numericValue = parseFloat(inputValue || '0')
  const estimatedTotal = numericValue * selectedCountry.rate

  const handleNumpad = (num) => {
    if (inputValue.length > 10) return
    setInputValue(prev => prev + num)
  }

  const handleDelete = () => {
    setInputValue(prev => prev.slice(0, -1))
  }

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
        </div>

        {/* Display */}
        <div className="card" style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-4)', background: 'var(--color-primary-light)' }}>
          <p className="text-xs font-semibold text-secondary" style={{ marginBottom: 'var(--space-2)', textTransform: 'uppercase' }}>Harga Barang (Per Item)</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', borderBottom: '2px solid var(--color-primary)', paddingBottom: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
            <span style={{ fontSize: '1.5rem', color: 'var(--color-primary)', marginRight: 'var(--space-2)' }}>{selectedCountry.symbol}</span>
            <span style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--color-primary)', letterSpacing: -1 }}>
              {inputValue ? Number(inputValue).toLocaleString('en-US') : '0'}
            </span>
          </div>

          <div style={{ background: '#fff', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)' }}>
            <p className="text-xs text-secondary" style={{ marginBottom: 4 }}>Estimasi Harga (IDR)</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-text)' }}>
              Rp {estimatedTotal.toLocaleString('id-ID')}
            </p>
          </div>
        </div>

        {/* Keypad */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-2)', marginBottom: 'var(--space-6)' }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, '00', 0, 'DEL'].map((key) => (
            <button
              key={key}
              onClick={() => key === 'DEL' ? handleDelete() : handleNumpad(key.toString())}
              className="card"
              style={{
                padding: 'var(--space-3)',
                textAlign: 'center',
                fontSize: '1.25rem',
                fontWeight: 600,
                border: 'none',
                boxShadow: 'var(--shadow-sm)',
                background: 'var(--color-surface)',
                cursor: 'pointer'
              }}
            >
              {key === 'DEL' ? '⌫' : key}
            </button>
          ))}
        </div>

        <button 
          className="btn btn-primary btn-full"
          onClick={() => navigate(`/?country=${selectedCountry.name}`)}
        >
          <Search size={16} /> Cari GO dari {selectedCountry.name}
        </button>
      </div>
    </div>
  )
}
