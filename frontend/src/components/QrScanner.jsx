import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import jsQR from 'jsqr'
import { Camera, CameraOff, Upload } from 'lucide-react'
import toast from 'react-hot-toast'

const REGION_ID = 'qr-reader-region'

export default function QrScanner({ onResult }) {
  const scannerRef = useRef(null)
  const [scanning, setScanning] = useState(false)

  // Ensure the camera is released if the component unmounts mid-scan.
  useEffect(() => {
    return () => {
      const s = scannerRef.current
      if (s && s.isScanning) {
        s.stop().catch(() => {}).then(() => s.clear().catch(() => {}))
      }
    }
  }, [])

  async function startCamera() {
    try {
      const scanner = new Html5Qrcode(REGION_ID)
      scannerRef.current = scanner
      setScanning(true)
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText) => {
          stopCamera()
          onResult(decodedText)
        },
        () => {}, // per-frame decode errors are noisy; ignore
      )
    } catch (err) {
      setScanning(false)
      toast.error('Could not start the camera. Check permissions or use image upload.')
      console.error(err)
    }
  }

  async function stopCamera() {
    const s = scannerRef.current
    if (s && s.isScanning) {
      try {
        await s.stop()
        await s.clear()
      } catch (e) {
        console.error(e)
      }
    }
    setScanning(false)
  }

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0)
      const { data, width, height } = ctx.getImageData(0, 0, img.width, img.height)
      const result = jsQR(data, width, height)
      if (result?.data) {
        onResult(result.data)
      } else {
        toast.error('No QR code found in that image.')
      }
      URL.revokeObjectURL(img.src)
    }
    img.src = URL.createObjectURL(file)
    e.target.value = '' // allow re-uploading the same file
  }

  return (
    <div className="space-y-4">
      <div
        id={REGION_ID}
        className="mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-2xl border border-slate-200 bg-slate-100"
      />
      <div className="flex flex-wrap items-center justify-center gap-3">
        {!scanning ? (
          <button
            type="button"
            onClick={startCamera}
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 font-medium text-white transition hover:bg-brand-dark"
          >
            <Camera className="h-4 w-4" /> Start camera
          </button>
        ) : (
          <button
            type="button"
            onClick={stopCamera}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-5 py-2.5 font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <CameraOff className="h-4 w-4" /> Stop camera
          </button>
        )}
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-5 py-2.5 font-medium text-slate-700 transition hover:bg-slate-50">
          <Upload className="h-4 w-4" /> Upload image
          <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
        </label>
      </div>
    </div>
  )
}
