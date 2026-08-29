/**
 * Helper to upload image to ImgBB
 * @param {File} file 
 * @param {function} onProgress callback for progress (0-100)
 * @returns {Promise<string>} url of the uploaded image
 */
export async function uploadImage(file, onProgress) {
  return new Promise((resolve, reject) => {
    const formData = new FormData()
    formData.append('image', file)
    formData.append('key', import.meta.env.VITE_IMGBB_API_KEY || 'fc29833618c280bea1eb6898d7b45488')

    const xhr = new XMLHttpRequest()
    xhr.open('POST', 'https://api.imgbb.com/1/upload', true)
    
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    }
    
    xhr.onload = () => {
      if (xhr.status === 200) {
        const res = JSON.parse(xhr.responseText)
        resolve(res.data.url)
      } else {
        reject(new Error('Gagal upload gambar ke ImgBB'))
      }
    }
    
    xhr.onerror = () => reject(new Error('Terjadi kesalahan jaringan'))
    xhr.send(formData)
  })
}
