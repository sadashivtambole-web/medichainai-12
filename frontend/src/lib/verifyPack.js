import { mockRegistry } from '../data/mockRegistry'
// import axios from 'axios' // uncomment when a backend is available

const API_BASE = import.meta.env.VITE_API_BASE || ''

/**
 * Verify a scanned/entered pack code.
 * Returns { status, code, pack?, message }.
 * status is one of: 'genuine' | 'expired' | 'counterfeit'
 */
export async function verifyPack(rawCode) {
  const code = (rawCode || '').trim()
  if (!code) {
    return { status: 'counterfeit', code, message: 'No code provided.' }
  }

  // --- Real backend path (enable once the API exists) ---
  // if (API_BASE) {
  //   const { data } = await axios.get(`${API_BASE}/api/verify`, { params: { code } })
  //   return data
  // }

  // --- Local demo path (works with no backend) ---
  await new Promise((r) => setTimeout(r, 400)) // simulate network latency
  const pack = mockRegistry[code]

  if (!pack) {
    return {
      status: 'counterfeit',
      code,
      message: 'This code is not in the registry. Treat this pack as suspicious.',
    }
  }

  const expired = new Date(pack.expiry) < new Date()
  if (expired) {
    return {
      status: 'expired',
      code,
      pack,
      message: `Genuine pack, but expired on ${pack.expiry}. Do not use.`,
    }
  }

  return {
    status: 'genuine',
    code,
    pack,
    message: 'Verified authentic. Safe to dispense.',
  }
}

/**
 * Cross-check a batch number read off a label (via OCR) against the registry.
 * Returns the same shape as verifyPack().
 */
export async function verifyBatch(batch) {
  const wanted = (batch || '').trim().toUpperCase()
  if (!wanted) {
    return { status: 'counterfeit', code: '', message: 'No batch number detected.' }
  }

  const entry = Object.entries(mockRegistry).find(
    ([, p]) => p.batch.toUpperCase() === wanted,
  )
  if (!entry) {
    return {
      status: 'counterfeit',
      code: wanted,
      message: `Batch ${wanted} is not in the registry. Treat this pack as suspicious.`,
    }
  }

  const [code, pack] = entry
  if (new Date(pack.expiry) < new Date()) {
    return {
      status: 'expired',
      code,
      pack,
      message: `Batch ${wanted} is genuine but expired on ${pack.expiry}. Do not use.`,
    }
  }
  return {
    status: 'genuine',
    code,
    pack,
    message: `Batch ${wanted} matches an authentic pack.`,
  }
}
