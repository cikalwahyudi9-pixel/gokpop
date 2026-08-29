/**
 * Format tanggal ke string Bahasa Indonesia
 * @param {Date|Timestamp} date
 * @param {object} options - Intl.DateTimeFormat options
 */
export function format(date, options = {}) {
  const d = date?.toDate ? date.toDate() : new Date(date)
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...options,
  })
}

/**
 * Format currency ke Rupiah
 */
export function formatRupiah(amount) {
  return `Rp ${Number(amount || 0).toLocaleString('id-ID')}`
}

/**
 * Hitung persentase slot terisi
 */
export function slotPercent(filled, total) {
  if (!total) return 0
  return Math.min(Math.round((filled / total) * 100), 100)
}

/**
 * Format relative time (e.g. "2 jam lalu")
 */
export function timeAgo(date) {
  const d   = date?.toDate ? date.toDate() : new Date(date)
  const now = new Date()
  const diff = Math.floor((now - d) / 1000)

  if (diff < 60)   return 'Baru saja'
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`
  return `${Math.floor(diff / 86400)} hari lalu`
}
