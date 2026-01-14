'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Search, Eye, RefreshCw, DoorOpen } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { getCustomersByUserId } from '@/services/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { BridgeCustomer } from '@/types';
import { CUSTOMER_STATUS_LABELS } from '@/types';

export default function BridgeAccountsPage() {
  const router = useRouter();
  const { logout } = useAuth();
  const [customers, setCustomers] = useState<BridgeCustomer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<BridgeCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const customersData = await getCustomersByUserId(user.id);
      setCustomers(customersData);
      setFilteredCustomers(customersData);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = customers.filter(
        (customer) =>
          customer.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          customer.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          customer.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCustomers(filtered);
    } else {
      setFilteredCustomers(customers);
    }
  }, [searchTerm, customers]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'rejected':
        return 'bg-red-100 text-red-700';
      case 'under_review':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
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
        <h1 className="text-xl font-semibold">Cuentas Bridge</h1>
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
            Administra tus cuentas de cliente Bridge
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={fetchCustomers}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar
            </Button>
            <Link href="/bridge-accounts/create">
              <Button className="bg-[#c9a227] hover:bg-[#b8922a]">
                <Plus className="h-4 w-4 mr-2" />
                Crear Cuenta
              </Button>
            </Link>
          </div>
        </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por nombre o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Customers List */}
      {filteredCustomers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-gray-500 mb-4">
              {searchTerm
                ? 'No se encontraron cuentas con ese criterio'
                : 'No tienes cuentas Bridge aún'}
            </p>
            {!searchTerm && (
              <Link href="/bridge-accounts/create">
                <Button className="bg-[#c9a227] hover:bg-[#b8922a]">
                  <Plus className="h-4 w-4 mr-2" />
                  Crear tu primera cuenta
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredCustomers.map((customer) => (
            <Card key={customer.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">
                        {customer.first_name} {customer.last_name}
                      </h3>
                      <Badge className={getStatusColor(customer.status)}>
                        {CUSTOMER_STATUS_LABELS[customer.status]}
                      </Badge>
                      <Badge variant="outline">
                        {customer.type === 'individual' ? 'Individual' : 'Empresa'}
                      </Badge>
                    </div>
                    <p className="text-gray-500">{customer.email}</p>
                    <div className="flex gap-4 mt-3 text-sm text-gray-500">
                      <span>
                        ToS:{' '}
                        {customer.has_accepted_terms_of_service ? (
                          <span className="text-green-600">Aceptados</span>
                        ) : (
                          <span className="text-yellow-600">Pendiente</span>
                        )}
                      </span>
                      <span>
                        KYC:{' '}
                        {customer.status === 'active' ? (
                          <span className="text-green-600">Completado</span>
                        ) : (
                          <span className="text-yellow-600">Pendiente</span>
                        )}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/bridge-accounts/${customer.id}`)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Ver Detalle
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
