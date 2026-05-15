import type { ReactNode } from 'react';

interface AlertProps {
  children: ReactNode;
  type?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
}

const typeClasses = {
  info: 'bg-blue-50 border-blue-200 text-blue-700',
  success: 'bg-mint-50 border-mint-200 text-mint-700',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  error: 'bg-red-50 border-red-200 text-red-700',
};

const iconMap = {
  info: 'ⓘ',
  success: '✓',
  warning: '⚠',
  error: '✕',
};

export default function Alert({ children, type = 'info', title }: AlertProps) {
  return (
    <div className={`rounded-xl border px-4 py-3 ${typeClasses[type]}`}>
      <div className="flex gap-3">
        <span className="flex-shrink-0 text-lg">{iconMap[type]}</span>
        <div>
          {title ? <p className="font-semibold">{title}</p> : null}
          <p className="text-sm">{children}</p>
        </div>
      </div>
    </div>
  );
}
