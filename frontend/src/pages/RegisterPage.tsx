import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { AuthField, AuthShell } from '../components/AuthShell';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/api/auth/register/', form);
      await login(form.email, form.password);
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
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-5 text-sm dark:bg-red-950 dark:border-red-900 dark:text-red-300">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AuthField
            label="First Name"
            type="text"
            value={form.first_name}
            onChange={value => setForm({ ...form, first_name: value })}
            placeholder="Moses"
          />
          <AuthField
            label="Last Name"
            type="text"
            value={form.last_name}
            onChange={value => setForm({ ...form, last_name: value })}
            placeholder="Ade"
          />
        </div>
        <AuthField
          label="Email"
          type="email"
          value={form.email}
          onChange={value => setForm({ ...form, email: value })}
          placeholder="you@example.com"
        />
        <AuthField
          label="Password"
          type="password"
          value={form.password}
          onChange={value => setForm({ ...form, password: value })}
          placeholder="At least 8 characters"
        />

        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 dark:bg-gray-950 dark:border-gray-800 dark:text-gray-400">
          Your password must be at least 8 characters. Use something memorable and hard to guess.
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold py-3 rounded-lg transition-colors"
        >
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6 dark:text-gray-400">
        Already have an account?{' '}
        <Link to="/login" className="text-green-700 font-semibold hover:underline dark:text-green-400">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
