'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, DoorOpen } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import type { BridgeTransaction } from '@/types';

export default function AdminDashboardPage() {
  const router = useRouter();
  const { userData, logout, isAdmin } = useAuth();
  const [transactions, setTransactions] = useState<BridgeTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Client info from env
  const clientName = process.env.NEXT_PUBLIC_COMPANY_NAME || 'Master South America, LLC';
  const clientId = process.env.NEXT_PUBLIC_BRIDGE_CLIENT_ID || '';
  const externalAccountID = process.env.NEXT_PUBLIC_BRIDGE_EXTERNAL_ACCOUNT_ID || '';
  const feePercent = process.env.NEXT_PUBLIC_TRANSACTION_FEE_PERCENT || '0';

  useEffect(() => {
    if (userData && !isAdmin) {
      // Redirect non-admin users
      if (userData.role === 'root') {
        router.push('/dashboard-root');
      } else {
        router.push('/dashboard');
      }
    }
  }, [isAdmin, userData, router]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch transactions for this admin's users
      const { data: txData } = await supabase
        .from('bridge_transactions')
        .select('*')
        .order('created_at', { ascending: false });

      setTransactions(txData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const calculateTotalReceived = () => {
    return transactions
      .filter(tx => tx.state === 'completed')
      .reduce((sum, tx) => sum + parseFloat(tx.amount || '0'), 0)
      .toFixed(2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="h-8 w-8 border-4 border-[#c9a227]/30 border-t-[#c9a227] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-white">
      {/* Header */}
      <div className="bg-[#c9a227] text-white px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Century 21 - Admin</h1>
        <button
          onClick={handleLogout}
          className="hover:bg-white/10 p-2 rounded"
        >
          <DoorOpen className="h-6 w-6" />
        </button>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* User Info */}
        <div className="flex items-center gap-3 mb-8">
          <User className="h-6 w-6 text-gray-600" />
          <span className="text-gray-900">{userData?.display_name || '[Display Name]'}</span>
        </div>

        {/* Client Information */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Client Information</h2>
          <div className="space-y-2">
            <div className="flex gap-2">
              <span className="text-gray-600">Name:</span>
              <span className="text-gray-900">{clientName}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-gray-600">Client ID:</span>
              <span className="text-gray-900">{clientId || '[client_id]'}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-gray-600">External Account ID:</span>
              <span className="text-gray-900">{externalAccountID || '[External_Account]'}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-gray-600">Fee:</span>
              <span className="text-gray-900">{(parseFloat(feePercent) * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Transactions List */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Transactions List</h2>

          {/* Transactions Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#5a6672] text-white">
                  <th className="px-4 py-3 text-left font-semibold">Transaction ID</th>
                  <th className="px-4 py-3 text-left font-semibold">Destination</th>
                  <th className="px-4 py-3 text-left font-semibold">Fee</th>
                  <th className="px-4 py-3 text-left font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                      No transactions yet
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-gray-200">
                      <td className="px-4 py-3 text-gray-600">
                        {tx.bridge_transaction_id ?? '[id]'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {tx.destination_external_account_id ?? '[destinationExternalAccountId]'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        $ {tx.developer_fee || '[developerFee]'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        $ {tx.amount || '[amount]'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <p className="mt-4 font-bold text-gray-900">
            Total received: ${calculateTotalReceived()}
          </p>
        </div>
      </div>
    </div>
  );
}
