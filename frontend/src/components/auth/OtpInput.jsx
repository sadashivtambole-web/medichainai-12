import { useState, useRef, useEffect } from "react";
import { RefreshCw } from "lucide-react";

/**
 * OtpInput
 * Interactive 6-digit verification code input with auto-advance, backspace handling,
 * clipboard paste parsing, and countdown resend timer.
 */
export default function OtpInput({ length = 6, value = "", onChange, onResend, isResending = false }) {
  const inputsRef = useRef([]);
  const [timer, setTimer] = useState(60);

  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const otpDigits = Array.from({ length }, (_, i) => value[i] || "");

  const handleInputChange = (e, index) => {
    const val = e.target.value.replace(/\D/g, "");
    if (!val) {
      // Clear current digit
      const next = otpDigits.map((d, i) => (i === index ? "" : d)).join("");
      onChange(next);
      return;
    }

    // Single digit entry
    const char = val.slice(-1);
    const nextArr = [...otpDigits];
    nextArr[index] = char;
    const nextStr = nextArr.join("");
    onChange(nextStr);

    // Auto-advance
    if (index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    onChange(pasted);
    const focusIndex = Math.min(pasted.length, length - 1);
    inputsRef.current[focusIndex]?.focus();
  };

  const handleResendClick = () => {
    if (timer > 0 || isResending) return;
    setTimer(60);
    onResend?.();
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* 6 Digit Input Boxes */}
      <div className="flex items-center justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
        {Array.from({ length }).map((_, i) => (
          <input
            key={i}
            ref={(el) => (inputsRef.current[i] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={otpDigits[i] || ""}
            onChange={(e) => handleInputChange(e, i)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            className={`w-11 h-13 sm:w-12 sm:h-14 text-center font-mono text-xl sm:text-2xl font-black rounded-xl border transition-all outline-none bg-white shadow-2xs ${
              otpDigits[i]
                ? "border-sky-500 ring-2 ring-sky-200/80 text-sky-700"
                : "border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 text-slate-800"
            }`}
          />
        ))}
      </div>

      {/* Resend Action & Countdown Timer */}
      <div className="mt-4 flex items-center justify-center gap-2 text-xs">
        {timer > 0 ? (
          <span className="text-slate-400 font-medium">
            Resend code in <strong className="font-mono text-sky-600 font-bold">{timer}s</strong>
          </span>
        ) : (
          <button
            type="button"
            onClick={handleResendClick}
            disabled={isResending}
            className="inline-flex items-center gap-1.5 font-bold text-sky-600 hover:text-sky-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={12} className={isResending ? "animate-spin" : ""} />
            Resend Verification Code
          </button>
        )}
      </div>
    </div>
  );
}
