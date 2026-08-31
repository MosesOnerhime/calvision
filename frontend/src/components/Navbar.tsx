import React from 'react';
import { History, LayoutDashboard, LogOut, ScanLine } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Brand from './Brand';
import ThemeToggle from './ThemeToggle';
import { cn } from './ui';

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/upload', label: 'Analyze', icon: ScanLine },
  { to: '/history', label: 'History', icon: History },
];

function NavigationLinks({ mobile = false }: { mobile?: boolean }) {
  return (
    <>
      {links.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              mobile
                ? 'flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-bold'
                : 'flex h-11 items-center gap-3 rounded-[10px] px-3 text-sm font-bold',
              isActive
                ? 'bg-primary-soft text-primary-pressed dark:bg-night-primary-soft dark:text-night-primary'
                : 'text-ink-muted hover:bg-surface-subtle hover:text-ink dark:text-night-muted dark:hover:bg-night-subtle dark:hover:text-night-ink',
            )
          }
        >
          <Icon aria-hidden="true" className={mobile ? 'h-5 w-5' : 'h-[18px] w-[18px]'} />
          <span className="truncate">{label}</span>
        </NavLink>
      ))}
    </>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const displayName = user?.first_name || user?.email?.split('@')[0] || 'Account';

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 border-r border-line bg-surface p-4 dark:border-night-line dark:bg-night-surface lg:flex lg:flex-col">
        <Brand to="/dashboard" className="px-2 py-1" />

        <nav aria-label="Primary navigation" className="mt-10 grid gap-1.5">
          <NavigationLinks />
        </nav>

        <div className="mt-auto border-t border-line pt-4 dark:border-night-line">
          <div className="mb-3 min-w-0 px-2">
            <p className="truncate text-sm font-bold text-ink dark:text-night-ink">{displayName}</p>
            {user?.email && (
              <p className="mt-0.5 truncate text-xs text-ink-muted dark:text-night-muted">{user.email}</p>
            )}
          </div>
          <ThemeToggle showLabel />
          <button
            type="button"
            onClick={logout}
            className="mt-2 flex h-11 w-full items-center gap-2 rounded-[10px] px-3 text-sm font-bold text-danger transition-colors hover:bg-danger-soft dark:text-red-300 dark:hover:bg-danger/10"
          >
            <LogOut aria-hidden="true" className="h-[18px] w-[18px]" />
            Sign out
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-line bg-surface px-4 dark:border-night-line dark:bg-night-surface lg:hidden">
        <Brand to="/dashboard" />
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <button
            type="button"
            onClick={logout}
            aria-label="Sign out"
            title="Sign out"
            className="flex h-11 w-11 items-center justify-center rounded-[10px] text-danger transition-colors hover:bg-danger-soft dark:text-red-300 dark:hover:bg-danger/10"
          >
            <LogOut aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
      </header>

      <nav
        aria-label="Mobile primary navigation"
        className="fixed inset-x-0 bottom-0 z-50 flex min-h-[68px] border-t border-line bg-surface px-2 pb-[env(safe-area-inset-bottom)] dark:border-night-line dark:bg-night-surface lg:hidden"
      >
        <NavigationLinks mobile />
      </nav>
    </>
  );
}
