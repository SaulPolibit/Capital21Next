'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function PasswordRecoveryPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Por favor ingrese su correo electrónico');
      return;
    }

    setLoading(true);

    try {
      await resetPassword(email);
      setSuccess(true);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage || 'Error al enviar el correo');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
        <div className="w-full max-w-xl text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Email Sent!</h1>
          <p className="text-gray-600 mb-8">
            We sent a link to reset your password to <strong>{email}</strong>
          </p>
          <Link
            href="/login"
            className="inline-block py-3 px-8 bg-[#c9a227] text-white font-semibold rounded-full hover:bg-[#b8922a]"
          >
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-xl mx-auto">
        {/* Back Link */}
        <Link
          href="/login"
          className="inline-flex items-center text-gray-900 hover:text-[#c9a227] mb-8"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back
        </Link>

        {/* Title */}
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Forgot Password</h1>

        {/* Description */}
        <p className="text-gray-600 mb-8">
          We will send you an email with a link to reset your password, please enter the
          email associated with your account below.
        </p>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Email Input */}
          <div className="mb-8">
            <label className="block text-sm text-gray-500 mb-2 ml-4">
              Your email address...
            </label>
            <input
              type="email"
              placeholder="Enter your email..."
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-6 py-4 border border-gray-300 rounded-full bg-white focus:outline-none focus:border-[#c9a227] text-lg"
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-center">
            <button
              type="submit"
              disabled={loading}
              className="py-4 px-16 bg-[#c9a227] text-white text-xl font-semibold rounded-full hover:bg-[#b8922a] transition-colors disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
