import { useState, useEffect } from 'react'
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../contexts/AuthContext'
import { Avatar } from './ui'
import { Send, MessageSquare } from 'lucide-react'
import { timeAgo } from '../lib/utils'

export default function GODiscussion({ goId, gomUid }) {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    const q = query(
      collection(db, 'group_orders', goId, 'discussions'),
      orderBy('createdAt', 'asc')
    )
    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return unsub
  }, [goId])

  async function handleSend(e) {
    e.preventDefault()
    if (!text.trim() || !user) return
    setSending(true)
    try {
      await addDoc(collection(db, 'group_orders', goId, 'discussions'), {
        text: text.trim(),
        uid: user.uid,
        displayName: user.displayName,
        photoURL: user.photoURL,
        isGom: user.uid === gomUid,
        createdAt: serverTimestamp()
      })
      setText('')
    } catch (err) {
      console.error('Failed to send message:', err)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
      <h2 style={{ fontSize: '0.9375rem', marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <MessageSquare size={16} /> Diskusi / Q&A
      </h2>

      <div style={{
        display: 'flex', flexDirection: 'column', gap: 'var(--space-3)',
        maxHeight: 300, overflowY: 'auto', marginBottom: 'var(--space-3)',
        paddingRight: 4
      }}>
        {messages.length === 0 ? (
          <p className="text-sm text-secondary" style={{ textAlign: 'center', padding: 'var(--space-4) 0' }}>
            Belum ada diskusi. Tanyakan sesuatu!
          </p>
        ) : (
          messages.map(msg => (
            <div key={msg.id} style={{
              display: 'flex', gap: 'var(--space-2)',
              flexDirection: msg.uid === user?.uid ? 'row-reverse' : 'row'
            }}>
              <Avatar src={msg.photoURL} name={msg.displayName} size="sm" />
              <div style={{
                background: msg.uid === user?.uid ? 'var(--color-primary-light)' : 'var(--color-bg)',
                padding: 'var(--space-2) var(--space-3)',
                borderRadius: 'var(--radius-lg)',
                borderTopRightRadius: msg.uid === user?.uid ? 0 : 'var(--radius-lg)',
                borderTopLeftRadius: msg.uid === user?.uid ? 'var(--radius-lg)' : 0,
                maxWidth: '85%'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, flexDirection: msg.uid === user?.uid ? 'row-reverse' : 'row' }}>
                  <span className="font-semibold" style={{ fontSize: '0.75rem' }}>{msg.displayName}</span>
                  {msg.isGom && <span className="pill pill-primary" style={{ padding: '2px 6px', fontSize: '0.625rem' }}>GOM</span>}
                </div>
                <p style={{ fontSize: '0.875rem' }}>{msg.text}</p>
                <p className="text-secondary" style={{ fontSize: '0.625rem', marginTop: 4, textAlign: msg.uid === user?.uid ? 'right' : 'left' }}>
                  {msg.createdAt ? timeAgo(msg.createdAt) : 'Baru saja'}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSend} style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <input
          className="input"
          placeholder="Tulis pertanyaan..."
          value={text}
          onChange={e => setText(e.target.value)}
          style={{ flex: 1 }}
        />
        <button type="submit" className="btn btn-primary" disabled={sending || !text.trim()} style={{ padding: '0 var(--space-3)' }}>
          <Send size={16} />
        </button>
      </form>
    </div>
  )
}
