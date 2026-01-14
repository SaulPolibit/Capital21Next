'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Copy, RefreshCw, DoorOpen } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getTransactionsByUserId } from '@/services/database';
import { supabase } from '@/lib/supabase';
import type { BridgeTransaction } from '@/types';
import { toast } from 'sonner';

export default function DashboardPage() {
  const router = useRouter();
  const { userData, logout, isCustomer } = useAuth();
  const [transactions, setTransactions] = useState<BridgeTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Payment Generation state
  const [amount, setAmount] = useState('');
  const feePercent = parseFloat(process.env.NEXT_PUBLIC_TRANSACTION_FEE_PERCENT || '0.019');

  // Redirect non-customer users to their respective dashboards
  useEffect(() => {
    if (userData && !isCustomer) {
      if (userData.role === 'root') {
        router.push('/dashboard-root');
      } else if (userData.role === 'admin') {
        router.push('/dashboard-admin');
      }
    }
  }, [userData, isCustomer, router]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const transactionsData = await getTransactionsByUserId(user.id);
      setTransactions(transactionsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const formatRelativeTime = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  };

  const handleLogout = async () => {
    try {
      await logout();
      // Force a full page reload to clear all state
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
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
    <div className="min-h-full bg-white">
      {/* Header */}
      <div className="bg-[#c9a227] text-white px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Century 21</h1>
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

        {/* Transactions Section */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Transactions</h2>

          {/* Transactions Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#5a6672] text-white">
                  <th className="px-4 py-3 text-left font-semibold">Source Address</th>
                  <th className="px-4 py-3 text-left font-semibold">Destination Address</th>
                  <th className="px-4 py-3 text-left font-semibold">Amount</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-left font-semibold">Created At</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      No transactions yet
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-gray-200">
                      <td className="px-4 py-3 text-gray-600">
                        {tx.source_from_address || '[sourceFromAddress]'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">
                            {tx.source_to_address || '[sourceToAddress]'}
                          </span>
                          <button
                            onClick={() => copyToClipboard(tx.source_to_address || '')}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <Copy size={16} />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        $ {tx.amount || '[amount]'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">{tx.state || '[state]'}</span>
                          <RefreshCw size={16} className="text-gray-400" />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {formatRelativeTime(tx.created_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment Generation Section */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Payment Generation</h2>

          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <span className="text-gray-700 w-32">Currency:</span>
              <span className="text-gray-900">USDC</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-gray-700 w-32">Blockchain:</span>
              <span className="text-gray-900">Arbitrum</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-gray-700 w-32">Amount to send:</span>
              <div className="flex items-center gap-1">
                <span className="text-gray-700">$</span>
                <input
                  type="number"
                  placeholder="Amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-24 px-2 py-1 border-b border-gray-300 focus:outline-none focus:border-[#c9a227]"
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-gray-700 w-32">Fee Percent:</span>
              <span className="text-gray-900">{(feePercent * 100).toFixed(1)}%</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-gray-700 w-32">Total Fee:</span>
              <span className="text-gray-900">
                ${amount ? (parseFloat(amount) * feePercent).toFixed(2) : '0.00'}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-gray-700 w-32 font-bold">Total:</span>
              <span className="text-gray-900 font-bold">
                ${amount ? (parseFloat(amount) * (1 + feePercent)).toFixed(2) : '0.00'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4">
          <button className="px-6 py-3 bg-[#5a6672] text-white font-semibold rounded-lg hover:bg-[#4a5662] transition-colors">
            Connect Wallet
          </button>
          <button className="px-6 py-3 bg-[#5a6672] text-white font-semibold rounded-lg hover:bg-[#4a5662] transition-colors">
            Generate Payment Link
          </button>
        </div>
      </div>
    </div>
  );
}
