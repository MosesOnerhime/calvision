import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthField, AuthShell } from '../components/AuthShell';
import { Button, InlineAlert } from '../components/ui';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch {
      setError('Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in to CalVision"
      subtitle="Review your meal history, analyze new plates, and keep nutrition data in one place."
    >
      {error && (
        <div className="mb-5"><InlineAlert tone="error">{error}</InlineAlert></div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <AuthField
          id="login-email"
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={value => setForm({ ...form, email: value })}
          placeholder="you@example.com"
        />
        <AuthField
          id="login-password"
          name="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          value={form.password}
          onChange={value => setForm({ ...form, password: value })}
          placeholder="Enter your password"
        />
        <Button
          type="submit"
          loading={loading}
          size="lg"
          className="w-full"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </Button>
      </form>

      <p className="mt-7 text-center text-sm text-ink-muted dark:text-night-muted">
        Do not have an account?{' '}
        <Link to="/register" className="font-bold text-primary underline-offset-4 hover:underline dark:text-night-primary">
          Create one
        </Link>
      </p>
    </AuthShell>
  );
}
