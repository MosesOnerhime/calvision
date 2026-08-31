import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import Brand from './Brand';
import ThemeToggle from './ThemeToggle';

export function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-canvas dark:bg-night-canvas lg:grid lg:grid-cols-[minmax(360px,0.85fr)_minmax(520px,1.15fr)]">
      <section className="relative hidden min-h-screen overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-10 xl:p-14">
        <img
          src="/landing-meal.jpeg"
          alt="Jollof rice, chicken, and plantain on a plate"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-black/60" />

        <Brand inverse className="relative z-10" />

        <div className="relative z-10 max-w-md text-white">
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-emerald-200">Meal intelligence, made reviewable</p>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight xl:text-5xl">See your plate more clearly.</h1>
          <p className="mt-5 text-base leading-7 text-white/80">
            Analyze a meal photo, correct the identified foods and portions, then keep the result in your nutrition history.
          </p>
          <div className="mt-8 grid gap-3">
            {['AI-marked meal images', 'Editable food labels and portions', 'Calories and macro ratios in one view'].map(item => (
              <div key={item} className="flex items-center gap-3 text-sm font-bold text-white/90">
                <CheckCircle2 aria-hidden="true" className="h-5 w-5 text-emerald-300" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center px-4 py-6 sm:px-8 lg:px-12">
        <div className="w-full max-w-lg">
          <div className="mb-10 flex items-center justify-between lg:justify-end">
            <Brand className="lg:hidden" />
            <ThemeToggle />
          </div>

          <div className="mb-8">
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary dark:text-night-primary">{eyebrow}</p>
            <h2 className="mt-3 text-3xl font-extrabold text-ink dark:text-night-ink sm:text-4xl">{title}</h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-ink-muted dark:text-night-muted sm:text-base">{subtitle}</p>
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}

export function AuthField({
  id,
  name,
  label,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  id: string;
  name: string;
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoComplete?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-bold text-ink dark:text-night-ink">{label}</label>
      <input
        id={id}
        name={name}
        type={type}
        required
        autoComplete={autoComplete}
        value={value}
        onChange={event => onChange(event.target.value)}
        className="h-12 w-full rounded-[10px] border border-line-strong bg-surface px-4 text-sm text-ink transition-colors placeholder:text-ink-soft hover:border-primary focus:border-primary dark:border-night-line-strong dark:bg-night-surface dark:text-night-ink dark:placeholder:text-night-muted dark:hover:border-night-primary dark:focus:border-night-primary"
        placeholder={placeholder}
      />
    </div>
  );
}
