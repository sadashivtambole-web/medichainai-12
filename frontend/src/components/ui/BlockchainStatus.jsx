import { ExternalLink, Link2 } from "lucide-react";
import { useApp } from "../../context/AppContext";

export default function BlockchainStatus({ status, txHash, compact = false }) {
  const { blockchainInfo } = useApp();
  const currentStatus = status || blockchainInfo?.status || "Connected";
  const isConnected = currentStatus === "Connected" || currentStatus === "Confirmed";

  const networkName = blockchainInfo?.network || "DrugChain PoA Network";
  const blockHeight = blockchainInfo?.blockHeight || blockchainInfo?.totalBlocks || (blockchainInfo?.blockNumber ? `#${blockchainInfo.blockNumber}` : "Ledger Synced");
  const confirmations = isConnected ? "PoA Verified (Immutable)" : "Pending";

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold ${
          isConnected
            ? "bg-emerald-50/80 border-emerald-200 text-emerald-800"
            : "bg-amber-50/80 border-amber-200 text-amber-800"
        }`}
      >
        <div
          className={`w-2 h-2 rounded-full ${
            isConnected ? "bg-emerald-500 shadow-[0_0_6px_#10B981]" : "bg-amber-500 shadow-[0_0_6px_#F59E0B]"
          }`}
        />
        <span>Blockchain {currentStatus}</span>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              isConnected ? "bg-emerald-500 shadow-[0_0_8px_#10B981]" : "bg-amber-500"
            }`}
          />
          <span className="font-extrabold text-sm text-slate-900">
            DrugChain Ledger {isConnected ? "Connected" : "Pending"}
          </span>
        </div>
        <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100 uppercase tracking-wider">
          PoA Consensus
        </span>
      </div>

      {txHash && (
        <div className="mb-4">
          <div className="text-[10px] font-bold tracking-wider uppercase text-slate-400 mb-1.5">
            Transaction Hash
          </div>
          <div className="flex items-center justify-between gap-2 font-mono text-xs text-sky-800 bg-sky-50/70 border border-sky-200/80 rounded-xl px-3 py-2">
            <span className="truncate">{txHash}</span>
            <ExternalLink size={13} className="shrink-0 text-sky-600 opacity-80" />
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 pt-3 border-t border-slate-100 text-xs">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Network</p>
          <p className="font-bold text-slate-800 mt-0.5 truncate">{networkName}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ledger Block</p>
          <p className="font-bold text-slate-800 mt-0.5">{blockHeight}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">State</p>
          <p className="font-bold text-emerald-600 mt-0.5 truncate">{confirmations}</p>
        </div>
      </div>
    </div>
  );
}
