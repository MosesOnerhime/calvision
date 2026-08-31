import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthField, AuthShell } from '../components/AuthShell';
import { Button, InlineAlert } from '../components/ui';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form);
      navigate('/dashboard');
    } catch (err: any) {
      const data = err.response?.data;
      setError(data?.email?.[0] || data?.password?.[0] || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Get started"
      title="Create your account"
      subtitle="Set up your profile and start turning food photos into nutrition records."
    >
      {error && (
        <div className="mb-5"><InlineAlert tone="error">{error}</InlineAlert></div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <AuthField
            id="register-first-name"
            name="first_name"
            label="First Name"
            type="text"
            autoComplete="given-name"
            value={form.first_name}
            onChange={value => setForm({ ...form, first_name: value })}
            placeholder="Moses"
          />
          <AuthField
            id="register-last-name"
            name="last_name"
            label="Last Name"
            type="text"
            autoComplete="family-name"
            value={form.last_name}
            onChange={value => setForm({ ...form, last_name: value })}
            placeholder="Ade"
          />
        </div>
        <AuthField
          id="register-email"
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={value => setForm({ ...form, email: value })}
          placeholder="you@example.com"
        />
        <AuthField
          id="register-password"
          name="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={value => setForm({ ...form, password: value })}
          placeholder="At least 8 characters"
        />

        <div className="border-l-2 border-primary pl-4 text-sm leading-6 text-ink-muted dark:border-night-primary dark:text-night-muted">
          Your password must be at least 8 characters. Use something memorable and hard to guess.
        </div>

        <Button
          type="submit"
          loading={loading}
          size="lg"
          className="w-full"
        >
          {loading ? 'Creating account...' : 'Create Account'}
        </Button>
      </form>

      <p className="mt-7 text-center text-sm text-ink-muted dark:text-night-muted">
        Already have an account?{' '}
        <Link to="/login" className="font-bold text-primary underline-offset-4 hover:underline dark:text-night-primary">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
