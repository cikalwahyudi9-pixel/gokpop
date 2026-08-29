import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

const resources = {
  id: {
    translation: {
      // Common
      app_name: 'GOKpop',
      tagline: 'Group Order Kpop, Lebih Mudah & Transparan',
      save: 'Simpan',
      cancel: 'Batal',
      close: 'Tutup',
      back: 'Kembali',
      loading: 'Memuat...',
      error: 'Terjadi kesalahan',
      success: 'Berhasil',
      confirm: 'Konfirmasi',
      yes: 'Ya',
      no: 'Tidak',
      search: 'Cari...',
      all: 'Semua',
      see_all: 'Lihat semua',

      // Auth
      sign_in: 'Masuk',
      sign_out: 'Keluar',
      sign_in_with_google: 'Masuk dengan Google',
      sign_in_subtitle: 'Masuk untuk mulai',
      auto_register: 'Belum punya akun? Daftar otomatis saat pertama login',
      signing_in: 'Sedang masuk...',

      // Features
      realtime_tracking: 'Real-time tracking',
      auto_notif: 'Notifikasi otomatis',
      anti_scam: 'Anti-scam transparan',

      // Nav
      home: 'Beranda',
      my_orders: 'Pesanan',
      notifications: 'Notifikasi',
      profile: 'Profil',
      my_go: 'GO Saya',

      // Explore
      explore_title: 'Jelajahi GO',
      search_go: 'Cari GO berdasarkan artis atau grup...',
      active_go: 'GO Aktif',
      no_go_found: 'Tidak ada GO aktif',
      join_go: 'Join GO',
      deadline: 'Tutup',
      slots_left: 'Sisa Slot',
      items_count: '{{count}} item',

      // GO Status
      status_active: 'Aktif',
      status_waiting_payment: 'Menunggu Pembayaran',
      status_waiting_confirmation: 'Menunggu Konfirmasi',
      status_paid: 'Dibayar',
      status_ordered: 'Dipesan ke Seller',
      status_warehouse: 'Sampai Gudang',
      status_shipping: 'Dikirim ke Peserta',
      status_done: 'Selesai',
      status_cancelled_participant: 'Dibatalkan Peserta',
      status_cancelled_gom: 'Dibatalkan GOM',
      status_refund_processing: 'Refund Diproses',
      status_refund_done: 'Refund Selesai',

      // My Orders
      my_orders_title: 'Pesanan Saya',
      tab_all: 'Semua',
      tab_active: 'Aktif',
      tab_done: 'Selesai',
      tab_cancelled: 'Dibatalkan',
      upload_proof: 'Upload Bukti Bayar',
      pay_before: 'Bayar sebelum',
      view_detail: 'Lihat Detail',
      done_on: 'Selesai pada',
      no_orders: 'Belum ada pesanan',

      // GOM Dashboard
      gom_dashboard: 'Dashboard GOM',
      active_go_count: 'GO Aktif',
      total_participants: 'Total Peserta',
      create_go: '+ Buat GO Baru',
      my_go_list: 'GO Saya',
      manage: 'Kelola',

      // Create GO
      create_go_title: 'Buat GO Baru',
      go_name: 'Nama GO',
      artist_group: 'Artis / Grup',
      deadline_label: 'Deadline Pemesanan',
      quota: 'Kuota Slot',
      items: 'Daftar Item',
      add_item: '+ Tambah Item',
      item_name: 'Nama Item',
      item_price: 'Harga',
      item_stock: 'Stok',
      shipping_estimate: 'Estimasi Ongkir',
      final_price: 'Harga Final (incl. ongkir)',
      publish: 'Publish GO',

      // War
      war_title: 'War',
      war_started: 'War Dimulai!',
      war_subtitle: 'Klaim item terbatas sekarang!',
      war_starts_in: 'Dimulai dalam',
      claim_now: 'Klaim Sekarang',
      sold_out: 'Habis',
      stock_left: 'Sisa: {{count}} buah',
      war_notice: 'Klaim berdasarkan waktu server — transparan & adil',
      war_history_note: 'Riwayat klaim tersedia setelah war selesai',

      // Cancel / Refund
      cancel_order: 'Batalkan Pesanan',
      cancel_reason: 'Alasan pembatalan',
      cancel_go: 'Batalkan GO',
      refund_status: 'Status Refund',

      // Notifications
      notif_title: 'Notifikasi',
      notif_empty: 'Tidak ada notifikasi',
      mark_all_read: 'Tandai semua dibaca',

      // Profile / GOM Bio
      profile_title: 'Profil',
      gom_history: 'Riwayat GO',
      verified: 'Terverifikasi',
      not_verified: 'Belum Terverifikasi',
      verify_wa: 'Verifikasi WhatsApp',
      completed_go: 'GO Selesai',
      active_go_profile: 'GO Aktif',

      // Errors
      error_join: 'Gagal join GO. Coba lagi.',
      error_upload: 'Gagal upload bukti bayar.',
      error_claim: 'Gagal klaim. Item mungkin sudah habis.',
      slot_full: 'Slot sudah penuh',
    },
  },
  en: {
    translation: {
      app_name: 'GOKpop',
      tagline: 'K-pop Group Orders, Easier & Transparent',
      save: 'Save',
      cancel: 'Cancel',
      close: 'Close',
      back: 'Back',
      loading: 'Loading...',
      error: 'Something went wrong',
      success: 'Success',
      confirm: 'Confirm',
      yes: 'Yes',
      no: 'No',
      search: 'Search...',
      all: 'All',
      see_all: 'See all',

      sign_in: 'Sign In',
      sign_out: 'Sign Out',
      sign_in_with_google: 'Sign in with Google',
      sign_in_subtitle: 'Sign in to get started',
      auto_register: "Don't have an account? You'll be registered automatically on first login",
      signing_in: 'Signing in...',

      realtime_tracking: 'Real-time tracking',
      auto_notif: 'Automatic notifications',
      anti_scam: 'Anti-scam transparent',

      home: 'Home',
      my_orders: 'Orders',
      notifications: 'Notifications',
      profile: 'Profile',
      my_go: 'My GO',

      explore_title: 'Explore GO',
      search_go: 'Search GO by artist or group...',
      active_go: 'Active GO',
      no_go_found: 'No active GO found',
      join_go: 'Join GO',
      deadline: 'Closes',
      slots_left: 'Slots Left',
      items_count: '{{count}} items',

      status_active: 'Active',
      status_waiting_payment: 'Waiting for Payment',
      status_waiting_confirmation: 'Waiting Confirmation',
      status_paid: 'Paid',
      status_ordered: 'Ordered from Seller',
      status_warehouse: 'At Local Warehouse',
      status_shipping: 'Shipping to Participant',
      status_done: 'Completed',
      status_cancelled_participant: 'Cancelled by Participant',
      status_cancelled_gom: 'Cancelled by GOM',
      status_refund_processing: 'Refund Processing',
      status_refund_done: 'Refund Completed',

      my_orders_title: 'My Orders',
      tab_all: 'All',
      tab_active: 'Active',
      tab_done: 'Completed',
      tab_cancelled: 'Cancelled',
      upload_proof: 'Upload Payment Proof',
      pay_before: 'Pay before',
      view_detail: 'View Detail',
      done_on: 'Completed on',
      no_orders: 'No orders yet',

      gom_dashboard: 'GOM Dashboard',
      active_go_count: 'Active GO',
      total_participants: 'Total Participants',
      create_go: '+ Create New GO',
      my_go_list: 'My GO',
      manage: 'Manage',

      create_go_title: 'Create New GO',
      go_name: 'GO Name',
      artist_group: 'Artist / Group',
      deadline_label: 'Order Deadline',
      quota: 'Slot Quota',
      items: 'Item List',
      add_item: '+ Add Item',
      item_name: 'Item Name',
      item_price: 'Price',
      item_stock: 'Stock',
      shipping_estimate: 'Estimated Shipping',
      final_price: 'Final Price (incl. shipping)',
      publish: 'Publish GO',

      war_title: 'War',
      war_started: 'War Started!',
      war_subtitle: 'Claim limited items now!',
      war_starts_in: 'Starts in',
      claim_now: 'Claim Now',
      sold_out: 'Sold Out',
      stock_left: 'Left: {{count}}',
      war_notice: 'Claims are based on server timestamp — transparent & fair',
      war_history_note: 'Claim history will be available after war ends',

      cancel_order: 'Cancel Order',
      cancel_reason: 'Cancellation reason',
      cancel_go: 'Cancel GO',
      refund_status: 'Refund Status',

      notif_title: 'Notifications',
      notif_empty: 'No notifications',
      mark_all_read: 'Mark all as read',

      profile_title: 'Profile',
      gom_history: 'GO History',
      verified: 'Verified',
      not_verified: 'Not Verified',
      verify_wa: 'Verify WhatsApp',
      completed_go: 'Completed GO',
      active_go_profile: 'Active GO',

      error_join: 'Failed to join GO. Please try again.',
      error_upload: 'Failed to upload payment proof.',
      error_claim: 'Claim failed. Item may be sold out.',
      slot_full: 'Slots are full',
    },
  },
}

i18n.use(initReactI18next).init({
  resources,
  lng: 'id',
  fallbackLng: 'id',
  interpolation: { escapeValue: false },
})

export default i18n
