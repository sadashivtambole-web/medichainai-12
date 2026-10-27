import { useState } from "react";
import { Eye, EyeOff, AlertCircle } from "lucide-react";

/**
 * Premium Form Input Component
 * Features:
 * - Left icon styling with focus color transition
 * - Password visibility toggle
 * - Label with optional badge or helper link
 * - Validation error message display
 * - High-contrast accessible focus ring
 */
export default function FormInput({
  label,
  type = "text",
  name,
  value,
  onChange,
  placeholder,
  required = false,
  icon: Icon,
  error,
  helperText,
  rightLabelAction,
  autoComplete,
  disabled = false,
  className = "",
  maxLength,
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const actualType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <div className={`w-full ${className}`}>
      {/* Label & Optional Right Action */}
      {(label || rightLabelAction) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && (
            <label className="text-xs font-bold text-slate-700 tracking-wide flex items-center gap-1">
              {label}
              {required && <span className="text-rose-500 font-extrabold">*</span>}
            </label>
          )}
          {rightLabelAction && (
            <div className="text-xs font-semibold">{rightLabelAction}</div>
          )}
        </div>
      )}

      {/* Input Container */}
      <div className="relative group">
        {/* Left Icon */}
        {Icon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-600 transition-colors pointer-events-none">
            <Icon size={17} />
          </div>
        )}

        <input
          type={actualType}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoComplete={autoComplete}
          maxLength={maxLength}
          className={`w-full py-3 text-sm text-slate-900 bg-white/95 rounded-xl border transition-all outline-none font-medium placeholder:text-slate-400 shadow-2xs ${
            Icon ? "pl-10" : "pl-4"
          } ${isPassword ? "pr-11" : "pr-4"} ${
            error
              ? "border-rose-300 focus:border-rose-500 focus:ring-3 focus:ring-rose-100"
              : "border-slate-200/90 focus:border-sky-500 focus:ring-3 focus:ring-sky-100/80 hover:border-slate-300"
          } ${disabled ? "opacity-60 cursor-not-allowed bg-slate-50" : ""}`}
        />

        {/* Password Visibility Toggle */}
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 rounded-md transition-colors"
            tabIndex={-1}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>

      {/* Error or Helper Message */}
      {error && (
        <p className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 mt-1">
          <AlertCircle size={12} className="shrink-0" />
          {error}
        </p>
      )}
      {!error && helperText && (
        <p className="text-[11px] text-slate-500 mt-1 leading-normal font-normal">
          {helperText}
        </p>
      )}
    </div>
  );
}
