import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { cn } from './ui';

export default function ThemeToggle({
  variant = 'default',
  showLabel = false,
}: {
  variant?: 'default' | 'hero';
  showLabel?: boolean;
}) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const Icon = isDark ? Sun : Moon;

  const classes = variant === 'hero'
    ? 'border-white/30 bg-black/15 text-white hover:bg-black/30'
    : 'border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink dark:border-night-line dark:bg-night-surface dark:text-night-muted dark:hover:border-night-line-strong dark:hover:text-night-ink';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      className={cn(
        'inline-flex h-11 items-center justify-center gap-2 rounded-[10px] border px-3 text-sm font-bold transition-colors',
        !showLabel && 'w-11 px-0',
        classes,
      )}
    >
      <Icon aria-hidden="true" className="h-4 w-4" />
      {showLabel && (isDark ? 'Light mode' : 'Dark mode')}
    </button>
  );
}
