import React from 'react';
import { AlertCircle, CheckCircle2, Info, LoaderCircle } from 'lucide-react';
import { Link, type LinkProps } from 'react-router-dom';

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export function buttonStyles({
  variant = 'primary',
  size = 'md',
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  const variants: Record<ButtonVariant, string> = {
    primary:
      'border-primary bg-primary text-white hover:border-primary-hover hover:bg-primary-hover active:bg-primary-pressed dark:border-night-primary dark:bg-night-primary dark:text-night-canvas dark:hover:border-white dark:hover:bg-white',
    secondary:
      'border-line-strong bg-surface text-ink hover:border-primary hover:text-primary dark:border-night-line-strong dark:bg-night-surface dark:text-night-ink dark:hover:border-night-primary dark:hover:text-night-primary',
    tertiary:
      'border-transparent bg-transparent text-ink-muted hover:bg-surface-subtle hover:text-ink dark:text-night-muted dark:hover:bg-night-subtle dark:hover:text-night-ink',
    danger:
      'border-danger/20 bg-danger-soft text-danger hover:border-danger/40 hover:bg-danger/15 dark:border-danger/30 dark:bg-danger/10 dark:text-red-300 dark:hover:bg-danger/20',
  };
  const sizes: Record<ButtonSize, string> = {
    sm: 'h-9 gap-2 rounded-[10px] px-3 text-sm',
    md: 'h-11 gap-2 rounded-[10px] px-4 text-sm',
    lg: 'h-12 gap-2.5 rounded-xl px-5 text-base',
    icon: 'h-11 w-11 rounded-[10px]',
  };

  return cn(
    'inline-flex shrink-0 items-center justify-center border font-bold transition-colors disabled:pointer-events-none disabled:opacity-50',
    variants[variant],
    sizes[size],
    className,
  );
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={buttonStyles({ variant, size, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

type LinkButtonProps = LinkProps & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function LinkButton({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: LinkButtonProps) {
  return (
    <Link className={buttonStyles({ variant, size, className })} {...props}>
      {children}
    </Link>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 border-b border-line pb-6 dark:border-night-line sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow && (
          <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.14em] text-primary dark:text-night-primary">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-extrabold text-ink dark:text-night-ink sm:text-3xl">{title}</h1>
        {description && (
          <p className="mt-2 max-w-xl text-sm leading-6 text-ink-muted dark:text-night-muted sm:text-base">
            {description}
          </p>
        )}
      </div>
      {action}
    </header>
  );
}

type AlertTone = 'info' | 'success' | 'error';

export function InlineAlert({
  tone = 'info',
  children,
}: {
  tone?: AlertTone;
  children: React.ReactNode;
}) {
  const tones: Record<AlertTone, { styles: string; icon: React.ElementType }> = {
    info: {
      styles:
        'border-line-strong bg-surface-subtle text-ink dark:border-night-line-strong dark:bg-night-subtle dark:text-night-ink',
      icon: Info,
    },
    success: {
      styles:
        'border-primary/20 bg-primary-soft text-primary-pressed dark:border-night-primary/30 dark:bg-night-primary-soft dark:text-night-ink',
      icon: CheckCircle2,
    },
    error: {
      styles:
        'border-danger/20 bg-danger-soft text-danger dark:border-danger/30 dark:bg-danger/10 dark:text-red-200',
      icon: AlertCircle,
    },
  };
  const Icon = tones[tone].icon;

  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={cn('flex gap-3 rounded-xl border p-4 text-sm leading-6', tones[tone].styles)}>
      <Icon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-lg bg-surface-strong dark:bg-night-strong', className)}
    />
  );
}
