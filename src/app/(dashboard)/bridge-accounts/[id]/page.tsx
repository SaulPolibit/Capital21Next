'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, DoorOpen } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { getCustomerById, updateCustomer } from '@/services/database';
import type { BridgeCustomer } from '@/types';

export default function BridgeAccountDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { logout } = useAuth();
  const [customer, setCustomer] = useState<BridgeCustomer | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingLink, setGeneratingLink] = useState<'tos' | 'kyc' | null>(null);

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const fetchCustomer = async () => {
    try {
      const customerData = await getCustomerById(params.id as string);
      setCustomer(customerData);
    } catch (error) {
      console.error('Error fetching customer:', error);
      toast.error('Error al cargar los datos del cliente');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.id) {
      fetchCustomer();
    }
  }, [params.id]);

  const generateTosLink = async () => {
    if (!customer) return;
    setGeneratingLink('tos');

    try {
      const mockTosLink = `https://bridge.xyz/tos/${customer.bridge_customer_id}`;
      await updateCustomer(customer.id, { tos_link: mockTosLink });
      setCustomer({ ...customer, tos_link: mockTosLink });
      toast.success('Link de Términos de Servicio generado');
    } catch (error) {
      console.error('Error generating ToS link:', error);
      toast.error('Error al generar el link');
    } finally {
      setGeneratingLink(null);
    }
  };

  const generateKycLink = async () => {
    if (!customer) return;
    setGeneratingLink('kyc');

    try {
      const mockKycLink = `https://bridge.xyz/kyc/${customer.bridge_customer_id}`;
      await updateCustomer(customer.id, { kyc_link: mockKycLink });
      setCustomer({ ...customer, kyc_link: mockKycLink });
      toast.success('Link de KYC generado');
    } catch (error) {
      console.error('Error generating KYC link:', error);
      toast.error('Error al generar el link');
    } finally {
      setGeneratingLink(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="h-8 w-8 border-4 border-[#c9a227]/30 border-t-[#c9a227] rounded-full animate-spin" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500 mb-4">Cliente no encontrado</p>
        <button
          onClick={() => router.push('/bridge-accounts')}
          className="text-[#c9a227] hover:underline"
        >
          Volver a Cuentas Bridge
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-100">
      {/* Header */}
      <div className="bg-[#c9a227] text-white px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => router.push('/bridge-accounts')}
          className="hover:bg-white/10 p-1 rounded"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-xl font-semibold flex-1">Detalle de Cuenta</h1>
        <button
          onClick={handleLogout}
          className="hover:bg-white/10 p-2 rounded"
        >
          <DoorOpen className="h-6 w-6" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-2">
        {/* Nombre(s) */}
        <div className="text-gray-900">
          <span className="font-medium">Nombre(s):</span>
          <span className="ml-1">{customer.first_name || '-'}</span>
        </div>

        {/* Apellido(s) */}
        <div className="text-gray-900">
          <span className="font-medium">Apellido(s):</span>
          <span className="ml-1">{customer.last_name || '-'}</span>
        </div>

        {/* Correo Eléctronico */}
        <div className="text-gray-900">
          <span className="font-medium">Correo Eléctronico:</span>
          <span className="ml-1">{customer.email || '-'}</span>
        </div>

        {/* Estatus */}
        <div className="text-gray-900">
          <span className="font-medium">Estatus:</span>
          <span className="ml-1">{customer.status || '-'}</span>
        </div>

        {/* Tipo */}
        <div className="text-gray-900">
          <span className="font-medium">Tipo:</span>
          <span className="ml-1">{customer.type || '-'}</span>
        </div>

        {/* Terminos de Servicio */}
        <div className="flex items-center gap-2 flex-wrap pt-4">
          <span className="font-medium text-gray-900">Terminos de Servicio:</span>
          {customer.has_accepted_terms_of_service ? (
            <span className="text-gray-900">Completado</span>
          ) : (
            <>
              <button
                onClick={generateTosLink}
                disabled={generatingLink === 'tos'}
                className="px-4 py-2 bg-[#c9a227] text-white font-medium rounded-lg hover:bg-[#b8922a] transition-colors disabled:opacity-50"
              >
                {generatingLink === 'tos' ? 'Generando...' : 'Generar Link'}
              </button>
              {customer.tos_link && (
                <button
                  onClick={() => window.open(customer.tos_link!, '_blank')}
                  className="px-4 py-2 bg-[#c9a227] text-white font-medium rounded-lg hover:bg-[#b8922a] transition-colors"
                >
                  Ver ToS
                </button>
              )}
            </>
          )}
        </div>

        {/* Estatus KYB */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-gray-900">
            Estatus {customer.type === 'individual' ? 'KYC' : 'KYB'}:
          </span>
          {customer.status === 'active' ? (
            <span className="text-gray-900">Completado</span>
          ) : (
            <>
              <button
                onClick={generateKycLink}
                disabled={generatingLink === 'kyc'}
                className="px-4 py-2 bg-[#c9a227] text-white font-medium rounded-lg hover:bg-[#b8922a] transition-colors disabled:opacity-50"
              >
                {generatingLink === 'kyc' ? 'Generando...' : 'Generar Link'}
              </button>
              {customer.kyc_link && (
                <button
                  onClick={() => window.open(customer.kyc_link!, '_blank')}
                  className="px-4 py-2 bg-[#c9a227] text-white font-medium rounded-lg hover:bg-[#b8922a] transition-colors"
                >
                  Comenzar
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
