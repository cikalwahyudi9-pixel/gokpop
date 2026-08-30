import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { useTranslation } from 'react-i18next'
import { db } from '../lib/firebase'
import { uploadImage } from '../lib/upload'
import { useAuth } from '../contexts/AuthContext'
import { ArrowLeft, Upload, Image, CheckCircle } from 'lucide-react'

export default function UploadPaymentPage() {
  const { goId, participantId } = useParams()
  const { user }   = useAuth()
  const { t }      = useTranslation()
  const navigate   = useNavigate()

  const [file, setFile]       = useState(null)
  const [preview, setPreview] = useState(null)
  const [progress, setProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [done, setDone]       = useState(false)
  const [error, setError]     = useState('')
  const [dragging, setDragging] = useState(false)
  const [qrisUrl, setQrisUrl]   = useState(null)
  const [bankName, setBankName] = useState(null)
  const [bankAccount, setBankAccount] = useState(null)
  const [gomName, setGomName]   = useState('')
  const inputRef = useRef()

  useEffect(() => {
    async function loadQRIS() {
      try {
        const goSnap = await getDoc(doc(db, 'group_orders', goId))
        if (goSnap.exists()) {
          const data = goSnap.data()
          setGomName(data.gomName || 'GOM')
          setQrisUrl(data.qrisUrl || null)
          setBankName(data.bankName || null)
          setBankAccount(data.bankAccount || null)
        }
      } catch (err) {
        console.error('Error loading QRIS:', err)
      }
    }
    loadQRIS()
  }, [goId])

  function handleFile(f) {
    if (!f || !f.type.startsWith('image/')) { setError('File harus berupa gambar (JPG/PNG/WEBP).'); return }
    if (f.size > 5 * 1024 * 1024) { setError('Ukuran file maksimal 5MB.'); return }
    setFile(f)
    setError('')
    const reader = new FileReader()
    reader.onload = e => setPreview(e.target.result)
    reader.readAsDataURL(f)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    handleFile(f)
  }

  async function handleUpload() {
    if (!file) return
    setUploading(true)
    setError('')

    try {
      const downloadURL = await uploadImage(file, setProgress)

      // Update participant record
      // Note: Need the participantId — in real app, pass it via state or query
      const participantRef = doc(db, 'group_orders', goId, 'participants', participantId)
      await updateDoc(participantRef, {
        paymentProofUrl: downloadURL,
        orderStatus: 'menunggu_konfirmasi',
        paidAt: serverTimestamp(),
      })

      setDone(true)
      setTimeout(() => navigate('/pesanan'), 2000)
    } catch (err) {
      console.error(err)
      setError(t('error_upload'))
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg)' }}>
      <div className="page-header">
        <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm" style={{ marginLeft: -8 }}>
          <ArrowLeft size={18} />
        </button>
        <h1 style={{ fontSize: '1rem', flex: 1, textAlign: 'center' }}>{t('upload_proof')}</h1>
        <div style={{ width: 56 }} />
      </div>

      <div className="page" style={{ paddingTop: 'var(--space-4)' }}>
        {done ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-12) 0' }}>
            <CheckCircle size={56} style={{ color: 'var(--color-success)', margin: '0 auto var(--space-4)' }} />
            <h2 style={{ color: 'var(--color-success)', marginBottom: 'var(--space-2)' }}>Bukti bayar diterima!</h2>
            <p className="text-secondary text-sm">GOM akan segera mengonfirmasi pembayaran kamu.</p>
          </div>
        ) : (
          <>
            {qrisUrl && (
              <div className="card" style={{ marginBottom: 'var(--space-4)', textAlign: 'center' }}>
                <h2 style={{ fontSize: '1rem', marginBottom: 'var(--space-2)' }}>Bayar Instan dengan QRIS</h2>
                <p className="text-sm text-secondary" style={{ marginBottom: 'var(--space-3)' }}>Scan QRIS {gomName} di bawah ini untuk membayar.</p>
                <img src={qrisUrl} alt="QRIS GOM" style={{ width: '100%', maxWidth: 250, borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} />
              </div>
            )}

            {(bankName || bankAccount) && (
              <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
                <h2 style={{ fontSize: '0.9375rem', marginBottom: 'var(--space-3)' }}>Transfer Bank / E-Wallet</h2>
                {bankName && <p className="text-sm"><strong>Bank/Wallet:</strong> {bankName}</p>}
                {bankAccount && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                    <p className="text-sm" style={{ fontFamily: 'monospace', fontSize: '1.1rem' }}>{bankAccount}</p>
                    <button 
                      className="btn btn-outline btn-sm" 
                      onClick={() => { navigator.clipboard.writeText(bankAccount); alert('No rekening disalin!') }}
                    >
                      Salin
                    </button>
                  </div>
                )}
              </div>
            )}

            <p className="text-secondary text-sm" style={{ marginBottom: 'var(--space-5)' }}>
              Upload foto/screenshot bukti transfer kamu. Pastikan nominal, nama rekening, dan tanggal terlihat jelas.
            </p>

            {error && (
              <div style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)', fontSize: '0.875rem' }}>
                {error}
              </div>
            )}

            {/* Upload zone */}
            <div
              className={`upload-zone ${dragging ? 'drag-over' : ''}`}
              style={{ marginBottom: 'var(--space-4)', cursor: 'pointer' }}
              onClick={() => inputRef.current.click()}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              {preview ? (
                <img src={preview} alt="preview" style={{ maxHeight: 240, borderRadius: 'var(--radius-md)', margin: '0 auto' }} />
              ) : (
                <>
                  <Image size={36} style={{ color: 'var(--color-text-disabled)', margin: '0 auto var(--space-3)' }} />
                  <p className="font-medium" style={{ marginBottom: 4 }}>Tap untuk pilih gambar</p>
                  <p className="text-xs text-secondary">atau drag & drop di sini</p>
                  <p className="text-xs text-secondary" style={{ marginTop: 'var(--space-2)' }}>JPG, PNG, WEBP — maks. 5MB</p>
                </>
              )}
            </div>

            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => handleFile(e.target.files[0])}
            />

            {preview && !uploading && (
              <button className="btn btn-ghost btn-sm" style={{ marginBottom: 'var(--space-3)' }} onClick={() => { setFile(null); setPreview(null) }}>
                Ganti gambar
              </button>
            )}

            {/* Progress */}
            {uploading && (
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <div className="flex justify-between" style={{ marginBottom: 4 }}>
                  <span className="text-sm text-secondary">Mengupload...</span>
                  <span className="text-sm font-medium">{progress}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-bar__fill" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

            <button
              className="btn btn-primary btn-full btn-lg"
              disabled={!file || uploading}
              onClick={handleUpload}
            >
              <Upload size={18} />
              {uploading ? `Mengupload... ${progress}%` : 'Kirim Bukti Bayar'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
