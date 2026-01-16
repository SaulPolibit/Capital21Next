'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Copy, RefreshCw, DoorOpen, Wallet, X, Check, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useWallet } from '@/hooks/useWallet';
import { getTransactionsByUserId, updateTransaction } from '@/services/database';
import { bridgeApi } from '@/services/bridge';
import { getUUID } from '@/utils/uuid';
import { supabase } from '@/lib/supabase';
import type { BridgeTransaction } from '@/types';
import { toast } from 'sonner';

export default function DashboardPage() {
  const router = useRouter();
  const { userData, logout, isCustomer } = useAuth();
  const {
    isConnected,
    address,
    walletType,
    chainId,
    isConnecting,
    availableWallets,
    connect,
    disconnect,
    switchToArbitrum,
    sendUSDC,
  } = useWallet();

  const [transactions, setTransactions] = useState<BridgeTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [isGeneratingPayment, setIsGeneratingPayment] = useState(false);
  const [refreshingTxId, setRefreshingTxId] = useState<string | null>(null);
  const [payingTxId, setPayingTxId] = useState<string | null>(null);

  // Payment Generation state
  const [amount, setAmount] = useState('');
  const feePercent = parseFloat(process.env.NEXT_PUBLIC_TRANSACTION_FEE_PERCENT || '0.019');

  // Environment variables for Bridge
  const BRIDGE_CLIENT_ID = process.env.NEXT_PUBLIC_BRIDGE_CLIENT_ID || '';
  const BRIDGE_EXTERNAL_ACCOUNT_ID = process.env.NEXT_PUBLIC_BRIDGE_EXTERNAL_ACCOUNT_ID || '';

  // Arbitrum chain ID
  const ARBITRUM_CHAIN_ID = '0xa4b1';

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

  const handleConnectWallet = async (preferredWallet?: 'metamask' | 'coinbase') => {
    const connectedAddress = await connect(preferredWallet);
    if (connectedAddress) {
      toast.success(`Wallet connected: ${connectedAddress.slice(0, 6)}...${connectedAddress.slice(-4)}`);
      setShowWalletModal(false);

      // Check if on Arbitrum, if not prompt to switch
      if (chainId !== ARBITRUM_CHAIN_ID) {
        const switched = await switchToArbitrum();
        if (switched) {
          toast.success('Switched to Arbitrum network');
        } else {
          toast.warning('Please switch to Arbitrum network for transactions');
        }
      }
    }
  };

  const handleDisconnectWallet = () => {
    disconnect();
    toast.success('Wallet disconnected');
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const getWalletIcon = (type: string | null) => {
    if (type === 'metamask') return '🦊';
    if (type === 'coinbase') return '🔵';
    return '👛';
  };

  const handleGeneratePaymentLink = async () => {
    // Validate wallet connection
    if (!isConnected || !address) {
      toast.error('Please connect your wallet first');
      return;
    }

    // Validate amount
    const amountValue = parseFloat(amount);
    if (!amount || isNaN(amountValue) || amountValue <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    // Validate environment variables
    if (!BRIDGE_CLIENT_ID) {
      toast.error('Bridge Client ID not configured');
      return;
    }

    if (!BRIDGE_EXTERNAL_ACCOUNT_ID) {
      toast.error('Bridge External Account ID not configured');
      return;
    }

    // Check if on Arbitrum network
    if (chainId !== ARBITRUM_CHAIN_ID) {
      toast.error('Please switch to Arbitrum network');
      const switched = await switchToArbitrum();
      if (!switched) {
        return;
      }
    }

    setIsGeneratingPayment(true);

    try {
      // Get user ID from Supabase
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('User not authenticated');
        setIsGeneratingPayment(false);
        return;
      }

      // Calculate fee and total
      const feeAmount = (amountValue * feePercent).toFixed(2);
      const total = (amountValue + amountValue * feePercent).toFixed(2);

      // Generate idempotency key
      const idempotencyKey = getUUID();

      // Create transaction request
      const result = await bridgeApi.createTransaction({
        idempotency_key: idempotencyKey,
        on_behalf_of: BRIDGE_CLIENT_ID,
        source: {
          currency: 'usdc',
          payment_rail: 'arbitrum',
          from_address: address,
        },
        destination: {
          currency: 'usd',
          payment_rail: 'ach',
          external_account_id: BRIDGE_EXTERNAL_ACCOUNT_ID,
        },
        developer_fee: feeAmount,
        amount: total,
        user_id: user.id,
      });

      if (result.success && result.data) {
        toast.success('Payment link generated successfully!');
        // Refresh transactions list
        await fetchData();
        // Clear amount
        setAmount('');
      } else {
        toast.error(result.error || 'Failed to generate payment link');
      }
    } catch (error) {
      console.error('Error generating payment link:', error);
      toast.error('An error occurred while generating payment link');
    } finally {
      setIsGeneratingPayment(false);
    }
  };

  const handleRefreshTransaction = async (tx: BridgeTransaction) => {
    if (!tx.bridge_transaction_id) {
      toast.error('No Bridge transaction ID available');
      return;
    }

    setRefreshingTxId(tx.id);

    try {
      // Fetch transaction details from Bridge API
      const result = await bridgeApi.getTransaction(tx.bridge_transaction_id);

      if (result.success && result.data) {
        const bridgeTx = result.data;

        // Update the transaction in the database
        await updateTransaction(tx.id, {
          state: bridgeTx.state as BridgeTransaction['state'],
          amount: bridgeTx.amount,
          source_from_address: bridgeTx.source?.from_address,
          source_to_address: bridgeTx.source_deposit_instructions?.to_address,
          source_amount: bridgeTx.source_deposit_instructions?.amount,
          source_currency: bridgeTx.source?.currency,
          source_payment_rail: bridgeTx.source?.payment_rail,
          destination_currency: bridgeTx.destination?.currency,
          destination_payment_rail: bridgeTx.destination?.payment_rail,
          developer_fee: bridgeTx.developer_fee,
        });

        // Update local state
        setTransactions((prev) =>
          prev.map((t) =>
            t.id === tx.id
              ? {
                  ...t,
                  state: bridgeTx.state as BridgeTransaction['state'],
                  amount: bridgeTx.amount,
                  source_from_address: bridgeTx.source?.from_address,
                  source_to_address: bridgeTx.source_deposit_instructions?.to_address,
                  source_amount: bridgeTx.source_deposit_instructions?.amount,
                  source_currency: bridgeTx.source?.currency,
                  source_payment_rail: bridgeTx.source?.payment_rail,
                  destination_currency: bridgeTx.destination?.currency,
                  destination_payment_rail: bridgeTx.destination?.payment_rail,
                  developer_fee: bridgeTx.developer_fee,
                }
              : t
          )
        );

        toast.success('Transaction status updated');
      } else {
        toast.error(result.error || 'Failed to fetch transaction details');
      }
    } catch (error) {
      console.error('Error refreshing transaction:', error);
      toast.error('An error occurred while refreshing transaction');
    } finally {
      setRefreshingTxId(null);
    }
  };

  const handleMakePayment = async (tx: BridgeTransaction) => {
    // Validate wallet connection
    if (!isConnected || !address) {
      toast.error('Please connect your wallet first');
      return;
    }

    // Validate source address matches connected wallet
    if (!tx.source_from_address) {
      toast.error('No source address available for this transaction');
      return;
    }

    if (address.toLowerCase() !== tx.source_from_address.toLowerCase()) {
      toast.error(`Please connect the wallet: ${tx.source_from_address.slice(0, 6)}...${tx.source_from_address.slice(-4)}`);
      return;
    }

    // Validate destination address
    if (!tx.source_to_address) {
      toast.error('No destination address available for this transaction');
      return;
    }

    // Validate destination is a valid Ethereum address (0x + 40 hex chars)
    const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(tx.source_to_address);
    if (!isValidAddress) {
      toast.error('Invalid destination address. Please refresh the transaction first.');
      return;
    }

    // Get amount - prefer source_amount, fallback to amount
    const paymentAmount = tx.source_amount || tx.amount;
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast.error('No valid amount specified for this transaction');
      return;
    }

    // Check if on Arbitrum network
    if (chainId !== ARBITRUM_CHAIN_ID) {
      toast.error('Please switch to Arbitrum network');
      const switched = await switchToArbitrum();
      if (!switched) {
        return;
      }
    }

    setPayingTxId(tx.id);

    try {
      const result = await sendUSDC(tx.source_to_address, paymentAmount);

      if (result.success) {
        toast.success(`Payment sent! TX: ${result.txHash?.slice(0, 10)}...`);
        // Refresh transaction status after payment
        await handleRefreshTransaction(tx);
      } else {
        toast.error(result.error || 'Failed to send payment');
      }
    } catch (error) {
      console.error('Error making payment:', error);
      toast.error('An error occurred while making payment');
    } finally {
      setPayingTxId(null);
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
                  <th className="px-4 py-3 text-left font-semibold">Options</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
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
                          <button
                            onClick={() => handleRefreshTransaction(tx)}
                            disabled={refreshingTxId === tx.id}
                            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                            title="Refresh transaction status"
                          >
                            <RefreshCw
                              size={16}
                              className={refreshingTxId === tx.id ? 'animate-spin' : ''}
                            />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {formatRelativeTime(tx.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleMakePayment(tx)}
                          disabled={payingTxId === tx.id}
                          className="px-3 py-1.5 bg-[#c9a227] text-white text-sm font-medium rounded hover:bg-[#b8922a] transition-colors disabled:opacity-50 flex items-center gap-1"
                        >
                          {payingTxId === tx.id ? (
                            <>
                              <Loader2 size={14} className="animate-spin" />
                              Paying...
                            </>
                          ) : (
                            'Make payment'
                          )}
                        </button>
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
              <span className="text-gray-700 w-32">Fee Rate:</span>
              <span className="text-gray-900">{(feePercent * 100).toFixed(2)}%</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-gray-700 w-32">Fee Amount:</span>
              <span className="text-gray-900">
                ${amount && parseFloat(amount) > 0 ? (parseFloat(amount) * feePercent).toFixed(2) : '0.00'}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-gray-700 w-32 font-bold">Total:</span>
              <span className="text-gray-900 font-bold">
                ${amount && parseFloat(amount) > 0 ? (parseFloat(amount) + parseFloat(amount) * feePercent).toFixed(2) : '0.00'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4">
          {isConnected && address ? (
            <div className="flex items-center gap-2">
              <div className="px-4 py-3 bg-green-100 text-green-800 font-semibold rounded-lg flex items-center gap-2">
                <span>{getWalletIcon(walletType)}</span>
                <span>{formatAddress(address)}</span>
                {chainId === ARBITRUM_CHAIN_ID && (
                  <Check className="h-4 w-4 text-green-600" />
                )}
              </div>
              {chainId !== ARBITRUM_CHAIN_ID && (
                <button
                  onClick={switchToArbitrum}
                  className="px-4 py-3 bg-yellow-500 text-white font-semibold rounded-lg hover:bg-yellow-600 transition-colors"
                >
                  Switch to Arbitrum
                </button>
              )}
              <button
                onClick={handleDisconnectWallet}
                className="px-4 py-3 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition-colors"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                // If only one wallet available, connect directly
                if (availableWallets.metamask && !availableWallets.coinbase) {
                  handleConnectWallet('metamask');
                } else if (availableWallets.coinbase && !availableWallets.metamask) {
                  handleConnectWallet('coinbase');
                } else if (availableWallets.metamask || availableWallets.coinbase) {
                  setShowWalletModal(true);
                } else {
                  toast.error('No wallet detected. Please install MetaMask or Coinbase Wallet.');
                }
              }}
              disabled={isConnecting}
              className="px-6 py-3 bg-[#5a6672] text-white font-semibold rounded-lg hover:bg-[#4a5662] transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Wallet className="h-5 w-5" />
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
          )}
          <button
            onClick={handleGeneratePaymentLink}
            disabled={isGeneratingPayment}
            className="px-6 py-3 bg-[#c9a227] text-white font-semibold rounded-lg hover:bg-[#b8922a] transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {isGeneratingPayment ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate Payment Link'
            )}
          </button>
        </div>
      </div>

      {/* Wallet Selection Modal */}
      {showWalletModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Connect Wallet</h3>
              <button
                onClick={() => setShowWalletModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              {availableWallets.metamask && (
                <button
                  onClick={() => handleConnectWallet('metamask')}
                  disabled={isConnecting}
                  className="w-full px-4 py-3 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg flex items-center gap-3 transition-colors disabled:opacity-50"
                >
                  <span className="text-2xl">🦊</span>
                  <div className="text-left">
                    <div className="font-semibold text-gray-900">MetaMask</div>
                    <div className="text-sm text-gray-500">Connect to your MetaMask wallet</div>
                  </div>
                </button>
              )}

              {availableWallets.coinbase && (
                <button
                  onClick={() => handleConnectWallet('coinbase')}
                  disabled={isConnecting}
                  className="w-full px-4 py-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg flex items-center gap-3 transition-colors disabled:opacity-50"
                >
                  <span className="text-2xl">🔵</span>
                  <div className="text-left">
                    <div className="font-semibold text-gray-900">Coinbase Wallet</div>
                    <div className="text-sm text-gray-500">Connect to your Coinbase wallet</div>
                  </div>
                </button>
              )}

              {!availableWallets.metamask && !availableWallets.coinbase && (
                <div className="text-center py-4 text-gray-500">
                  <p className="mb-3">No wallet detected</p>
                  <div className="flex gap-2 justify-center">
                    <a
                      href="https://metamask.io/download/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[#c9a227] hover:underline"
                    >
                      Install MetaMask
                    </a>
                    <span>|</span>
                    <a
                      href="https://www.coinbase.com/wallet"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[#c9a227] hover:underline"
                    >
                      Install Coinbase Wallet
                    </a>
                  </div>
                </div>
              )}
            </div>

            {isConnecting && (
              <div className="mt-4 text-center text-gray-500">
                <div className="h-5 w-5 border-2 border-[#c9a227]/30 border-t-[#c9a227] rounded-full animate-spin mx-auto mb-2" />
                Connecting...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
