const IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp']

export async function convertToWebP(file: File, maxWidth = 1920, quality = 0.85): Promise<File> {
  if (!IMAGE_MIME.includes(file.type)) return file

  return new Promise((resolve) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      let { naturalWidth: w, naturalHeight: h } = img
      if (w > maxWidth) {
        h = Math.round((h * maxWidth) / w)
        w = maxWidth
      }

      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file)
            return
          }
          const name = file.name.replace(/\.[^.]+$/, '.webp')
          resolve(new File([blob], name, { type: 'image/webp' }))
        },
        'image/webp',
        quality,
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(file)
    }
    img.src = objectUrl
  })
}

export function isImageFile(file: File): boolean {
  return IMAGE_MIME.includes(file.type)
}
