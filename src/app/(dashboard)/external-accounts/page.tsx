'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Trash2, DoorOpen } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { getExternalAccountsByUserId, deleteExternalAccount } from '@/services/database';
import type { ExternalAccount } from '@/types';

export default function ExternalAccountsPage() {
  const router = useRouter();
  const { logout } = useAuth();
  const [accounts, setAccounts] = useState<ExternalAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const accountsData = await getExternalAccountsByUserId(user.id);
      setAccounts(accountsData);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar esta cuenta?')) return;

    setDeletingId(id);
    try {
      await deleteExternalAccount(id);
      toast.success('Cuenta eliminada exitosamente');
      fetchAccounts();
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Error al eliminar la cuenta');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="h-8 w-8 border-4 border-[#c9a227]/30 border-t-[#c9a227] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-100">
      {/* Header */}
      <div className="bg-[#c9a227] text-white px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => router.push('/dashboard')}
          className="hover:bg-white/10 p-1 rounded"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-xl font-semibold flex-1">Cuentas externas</h1>
        <button
          onClick={handleLogout}
          className="hover:bg-white/10 p-2 rounded"
        >
          <DoorOpen className="h-6 w-6" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Title */}
        <h2 className="text-lg font-bold text-gray-900 text-center mb-4">
          Listado de Cuentas externas
        </h2>

        {/* Table Header */}
        <div className="flex justify-around py-2 border-b border-gray-300">
          <span className="font-bold text-gray-900">Banco</span>
          <span className="font-bold text-gray-900">Propietario</span>
        </div>

        {/* Accounts List */}
        {accounts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No hay cuentas externas registradas</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="flex justify-around items-center py-3"
              >
                <span className="text-gray-900">{account.bank_name || '-'}</span>
                <span className="text-gray-900">{account.account_owner_name || '-'}</span>
                <button
                  onClick={() => handleDelete(account.id)}
                  disabled={deletingId === account.id}
                  className="text-red-600 hover:text-red-700 p-1"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Create Button */}
        <div className="flex justify-end mt-6">
          <Link
            href="/external-accounts/create"
            className="px-6 py-3 bg-[#c9a227] text-white font-semibold rounded-lg hover:bg-[#b8922a] transition-colors"
          >
            Crear Cuenta
          </Link>
        </div>
      </div>
    </div>
  );
}
