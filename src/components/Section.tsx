import type { ReactNode } from 'react';

interface SectionProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export default function Section({ title, subtitle, children }: SectionProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-ink-900">{title}</h2>
        {subtitle ? <p className="mt-2 text-sm text-ink-600">{subtitle}</p> : null}
      </div>
      {children}
    </div>
  );
}
