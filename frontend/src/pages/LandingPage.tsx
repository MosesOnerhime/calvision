import React from 'react';
import { ArrowRight, Camera, ChartNoAxesCombined, Check, History } from 'lucide-react';
import Brand from '../components/Brand';
import ThemeToggle from '../components/ThemeToggle';
import { LinkButton } from '../components/ui';
import { useAuth } from '../context/AuthContext';

const workflow = [
  {
    title: 'Analyze',
    description: 'Upload one clear meal photo and let the model identify visible food regions.',
    icon: Camera,
  },
  {
    title: 'Review',
    description: 'Check the labels, adjust portions, and review calories and macro ratios.',
    icon: ChartNoAxesCombined,
  },
  {
    title: 'Track',
    description: 'Save the corrected result to a meal history you can revisit at any time.',
    icon: History,
  },
];

export default function LandingPage() {
  const { user } = useAuth();
  const primaryHref = user ? '/dashboard' : '/register';
  const primaryLabel = user ? 'Open Dashboard' : 'Create Account';
  const secondaryHref = user ? '/upload' : '/login';
  const secondaryLabel = user ? 'Analyze Meal' : 'Sign In';

  return (
    <div className="min-h-screen bg-canvas text-ink dark:bg-night-canvas dark:text-night-ink">
      <section className="relative flex h-[84svh] min-h-[560px] max-h-[840px] items-end overflow-hidden">
        <img
          src="/landing-meal.jpeg"
          alt="A plate of jollof rice and chicken ready for nutrition analysis"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-black/55" />

        <header className="absolute inset-x-0 top-0 z-20">
          <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
            <Brand inverse />
            <nav aria-label="Public navigation" className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <ThemeToggle variant="hero" />
              <LinkButton
                to={secondaryHref}
                variant="tertiary"
                className="border-transparent text-white hover:bg-white/15 hover:text-white"
              >
                {secondaryLabel}
              </LinkButton>
              {!user && (
                <LinkButton
                  to="/register"
                  variant="secondary"
                  className="hidden border-white bg-white text-primary hover:border-white hover:bg-emerald-50 min-[420px]:inline-flex"
                >
                  Get Started
                </LinkButton>
              )}
            </nav>
          </div>
        </header>

        <div className="relative z-10 mx-auto w-full max-w-[1240px] px-4 pb-12 sm:px-6 sm:pb-16 lg:px-8 lg:pb-20">
          <div className="max-w-3xl text-white">
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-emerald-200">AI-assisted meal analysis</p>
            <h1 className="mt-3 text-5xl font-extrabold leading-none sm:text-6xl lg:text-7xl">CalVision</h1>
            <p className="mt-4 max-w-2xl text-xl font-bold leading-8 text-white sm:text-2xl lg:text-3xl">
              Understand what is on your plate.
            </p>
            <p className="mt-4 max-w-xl text-sm leading-6 text-white/80 sm:text-base sm:leading-7">
              Analyze a food photo, review the identified items and portions, then save a nutrition record you have checked yourself.
            </p>
            <div className="mt-7 flex flex-col gap-3 min-[420px]:flex-row">
              <LinkButton to={primaryHref} size="lg" className="min-[420px]:min-w-44">
                {primaryLabel}
                <ArrowRight aria-hidden="true" className="h-5 w-5" />
              </LinkButton>
              <LinkButton
                to={secondaryHref}
                size="lg"
                variant="secondary"
                className="border-white/45 bg-black/20 text-white hover:border-white hover:bg-black/35 hover:text-white min-[420px]:min-w-36"
              >
                {secondaryLabel}
              </LinkButton>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-surface dark:border-night-line dark:bg-night-surface">
        <div className="mx-auto grid max-w-[1240px] md:grid-cols-3">
          {workflow.map(({ title, description, icon: Icon }, index) => (
            <div
              key={title}
              className={`flex gap-4 px-4 py-7 sm:px-6 md:py-9 lg:px-8 ${index > 0 ? 'border-t border-line dark:border-night-line md:border-l md:border-t-0' : ''}`}
            >
              <Icon aria-hidden="true" className="mt-0.5 h-6 w-6 shrink-0 text-primary dark:text-night-primary" />
              <div>
                <h2 className="font-extrabold text-ink dark:text-night-ink">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-ink-muted dark:text-night-muted">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-16 sm:py-20 lg:py-24">
        <div className="mx-auto grid max-w-[1240px] gap-10 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16 lg:px-8">
          <div className="overflow-hidden rounded-[20px] border border-line bg-surface dark:border-night-line dark:bg-night-surface">
            <img
              src="/landing-meal.jpeg"
              alt="Nigerian meal prepared for CalVision analysis"
              className="aspect-[4/3] h-full w-full object-cover"
              loading="lazy"
            />
          </div>

          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary dark:text-night-primary">Designed for review</p>
            <h2 className="mt-3 text-3xl font-extrabold leading-tight text-ink dark:text-night-ink sm:text-4xl">
              The model starts the analysis. You stay in control.
            </h2>
            <p className="mt-5 text-base leading-7 text-ink-muted dark:text-night-muted">
              CalVision keeps every important estimate visible. Correct a food label, change the portion in grams, and see the nutrition totals update before saving.
            </p>
            <div className="mt-7 grid gap-4">
              {['Visible segmentation overlays', 'Editable labels and portion sizes', 'Clear calorie and macronutrient breakdowns'].map(item => (
                <div key={item} className="flex items-center gap-3 text-sm font-bold text-ink dark:text-night-ink">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-soft text-primary dark:bg-night-primary-soft dark:text-night-primary">
                    <Check aria-hidden="true" className="h-4 w-4" />
                  </span>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-primary py-14 text-white dark:border-night-line dark:bg-night-surface sm:py-16">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-7 px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-extrabold">Ready to review your next meal?</h2>
            <p className="mt-3 text-sm leading-6 text-white/75 sm:text-base">Upload a plate, inspect the result, and save only the nutrition record you approve.</p>
          </div>
          <LinkButton to={primaryHref} size="lg" variant="secondary" className="border-white bg-white text-primary hover:border-white hover:bg-emerald-50">
            {primaryLabel}
            <ArrowRight aria-hidden="true" className="h-5 w-5" />
          </LinkButton>
        </div>
      </section>

      <footer className="bg-surface dark:bg-night-surface">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-3 px-4 py-7 text-sm text-ink-muted dark:text-night-muted sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <Brand />
          <p>AI-assisted nutrition estimates should be reviewed before saving.</p>
        </div>
      </footer>
    </div>
  );
}
