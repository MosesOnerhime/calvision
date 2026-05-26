import React from 'react';
import { Link } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';
import { useAuth } from '../context/AuthContext';

export default function LandingPage() {
  const { user } = useAuth();
  const primaryHref = user ? '/dashboard' : '/register';
  const primaryLabel = user ? 'Open Dashboard' : 'Create Account';
  const secondaryHref = user ? '/upload' : '/login';
  const secondaryLabel = user ? 'Analyze Meal' : 'Sign In';

  return (
    <div className="min-h-screen bg-white text-gray-950 dark:bg-gray-950 dark:text-gray-100">
      <header className="absolute top-0 left-0 right-0 z-20">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between text-white">
          <Link to="/" className="flex items-center gap-3">
            <span className="h-9 w-9 rounded-lg bg-white text-green-700 font-black flex items-center justify-center">
              CV
            </span>
            <span className="font-bold text-xl tracking-tight">CalVision</span>
          </Link>
          <nav className="flex items-center gap-2">
            <ThemeToggle variant="hero" />
            {user ? (
              <Link
                to="/dashboard"
                className="bg-white text-green-800 font-semibold px-4 py-2 rounded-lg hover:bg-green-50 transition-colors"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-white font-semibold px-4 py-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="bg-white text-green-800 font-semibold px-4 py-2 rounded-lg hover:bg-green-50 transition-colors"
                >
                  Get Started
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <section className="relative min-h-[84vh] flex items-center overflow-hidden">
        <img
          src="/landing-meal.jpeg"
          alt="A plate of jollof rice and chicken ready for nutrition analysis"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-black/55" />
        <div className="relative z-10 max-w-6xl mx-auto px-4 pt-20 pb-16 w-full">
          <div className="max-w-2xl text-white">
            <p className="text-sm font-semibold uppercase tracking-wide text-green-200">AI meal analysis</p>
            <h1 className="text-5xl sm:text-6xl font-black tracking-tight mt-4">CalVision</h1>
            <p className="text-xl text-gray-100 mt-5 leading-8">
              Upload a food photo, review AI output, compare macro ratios, and save meals into a clean nutrition history.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                to={primaryHref}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-lg text-center transition-colors"
              >
                {primaryLabel}
              </Link>
              <Link
                to={secondaryHref}
                className="bg-white/10 hover:bg-white/20 border border-white/30 text-white font-semibold px-6 py-3 rounded-lg text-center transition-colors"
              >
                {secondaryLabel}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white border-b border-gray-200 dark:bg-gray-950 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            ['Analyze', 'Upload meal photos and review the AI-marked output image.'],
            ['Compare', 'See calories, protein, carbs, fat, and macro ratios in one result view.'],
            ['Track', 'Save meals and revisit your nutrition history whenever you need it.'],
          ].map(([title, body]) => (
            <div key={title} className="border-l-4 border-green-600 pl-4">
              <h2 className="font-bold text-gray-950 dark:text-white">{title}</h2>
              <p className="text-sm text-gray-500 mt-2 leading-6 dark:text-gray-400">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-gray-50 dark:bg-gray-900">
        <div className="max-w-6xl mx-auto px-4 py-12 grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-8 items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-green-700">Workflow</p>
            <h2 className="text-3xl font-bold text-gray-950 mt-2 dark:text-white">From plate to nutrition record</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              ['1', 'Upload a clear image'],
              ['2', 'Review AI results'],
              ['3', 'Save the meal log'],
            ].map(([step, text]) => (
              <div key={step} className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm dark:bg-gray-950 dark:border-gray-800">
                <div className="h-8 w-8 rounded-lg bg-green-50 text-green-700 font-black flex items-center justify-center dark:bg-green-950 dark:text-green-300">
                  {step}
                </div>
                <p className="font-semibold text-gray-900 mt-4 dark:text-gray-100">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
