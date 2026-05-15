import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export default function Card({ children, className }: CardProps) {
  return (
    <div
      className={`
        rounded-2xl border border-ink-200 bg-white/90
        shadow-[0_16px_35px_rgba(31,41,55,0.08)]
        backdrop-blur transition-all duration-200 hover:shadow-[0_20px_45px_rgba(31,41,55,0.12)]
        ${className ?? ''}
      `}
    >
      {children}
    </div>
  );
}
