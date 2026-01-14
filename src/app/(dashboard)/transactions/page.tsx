'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, RefreshCw, ArrowRightLeft, Filter, DoorOpen } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { getTransactionsByUserId } from '@/services/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { BridgeTransaction, TransactionState } from '@/types';
import { TRANSACTION_STATE_LABELS } from '@/types';

export default function TransactionsPage() {
  const router = useRouter();
  const { logout } = useAuth();
  const [transactions, setTransactions] = useState<BridgeTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<BridgeTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const transactionsData = await getTransactionsByUserId(user.id);
      setTransactions(transactionsData);
      setFilteredTransactions(transactionsData);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  useEffect(() => {
    let filtered = transactions;

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((t) => t.state === statusFilter);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (t) =>
          t.bridge_transaction_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.amount.includes(searchTerm)
      );
    }

    setFilteredTransactions(filtered);
  }, [searchTerm, statusFilter, transactions]);

  const getStatusColor = (state: TransactionState) => {
    switch (state) {
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'pending':
      case 'awaiting_funds':
        return 'bg-yellow-100 text-yellow-700';
      case 'in_review':
      case 'funds_received':
      case 'payment_submitted':
      case 'payment_processed':
        return 'bg-blue-100 text-blue-700';
      case 'error':
      case 'canceled':
      case 'returned':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 border-3 border-[#c9a227]/30 border-t-[#c9a227] rounded-full animate-spin" />
          <span className="text-gray-500">Cargando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-100">
      {/* Header */}
      <div className="bg-[#c9a227] text-white px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Transacciones</h1>
        <button
          onClick={handleLogout}
          className="hover:bg-white/10 p-2 rounded"
        >
          <DoorOpen className="h-6 w-6" />
        </button>
      </div>

      <div className="p-6">
        {/* Actions */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-gray-500">
            Historial de todas tus transacciones
          </p>
          <Button variant="outline" onClick={fetchTransactions}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por ID o monto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="pending">Pendiente</SelectItem>
            <SelectItem value="awaiting_funds">Esperando Fondos</SelectItem>
            <SelectItem value="in_review">En Revisión</SelectItem>
            <SelectItem value="completed">Completado</SelectItem>
            <SelectItem value="canceled">Cancelado</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Transactions Table Header */}
      {filteredTransactions.length > 0 && (
        <div className="grid grid-cols-6 gap-4 px-6 py-3 bg-gray-100 rounded-t-lg font-medium text-sm text-gray-600">
          <span>ID</span>
          <span>Monto</span>
          <span>De → A</span>
          <span>Estado</span>
          <span>Fecha</span>
          <span className="text-right">Rail</span>
        </div>
      )}

      {/* Transactions List */}
      {filteredTransactions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ArrowRightLeft className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500 mb-4">
              {searchTerm || statusFilter !== 'all'
                ? 'No se encontraron transacciones con ese criterio'
                : 'No tienes transacciones aún'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-b-lg divide-y">
          {filteredTransactions.map((transaction) => (
            <div
              key={transaction.id}
              className="grid grid-cols-6 gap-4 px-6 py-4 items-center hover:bg-gray-50"
            >
              <div>
                <p className="font-mono text-sm truncate" title={transaction.bridge_transaction_id || ''}>
                  {transaction.bridge_transaction_id?.slice(0, 8) || '-'}...
                </p>
              </div>

              <div>
                <p className="font-semibold">
                  {transaction.amount} {transaction.currency.toUpperCase()}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {transaction.source_currency?.toUpperCase() || '?'}
                </Badge>
                <span className="text-gray-400">→</span>
                <Badge variant="outline" className="text-xs">
                  {transaction.destination_currency?.toUpperCase() || '?'}
                </Badge>
              </div>

              <div>
                <Badge className={getStatusColor(transaction.state)}>
                  {TRANSACTION_STATE_LABELS[transaction.state]}
                </Badge>
              </div>

              <div>
                <p className="text-sm text-gray-500">
                  {formatDate(transaction.created_at)}
                </p>
              </div>

              <div className="text-right">
                <p className="text-sm text-gray-500">
                  {transaction.destination_payment_rail || '-'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {transactions.length > 0 && (
        <div className="mt-6 grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-500">Total Transacciones</p>
              <p className="text-2xl font-bold">{transactions.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-500">Completadas</p>
              <p className="text-2xl font-bold text-green-600">
                {transactions.filter((t) => t.state === 'completed').length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-500">Pendientes</p>
              <p className="text-2xl font-bold text-yellow-600">
                {transactions.filter((t) =>
                  ['pending', 'awaiting_funds', 'in_review', 'funds_received', 'payment_submitted'].includes(t.state)
                ).length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-500">Fallidas</p>
              <p className="text-2xl font-bold text-red-600">
                {transactions.filter((t) =>
                  ['error', 'canceled', 'returned'].includes(t.state)
                ).length}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
      </div>
    </div>
  );
}
