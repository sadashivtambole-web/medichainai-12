// OCR helpers for reading batch number / expiry date off a medicine label.
//
// Engine resolution order:
//   1. Backend OCR endpoint, if VITE_API_BASE is set (recommended for production).
//   2. tesseract.js in the browser, if it is installed (`npm install tesseract.js`).
// If neither is available we throw OcrUnavailableError so the UI can explain
// what to do instead of failing silently.

const API_BASE = import.meta.env.VITE_API_BASE || ''

export class OcrUnavailableError extends Error {
  constructor() {
    super('No OCR engine available.')
    this.name = 'OcrUnavailableError'
  }
}

/** Run OCR on an image File/Blob. onProgress receives 0..1. */
export async function runOcr(file, onProgress = () => {}) {
  if (API_BASE) {
    const { default: axios } = await import('axios')
    const form = new FormData()
    form.append('image', file)
    onProgress(0.3)
    const { data } = await axios.post(`${API_BASE}/api/ocr`, form)
    onProgress(1)
    return { text: data.text ?? '', engine: 'server' }
  }

  let Tesseract
  try {
    Tesseract = await import('tesseract.js')
  } catch {
    throw new OcrUnavailableError()
  }

  const { data } = await Tesseract.recognize(file, 'eng', {
    logger: (m) => {
      if (m.status === 'recognizing text') onProgress(m.progress)
    },
  })
  return { text: data.text ?? '', engine: 'browser' }
}

const BATCH_RE = /\b(?:b\.?\s*no|batch(?:\s*no)?|lot)\b[^A-Za-z0-9]{0,4}([A-Z0-9][A-Z0-9-]{3,})/i
const EXPIRY_RE =
  /\b(?:exp(?:iry)?|use\s*before|best\s*before)\b[^A-Za-z0-9]{0,6}((?:\d{1,2}[/\-. ])?(?:\d{1,2}|[A-Za-z]{3,9})[/\-. ]\d{2,4})/i
const CODE_RE = /\bMEDG-[A-Z0-9-]+\b/i

/** Pull the interesting fields out of raw OCR text. */
export function parseLabel(text) {
  const flat = (text || '').replace(/\s+/g, ' ')
  return {
    raw: text || '',
    batch: flat.match(BATCH_RE)?.[1]?.toUpperCase() ?? null,
    expiry: flat.match(EXPIRY_RE)?.[1]?.trim() ?? null,
    code: flat.match(CODE_RE)?.[0]?.toUpperCase() ?? null,
  }
}
