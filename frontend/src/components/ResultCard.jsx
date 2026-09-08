import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'

export const RESULT_STYLES = {
  genuine: {
    icon: CheckCircle2,
    ring: 'border-emerald-200 bg-emerald-50',
    text: 'text-emerald-700',
    label: 'Genuine',
  },
  expired: {
    icon: AlertTriangle,
    ring: 'border-amber-200 bg-amber-50',
    text: 'text-amber-700',
    label: 'Expired',
  },
  counterfeit: {
    icon: XCircle,
    ring: 'border-red-200 bg-red-50',
    text: 'text-red-700',
    label: 'Suspicious',
  },
}

export default function ResultCard({ result }) {
  const style = RESULT_STYLES[result.status] ?? RESULT_STYLES.counterfeit
  const Icon = style.icon
  return (
    <div className={`mt-8 rounded-2xl border p-6 text-left ${style.ring}`}>
      <div className={`flex items-center gap-2 font-semibold ${style.text}`}>
        <Icon className="h-6 w-6" /> {style.label}
      </div>
      <p className="mt-2 text-slate-700">{result.message}</p>
      {result.code && (
        <p className="mt-1 break-all text-sm text-slate-500">Code: {result.code}</p>
      )}
      {result.pack && (
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-slate-500">Medicine</dt>
          <dd className="text-slate-900">{result.pack.name}</dd>
          <dt className="text-slate-500">Manufacturer</dt>
          <dd className="text-slate-900">{result.pack.manufacturer}</dd>
          <dt className="text-slate-500">Batch</dt>
          <dd className="text-slate-900">{result.pack.batch}</dd>
          <dt className="text-slate-500">Expiry</dt>
          <dd className="text-slate-900">{result.pack.expiry}</dd>
        </dl>
      )}
    </div>
  )
}
