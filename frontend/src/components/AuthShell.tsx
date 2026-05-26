import React from 'react';
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 dark:bg-gray-950">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden dark:bg-gray-900 dark:border-gray-800">
        <section className="hidden lg:flex bg-green-700 text-white p-10 flex-col justify-between">
          <div>
            <div className="h-11 w-11 rounded-lg bg-white text-green-700 font-black flex items-center justify-center">
              CV
            </div>
            <h1 className="text-4xl font-bold mt-8 tracking-tight">CalVision</h1>
            <p className="text-green-100 mt-4 leading-7">
              Turn meal photos into structured nutrition insights with calorie totals,
              macro breakdowns, and a searchable food history.
            </p>
          </div>
          <div className="space-y-3">
            {['Analyze food photos', 'Review macro ratios', 'Track meal history'].map(item => (
              <div key={item} className="flex items-center gap-3 text-sm font-semibold text-green-50">
                <span className="h-2 w-2 rounded-full bg-green-200" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="p-6 sm:p-10">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-5">
              <div className="lg:hidden h-10 w-10 rounded-lg bg-green-600 text-white font-black flex items-center justify-center">
                CV
              </div>
              <div className="ml-auto">
                <ThemeToggle />
              </div>
            </div>
            <p className="text-sm font-semibold uppercase tracking-wide text-green-700">{eyebrow}</p>
            <h2 className="text-3xl font-bold text-gray-950 mt-2 dark:text-white">{title}</h2>
            <p className="text-gray-500 mt-3 dark:text-gray-400">{subtitle}</p>
          </div>
          {children}
        </section>
      </div>
    </div>
  );
}

export function AuthField({
  label,
  type,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5 dark:text-gray-200">{label}</label>
      <input
        type={type}
        required
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm bg-white focus:border-green-500 dark:bg-gray-950 dark:border-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500"
        placeholder={placeholder}
      />
    </div>
  );
}
