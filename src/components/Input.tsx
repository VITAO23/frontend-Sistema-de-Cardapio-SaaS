import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export default function Input({ label, error, helperText, className, ...props }: InputProps) {
  return (
    <div className="space-y-1">
      {label ? (
        <label className="block text-xs font-semibold uppercase tracking-wide text-ink-500">
          {label}
        </label>
      ) : null}
      <input
        className={`
          w-full rounded-xl border border-ink-200 bg-white
          px-4 py-3 text-sm text-ink-900 outline-none
          transition-all duration-200
          placeholder:text-ink-400
          focus:border-mint-400 focus:ring-4 focus:ring-mint-100
          disabled:bg-ink-50 disabled:text-ink-400
          ${error ? 'border-red-300 focus:ring-red-100 focus:border-red-400' : ''}
          ${className ?? ''}
        `}
        {...props}
      />
      {error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-ink-500">{helperText}</p>
      ) : null}
    </div>
  );
}
