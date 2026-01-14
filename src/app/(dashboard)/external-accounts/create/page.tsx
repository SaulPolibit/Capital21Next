'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ChevronDown, DoorOpen } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { createExternalAccount, getCustomersByUserId } from '@/services/database';
import type { BridgeCustomer } from '@/types';

const countries = [
  { code: 'US', name: 'Estados Unidos' },
  { code: 'MX', name: 'México' },
  { code: 'ES', name: 'España' },
  { code: 'CL', name: 'Chile' },
  { code: 'CO', name: 'Colombia' },
  { code: 'AR', name: 'Argentina' },
  { code: 'PE', name: 'Perú' },
];

export default function CreateExternalAccountPage() {
  const router = useRouter();
  const { logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<BridgeCustomer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Form fields
  const [selectedCustomer, setSelectedCustomer] = useState<BridgeCustomer | null>(null);
  const [accountType, setAccountType] = useState<'us' | 'iban' | 'unknown'>('us');
  const [accountNumber, setAccountNumber] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [checkingOrSavings, setCheckingOrSavings] = useState<'checking' | 'savings'>('checking');
  const [currency, setCurrency] = useState<'usd' | 'mxn' | 'eur'>('usd');
  const [bankName, setBankName] = useState('');
  const [ownerType, setOwnerType] = useState<'individual' | 'business'>('individual');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState(countries[0]);
  const [postalCode, setPostalCode] = useState('');

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const customersData = await getCustomersByUserId(user.id);
        const activeCustomers = customersData.filter((c) => c.status === 'active');
        setCustomers(activeCustomers);
      } catch (error) {
        console.error('Error fetching customers:', error);
      } finally {
        setLoadingCustomers(false);
      }
    };

    fetchCustomers();
  }, []);

  const handleSubmit = async () => {
    if (!selectedCustomer) {
      toast.error('Por favor seleccione un propietario de la cuenta');
      return;
    }

    if (!accountNumber || !bankName) {
      toast.error('Por favor complete todos los campos requeridos');
      return;
    }

    if (accountType === 'us' && !routingNumber) {
      toast.error('El número de tránsito es requerido para cuentas US');
      return;
    }

    if (ownerType === 'individual' && (!firstName || !lastName)) {
      toast.error('Por favor ingrese el nombre completo del titular');
      return;
    }

    if (ownerType === 'business' && !businessName) {
      toast.error('Por favor ingrese el nombre comercial');
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Usuario no autenticado');
        return;
      }

      const accountData = {
        external_account_id: crypto.randomUUID(),
        customer_id: selectedCustomer.bridge_customer_id || '',
        bank_name: bankName,
        account_owner_name: ownerType === 'individual' ? `${firstName} ${lastName}` : businessName,
        account_owner_type: ownerType,
        account_type: accountType === 'unknown' ? 'us' : accountType,
        account_last_4: accountNumber.slice(-4),
        account_routing_number: routingNumber || undefined,
        account_checking_or_savings: accountType === 'us' ? checkingOrSavings : undefined,
        currency: currency,
        active: true,
        status: 'active' as const,
        user_id: user.id,
        // Additional address fields could be stored in a JSON column or separate table
      };

      await createExternalAccount(accountData);

      toast.success('Cuenta externa creada exitosamente');
      router.push('/external-accounts');
    } catch (error) {
      console.error('Error creating external account:', error);
      toast.error('Error al crear la cuenta externa');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full bg-gray-100">
      {/* Header */}
      <div className="bg-[#c9a227] text-white px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => router.push('/external-accounts')}
          className="hover:bg-white/10 p-1 rounded"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-xl font-semibold flex-1">Crear Cuenta externa</h1>
        <button
          onClick={handleLogout}
          className="hover:bg-white/10 p-2 rounded"
        >
          <DoorOpen className="h-6 w-6" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Propietario de la Cuenta */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Propietario de la Cuenta
          </label>
          {loadingCustomers ? (
            <div className="h-12 bg-gray-200 animate-pulse rounded-lg" />
          ) : customers.length === 0 ? (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 text-sm">
              No tienes clientes Bridge activos. Primero debes crear y activar un cliente.
            </div>
          ) : (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
                className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-300 rounded-lg text-left"
              >
                <span className={selectedCustomer ? 'text-gray-900' : 'text-gray-400'}>
                  {selectedCustomer
                    ? `${selectedCustomer.first_name} ${selectedCustomer.last_name}`
                    : 'Seleccione un propietario'}
                </span>
                <ChevronDown className="h-5 w-5 text-gray-400" />
              </button>
              {showCustomerDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                  {customers.map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => {
                        setSelectedCustomer(customer);
                        setShowCustomerDropdown(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 text-gray-900"
                    >
                      {customer.first_name} {customer.last_name} - {customer.email}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tipo de Cuenta - Chips */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tipo de Cuenta
          </label>
          <div className="flex gap-2">
            {(['us', 'iban', 'unknown'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setAccountType(type)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  accountType === type
                    ? 'bg-[#c9a227] text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Datos de Cuenta */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-700">Datos de Cuenta</h3>

          <input
            type="text"
            placeholder="Número de Cuenta"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-[#c9a227]"
          />

          {accountType === 'us' && (
            <input
              type="text"
              placeholder="Número de Tránsito"
              value={routingNumber}
              onChange={(e) => setRoutingNumber(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-[#c9a227]"
            />
          )}
        </div>

        {/* Tipo de cuenta (checking/savings) - Chips */}
        {accountType === 'us' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de cuenta
            </label>
            <div className="flex gap-2">
              {(['checking', 'savings'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setCheckingOrSavings(type)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    checkingOrSavings === type
                      ? 'bg-[#c9a227] text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Moneda - Chips */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Moneda
          </label>
          <div className="flex gap-2">
            {(['usd', 'mxn', 'eur'] as const).map((curr) => (
              <button
                key={curr}
                type="button"
                onClick={() => setCurrency(curr)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  currency === curr
                    ? 'bg-[#c9a227] text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {curr}
              </button>
            ))}
          </div>
        </div>

        {/* Nombre del Banco */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre del Banco
          </label>
          <input
            type="text"
            placeholder="Nombre del Banco"
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-[#c9a227]"
          />
        </div>

        {/* Tipo de Propietario - Chips */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tipo de Propietario
          </label>
          <div className="flex gap-2">
            {(['individual', 'business'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setOwnerType(type)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  ownerType === type
                    ? 'bg-[#c9a227] text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Owner Name Fields */}
        {ownerType === 'individual' ? (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre(s) del Titular la Cuenta
              </label>
              <input
                type="text"
                placeholder="Nombre(s)"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-[#c9a227]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Apellido(s) del Titular la Cuenta
              </label>
              <input
                type="text"
                placeholder="Apellido(s)"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-[#c9a227]"
              />
            </div>
          </>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre Comercial
            </label>
            <input
              type="text"
              placeholder="Nombre Comercial"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-[#c9a227]"
            />
          </div>
        )}

        {/* Domicilio */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-700">Domicilio</h3>

          <input
            type="text"
            placeholder="Dirección"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-[#c9a227]"
          />

          <input
            type="text"
            placeholder="Ciudad"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-[#c9a227]"
          />

          <input
            type="text"
            placeholder="Estado"
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-[#c9a227]"
          />

          {/* Country Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowCountryDropdown(!showCountryDropdown)}
              className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-300 rounded-lg text-left"
            >
              <span className="text-gray-900">{country.name}</span>
              <ChevronDown className="h-5 w-5 text-gray-400" />
            </button>
            {showCountryDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                {countries.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => {
                      setCountry(c);
                      setShowCountryDropdown(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 text-gray-900"
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <input
            type="text"
            placeholder="Código Postal"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-[#c9a227]"
          />
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <button
            onClick={handleSubmit}
            disabled={loading || customers.length === 0}
            className="w-full py-3 bg-[#c9a227] text-white font-semibold rounded-lg hover:bg-[#b8922a] transition-colors disabled:opacity-50"
          >
            {loading ? 'Creando...' : 'Crear Cuenta'}
          </button>
        </div>
      </div>
    </div>
  );
}
