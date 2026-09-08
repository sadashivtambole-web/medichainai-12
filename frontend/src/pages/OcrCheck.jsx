import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Link } from 'react-router-dom'
import { ScanText, Loader2, Image as ImageIcon, Info } from 'lucide-react'
import toast from 'react-hot-toast'
import { runOcr, parseLabel, OcrUnavailableError } from '../lib/ocr'
import { verifyBatch, verifyPack } from '../lib/verifyPack'
import ResultCard from '../components/ResultCard.jsx'

export default function OcrCheck() {
  const [preview, setPreview] = useState(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [fields, setFields] = useState(null)
  const [result, setResult] = useState(null)
  const [unavailable, setUnavailable] = useState(false)

  const onDrop = useCallback(async (accepted) => {
    const file = accepted?.[0]
    if (!file) return

    setPreview((old) => {
      if (old) URL.revokeObjectURL(old)
      return URL.createObjectURL(file)
    })
    setFields(null)
    setResult(null)
    setUnavailable(false)
    setProgress(0)
    setBusy(true)

    try {
      const { text } = await runOcr(file, setProgress)
      const parsed = parseLabel(text)
      setFields(parsed)

      // Prefer an explicit pack code if the label carries one, else use the batch.
      const res = parsed.code
        ? await verifyPack(parsed.code)
        : await verifyBatch(parsed.batch)
      setResult(res)

      if (!parsed.batch && !parsed.code) {
        toast('Text read, but no batch number found', { icon: '🔍' })
      } else if (res.status === 'genuine') {
        toast.success('Label matches an authentic pack')
      } else if (res.status === 'expired') {
        toast('Genuine but expired', { icon: '⚠️' })
      } else {
        toast.error('Label did not match the registry')
      }
    } catch (err) {
      if (err instanceof OcrUnavailableError) {
        setUnavailable(true)
      } else {
        console.error(err)
        toast.error('Could not read that image. Try a sharper, straighter photo.')
      }
    } finally {
      setBusy(false)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: 1,
    disabled: busy,
  })

  return (
    <main className="mx-auto max-w-2xl px-6 py-16 text-center">
      <ScanText className="mx-auto h-12 w-12 text-brand" />
      <h1 className="mt-4 font-serif text-4xl text-slate-900">Read the label</h1>
      <p className="mx-auto mt-3 max-w-xl text-slate-600">
        Upload a photo of the pack. We extract the batch number and expiry date from the
        printed label and cross-check them against the registry — useful when the QR code
        is damaged or missing.
      </p>

      <div
        {...getRootProps()}
        className={`mt-8 cursor-pointer rounded-2xl border-2 border-dashed p-10 transition ${
          isDragActive ? 'border-brand bg-brand/5' : 'border-slate-300 bg-white hover:bg-slate-50'
        } ${busy ? 'cursor-not-allowed opacity-60' : ''}`}
      >
        <input {...getInputProps()} />
        <ImageIcon className="mx-auto h-8 w-8 text-slate-400" />
        <p className="mt-3 font-medium text-slate-700">
          {isDragActive ? 'Drop the photo here' : 'Drag a label photo here, or click to choose'}
        </p>
        <p className="mt-1 text-sm text-slate-500">PNG or JPG, one image at a time</p>
      </div>

      {preview && (
        <img
          src={preview}
          alt="Uploaded medicine label"
          className="mx-auto mt-6 max-h-64 rounded-xl border border-slate-200 object-contain"
        />
      )}

      {busy && (
        <div className="mt-6 flex items-center justify-center gap-2 text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          Reading label… {Math.round(progress * 100)}%
        </div>
      )}

      {unavailable && (
        <div className="mt-6 flex gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 text-left text-sm text-sky-900">
          <Info className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">OCR engine not installed yet.</p>
            <p className="mt-1">
              Run <code className="rounded bg-white px-1 py-0.5 font-mono">npm install tesseract.js</code>{' '}
              in the <code className="rounded bg-white px-1 py-0.5 font-mono">frontend</code> folder
              to read labels in the browser, or set{' '}
              <code className="rounded bg-white px-1 py-0.5 font-mono">VITE_API_BASE</code> to use a
              server-side OCR endpoint.
            </p>
          </div>
        </div>
      )}

      {fields && (
        <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl border border-slate-200 bg-white p-5 text-left text-sm">
          <dt className="text-slate-500">Batch detected</dt>
          <dd className="font-mono text-slate-900">{fields.batch ?? '—'}</dd>
          <dt className="text-slate-500">Expiry detected</dt>
          <dd className="font-mono text-slate-900">{fields.expiry ?? '—'}</dd>
          <dt className="text-slate-500">Pack code detected</dt>
          <dd className="break-all font-mono text-slate-900">{fields.code ?? '—'}</dd>
        </dl>
      )}

      {result && <ResultCard result={result} />}

      <Link to="/" className="mt-8 inline-block text-brand hover:underline">
        &larr; Back home
      </Link>
    </main>
  )
}
