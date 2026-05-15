import type { SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}

export default function Select({
  label,
  error,
  options,
  placeholder,
  className,
  ...props
}: SelectProps) {
  return (
    <div className="space-y-1">
      {label ? (
        <label className="block text-xs font-semibold uppercase tracking-wide text-ink-500">
          {label}
        </label>
      ) : null}
      <select
        className={`
          w-full rounded-xl border border-ink-200 bg-white
          px-4 py-3 text-sm text-ink-900 outline-none
          transition-all duration-200
          focus:border-mint-400 focus:ring-4 focus:ring-mint-100
          disabled:bg-ink-50 disabled:text-ink-400
          ${error ? 'border-red-300 focus:ring-red-100 focus:border-red-400' : ''}
          ${className ?? ''}
        `}
        {...props}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
