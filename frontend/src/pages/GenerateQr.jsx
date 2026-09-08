import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { QRCodeCanvas } from 'qrcode.react'
import { Download, QrCode } from 'lucide-react'
import toast from 'react-hot-toast'
import { mockRegistry } from '../data/mockRegistry'

const codes = Object.keys(mockRegistry)

export default function GenerateQr() {
  const [code, setCode] = useState(codes[0])
  const holderRef = useRef(null)
  const pack = mockRegistry[code]

  function download() {
    const canvas = holderRef.current?.querySelector('canvas')
    if (!canvas) {
      toast.error('Nothing to download yet.')
      return
    }
    const link = document.createElement('a')
    link.href = canvas.toDataURL('image/png')
    link.download = `${code || 'pack'}.png`
    link.click()
    toast.success('QR code downloaded')
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-16 text-center">
      <QrCode className="mx-auto h-12 w-12 text-brand" />
      <h1 className="mt-4 font-serif text-4xl text-slate-900">Generate a pack QR</h1>
      <p className="mx-auto mt-3 max-w-xl text-slate-600">
        The manufacturer side of the system. Produce the QR code that goes on a pack — or
        generate one here, open it on another screen, and scan it on the Verify page to
        test the full loop.
      </p>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {codes.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCode(c)}
              className={`rounded-lg px-3 py-1.5 text-xs font-mono transition ${
                code === c
                  ? 'bg-brand text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Or type any code to encode"
          className="mt-4 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-center font-mono outline-none focus:border-brand"
        />

        <div ref={holderRef} className="mt-6 flex justify-center">
          {code ? (
            <QRCodeCanvas
              value={code}
              size={220}
              level="M"
              includeMargin
              bgColor="#ffffff"
              fgColor="#08060d"
            />
          ) : (
            <p className="py-16 text-sm text-slate-500">Enter a code to see its QR.</p>
          )}
        </div>

        {pack && (
          <dl className="mx-auto mt-4 grid max-w-sm grid-cols-2 gap-x-4 gap-y-1 text-left text-sm">
            <dt className="text-slate-500">Medicine</dt>
            <dd className="text-slate-900">{pack.name}</dd>
            <dt className="text-slate-500">Batch</dt>
            <dd className="text-slate-900">{pack.batch}</dd>
            <dt className="text-slate-500">Expiry</dt>
            <dd className="text-slate-900">{pack.expiry}</dd>
          </dl>
        )}

        <button
          type="button"
          onClick={download}
          disabled={!code}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 font-medium text-white transition hover:bg-brand-dark disabled:opacity-60"
        >
          <Download className="h-4 w-4" /> Download PNG
        </button>
      </div>

      <Link to="/" className="mt-8 inline-block text-brand hover:underline">
        &larr; Back home
      </Link>
    </main>
  )
}
