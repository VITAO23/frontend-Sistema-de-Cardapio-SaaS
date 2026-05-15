import type { TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export default function Textarea({ label, error, className, ...props }: TextareaProps) {
  return (
    <div className="space-y-1">
      {label ? (
        <label className="block text-xs font-semibold uppercase tracking-wide text-ink-500">
          {label}
        </label>
      ) : null}
      <textarea
        className={`
          w-full rounded-xl border border-ink-200 bg-white
          px-4 py-3 text-sm text-ink-900 outline-none
          transition-all duration-200
          placeholder:text-ink-400
          focus:border-mint-400 focus:ring-4 focus:ring-mint-100
          disabled:bg-ink-50 disabled:text-ink-400
          resize-none
          ${error ? 'border-red-300 focus:ring-red-100 focus:border-red-400' : ''}
          ${className ?? ''}
        `}
        {...props}
      />
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
