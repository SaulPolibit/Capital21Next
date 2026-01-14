'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [validSession, setValidSession] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    // Check if user has a valid password reset session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        setValidSession(true);
      } else {
        // Try to get session from URL hash
        const { data: { session: hashSession }, error } = await supabase.auth.getSession();
        if (hashSession && !error) {
          setValidSession(true);
        }
      }
      setCheckingSession(false);
    };

    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password || !confirmPassword) {
      setError('Por favor complete todos los campos');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      setSuccess(true);

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err: unknown) {
      console.error('Password reset error:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage || 'Error al restablecer la contraseña');
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a1a2e]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 border-3 border-[#c9a227]/30 border-t-[#c9a227] rounded-full animate-spin" />
          <span className="text-white/60">Verificando sesión...</span>
        </div>
      </div>
    );
  }

  if (!validSession && !checkingSession) {
    return (
      <div className="min-h-screen flex flex-col bg-[#1a1a2e]">
        <div className="flex-1 flex items-center justify-center px-8 py-8">
          <div className="w-full max-w-[400px] flex flex-col items-center">
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-white text-center">
                CENTURY <span className="text-[#c9a227]">21</span>
              </h1>
            </div>

            <div className="w-full bg-white rounded-2xl p-8 shadow-xl text-center">
              <h2 className="text-2xl font-semibold text-[#1a1a2e] mb-2">
                Enlace Inválido
              </h2>
              <p className="text-gray-500 mb-6">
                El enlace de recuperación ha expirado o es inválido. Por favor
                solicita un nuevo enlace de recuperación.
              </p>
              <Button
                onClick={() => router.push('/password-recovery')}
                className="w-full h-12 bg-[#c9a227] hover:bg-[#b8922a] text-white font-semibold rounded-xl"
              >
                Solicitar Nuevo Enlace
              </Button>
            </div>
          </div>
        </div>
        <div className="h-1 bg-[#c9a227] w-full" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col bg-[#1a1a2e]">
        <div className="flex-1 flex items-center justify-center px-8 py-8">
          <div className="w-full max-w-[400px] flex flex-col items-center">
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-white text-center">
                CENTURY <span className="text-[#c9a227]">21</span>
              </h1>
            </div>

            <div className="w-full bg-white rounded-2xl p-8 shadow-xl text-center">
              <div className="flex justify-center mb-4">
                <CheckCircle className="h-16 w-16 text-green-500" />
              </div>
              <h2 className="text-2xl font-semibold text-[#1a1a2e] mb-2">
                Contraseña Actualizada
              </h2>
              <p className="text-gray-500 mb-6">
                Tu contraseña ha sido actualizada exitosamente. Serás
                redirigido al login en unos segundos...
              </p>
            </div>
          </div>
        </div>
        <div className="h-1 bg-[#c9a227] w-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#1a1a2e]">
      <div className="flex-1 flex items-center justify-center px-8 py-8">
        <div className="w-full max-w-[400px] flex flex-col items-center">
          {/* Logo */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white text-center">
              CENTURY <span className="text-[#c9a227]">21</span>
            </h1>
          </div>

          {/* Form container */}
          <div className="w-full bg-white rounded-2xl p-8 shadow-xl">
            {/* Title */}
            <div className="flex items-center gap-3 mb-2">
              <Lock className="h-8 w-8 text-[#c9a227]" />
              <h2 className="text-2xl font-semibold text-[#1a1a2e]">
                Nueva Contraseña
              </h2>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              Ingresa tu nueva contraseña.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm text-center">
                  {error}
                </div>
              )}

              {/* Password input */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700">
                  Nueva Contraseña
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 bg-gray-50 border-gray-200 pr-12 focus:border-[#c9a227] focus:ring-[#c9a227]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password input */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-gray-700">
                  Confirmar Contraseña
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-12 bg-gray-50 border-gray-200 pr-12 focus:border-[#c9a227] focus:ring-[#c9a227]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* Submit button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-[#c9a227] hover:bg-[#b8922a] text-white font-semibold rounded-xl mt-2"
              >
                {loading ? 'Actualizando...' : 'Actualizar Contraseña'}
              </Button>
            </form>
          </div>
        </div>
      </div>
      <div className="h-1 bg-[#c9a227] w-full" />
    </div>
  );
}
