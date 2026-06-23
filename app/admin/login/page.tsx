"use client";

export const dynamic = 'force-dynamic';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Login failed');
        setLoading(false);
        return;
      }

      await res.json();

      // Success - redirect to dashboard
      router.push('/admin/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      setError('Network error. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-50 to-white px-4 sm:px-6 py-6 sm:py-8">
      <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-2xl sm:text-3xl text-gray-800 font-bold mb-6 sm:mb-8 text-center">Admin Login</h1>
        <div className="flex flex-col gap-4 sm:gap-5">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 text-gray-800 px-4 py-3 sm:py-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-base"
            placeholder="Email"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 text-gray-800 px-4 py-3 sm:py-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-base"
            placeholder="Password"
            required
          />
          {error && <p className="text-red-600 text-sm sm:text-base font-medium bg-red-50 p-3 rounded-lg">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-3 sm:py-4 rounded-lg font-semibold transition duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed text-base sm:text-lg"
          >
            {loading ? 'Logging in...' : 'Log in'}
          </button>
        </div>
      </form>
    </div>
  );
}
