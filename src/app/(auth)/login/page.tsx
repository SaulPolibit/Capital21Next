'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingStorage, setCheckingStorage] = useState(true);

  const getRedirectPath = (role: string) => {
    switch (role) {
      case 'root':
        return '/dashboard-root';
      case 'admin':
        return '/dashboard-admin';
      default:
        return '/dashboard';
    }
  };

  useEffect(() => {
    const checkExistingSession = async () => {
      const storedUser = localStorage.getItem('capital21_user');
      // If no stored user, show login form immediately (user logged out or never logged in)
      if (!storedUser) {
        setCheckingStorage(false);
        return;
      }

      try {
        const user = JSON.parse(storedUser);
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          router.push(getRedirectPath(user.role));
          return;
        } else {
          localStorage.removeItem('capital21_user');
        }
      } catch (e) {
        localStorage.removeItem('capital21_user');
      }
      setCheckingStorage(false);
    };
    checkExistingSession();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Por favor complete todos los campos');
      return;
    }

    setLoading(true);

    try {
      const user = await login(email, password);
      if (!user) {
        setError('Usuario no registrado en el sistema');
        setLoading(false);
        return;
      }
      router.push(getRedirectPath(user.role));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage.includes('Invalid login')) {
        setError('Credenciales inválidas');
      } else {
        setError(`Error: ${errorMessage}`);
      }
      setLoading(false);
    }
  };

  if (checkingStorage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="h-8 w-8 border-4 border-[#c9a227]/30 border-t-[#c9a227] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="w-1/2 flex flex-col justify-center px-16 bg-white">
        <div className="max-w-md">
          {/* Logo */}
          <h1 className="text-2xl font-bold text-gray-900 mb-8">CENTURY 21</h1>

          {/* Title with gold underline */}
          <div className="mb-12">
            <h2 className="text-4xl font-bold text-gray-900 pb-2 border-b-4 border-[#c9a227] inline-block">
              Sign In
            </h2>
          </div>

          {/* Subtitle */}
          <p className="text-gray-600 mb-8">
            Let&apos;s get started by filling out the form below.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label className="block text-xs text-[#c9a227] mb-1 bg-white px-1 relative -mb-3 ml-3 w-fit z-10">
                emailAddress
              </label>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:border-[#c9a227]"
              />
            </div>

            {/* Password */}
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:border-[#c9a227] pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#c9a227] text-white font-semibold rounded-full hover:bg-[#b8922a] transition-colors disabled:opacity-50"
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          {/* Forgot Password */}
          <div className="mt-6 text-center">
            <Link href="/password-recovery" className="text-gray-600 hover:text-[#c9a227]">
              Forgot Password
            </Link>
          </div>
        </div>
      </div>

      {/* Right side - Image */}
      <div className="w-1/2 relative">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=1470&q=80')`,
          }}
        />
      </div>
    </div>
  );
}
