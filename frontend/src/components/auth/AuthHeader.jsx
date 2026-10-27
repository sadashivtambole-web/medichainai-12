import { Link, useNavigate } from "react-router-dom";
import { Shield, ArrowLeft, Sparkles, CheckCircle2 } from "lucide-react";

/**
 * Brand Navigation Header for Authentication Pages
 * High-tech pharmaceutical security branding with live network status indicator
 */
export default function AuthHeader({ currentAction = "login" }) {
  const navigate = useNavigate();

  return (
    <header className="w-full max-w-6xl mx-auto mb-6 sm:mb-8 flex items-center justify-between px-2 sm:px-4">
      {/* Brand Identity */}
      <Link
        to="/"
        className="flex items-center gap-3 group text-decoration-none"
      >
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-sky-600 via-sky-500 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-sky-600/25 group-hover:scale-105 transition-transform duration-200">
          <Shield size={22} strokeWidth={2.4} />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-black text-slate-900 tracking-tight text-lg sm:text-xl">
              Medi<span className="bg-gradient-to-r from-sky-600 to-teal-600 bg-clip-text text-transparent">Chain</span>
            </span>
            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-200 uppercase tracking-wider">
              AI
            </span>
          </div>
          <p className="text-[10px] font-semibold text-slate-500 tracking-wide hidden sm:block">
            Pharmaceutical Supply Chain Security
          </p>
        </div>
      </Link>

      {/* Network Status Badge & Navigation Link */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* PoA Ledger Status Pill */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 border border-slate-200/80 shadow-xs backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-bold text-slate-700">
            PoA Consensus Active
          </span>
        </div>

        {/* Back to Home / Direct Action */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/80 hover:bg-white border border-slate-200/90 text-xs font-bold text-slate-700 hover:text-sky-700 shadow-xs backdrop-blur-md transition-all hover:-translate-y-0.5"
        >
          <ArrowLeft size={14} />
          <span className="hidden sm:inline">Back to</span> Portal
        </Link>
      </div>
    </header>
  );
}
