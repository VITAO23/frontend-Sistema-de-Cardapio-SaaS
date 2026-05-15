import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children: ReactNode;
}

const variantClasses = {
  primary:
    'bg-ink-900 text-white hover:bg-ink-800 disabled:bg-ink-600 shadow-[0_8px_20px_rgba(22,32,45,0.2)]',
  secondary:
    'border border-ink-300 text-ink-600 hover:border-ink-400 hover:text-ink-900 hover:bg-ink-50',
  danger:
    'border border-red-300 text-red-600 hover:border-red-400 hover:text-red-700 hover:bg-red-50',
};

const sizeClasses = {
  sm: 'px-4 py-2 text-xs',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  children,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || isLoading}
      className={`
        relative rounded-xl font-semibold uppercase tracking-wide
        transition-all duration-200 active:scale-95
        disabled:cursor-not-allowed disabled:opacity-60
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className ?? ''}
      `}
      {...props}
    >
      {isLoading ? (
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
          Carregando...
        </span>
      ) : (
        children
      )}
    </button>
  );
}
