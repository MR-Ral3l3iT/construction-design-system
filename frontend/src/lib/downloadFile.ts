export async function downloadFile(url: string, filename: string) {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('client_access_token') : null
    const res = await fetch(url, token ? { headers: { Authorization: `Bearer ${token}` } } : {})
    const blob = await res.blob()
    const objectUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(objectUrl)
  } catch {
    window.open(url, '_blank')
  }
}
