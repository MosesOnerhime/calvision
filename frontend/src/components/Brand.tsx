import React from 'react';
import { ScanLine } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from './ui';

export default function Brand({
  to = '/',
  inverse = false,
  compact = false,
  className,
}: {
  to?: string;
  inverse?: boolean;
  compact?: boolean;
  className?: string;
}) {
  return (
    <Link
      to={to}
      aria-label="CalVision home"
      className={cn('inline-flex items-center gap-2.5 font-extrabold', inverse ? 'text-white' : 'text-ink dark:text-night-ink', className)}
    >
      <span
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-[10px]',
          inverse ? 'bg-white text-primary' : 'bg-primary text-white dark:bg-night-primary dark:text-night-canvas',
        )}
      >
        <ScanLine aria-hidden="true" className="h-5 w-5" strokeWidth={2.5} />
      </span>
      {!compact && <span className="text-lg tracking-normal">CalVision</span>}
    </Link>
  );
}
