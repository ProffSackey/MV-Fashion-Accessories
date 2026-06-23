"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'info' | 'error' | 'success'>('info');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if user is in a password recovery session
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session?.user) {
        setMessage('Invalid or expired reset code');
        setMessageType('error');
      }
    });
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password || !confirmPassword) {
      setMessage('Please fill in all fields');
      setMessageType('error');
      return;
    }

    if (password !== confirmPassword) {
      setMessage('Passwords do not match');
      setMessageType('error');
      return;
    }

    if (password.length < 6) {
      setMessage('Password must be at least 6 characters');
      setMessageType('error');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setMessage(error.message);
      setMessageType('error');
    } else {
      setMessage('Password updated successfully. Redirecting to login...');
      setMessageType('success');
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-50 to-white px-4 sm:px-6 py-6 sm:py-8">
      <div className="bg-white p-6 sm:p-8 text-gray-800 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-center text-yellow-700">
          Reset Your Password
        </h1>

        <form onSubmit={handleResetPassword} className="flex flex-col gap-4 sm:gap-5">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 px-4 py-3 sm:py-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-base"
            placeholder="Enter new password"
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full border border-gray-300 px-4 py-3 sm:py-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-base"
            placeholder="Confirm new password"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-3 sm:py-4 rounded-lg font-semibold transition duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed text-base sm:text-lg"
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>

        {message && (
          <p className={`mt-4 text-center text-sm sm:text-base p-3 sm:p-4 rounded-lg font-medium ${
            messageType === 'error' ? 'bg-red-100 text-red-700' :
            messageType === 'success' ? 'bg-green-100 text-green-700' :
            'bg-yellow-100 text-yellow-700'
          }`}>
            {message}
          </p>
        )}

        <p className="mt-4 text-center text-sm text-gray-600">
          <a href="/login" className="text-yellow-600 hover:underline">
            Back to Login
          </a>
        </p>
      </div>
    </div>
  );
}
