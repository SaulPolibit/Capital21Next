'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, DoorOpen } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { createCustomer } from '@/services/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type AccountType = 'individual' | 'business';

export default function CreateBridgeAccountPage() {
  const router = useRouter();
  const { logout } = useAuth();
  const [accountType, setAccountType] = useState<AccountType>('individual');
  const [loading, setLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Individual fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');

  // Business fields
  const [businessLegalName, setBusinessLegalName] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleSubmit = async () => {
    const emailToValidate = accountType === 'individual' ? email : businessEmail;
    const nameToValidate = accountType === 'individual' ? fullName : businessLegalName;

    if (!nameToValidate) {
      toast.error('Por favor ingrese el nombre');
      return;
    }

    if (!emailToValidate || !validateEmail(emailToValidate)) {
      toast.error('Por favor ingrese un email válido');
      return;
    }

    setShowConfirmDialog(true);
  };

  const confirmCreate = async () => {
    setShowConfirmDialog(false);
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Usuario no autenticado');
        return;
      }

      const emailToUse = accountType === 'individual' ? email : businessEmail;
      const nameToUse = accountType === 'individual' ? fullName : businessLegalName;

      // Parse name for individual
      let firstName = nameToUse;
      let lastName = '';
      if (accountType === 'individual') {
        const nameParts = nameToUse.split(' ');
        firstName = nameParts[0] || '';
        lastName = nameParts.slice(1).join(' ') || '';
      }

      // Create customer in database
      const customerData = {
        first_name: firstName,
        last_name: lastName,
        email: emailToUse,
        status: 'pending' as const,
        type: accountType,
        has_accepted_terms_of_service: false,
        bridge_customer_id: crypto.randomUUID(),
        user_id: user.id,
      };

      await createCustomer(customerData);

      toast.success('Cuenta creada exitosamente');
      router.push('/bridge-accounts');
    } catch (error) {
      console.error('Error creating customer:', error);
      toast.error('Error al crear la cuenta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-full">
      {/* Header */}
      <div className="flex items-center gap-4 bg-[#1a1a2e] text-white p-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/bridge-accounts')}
          className="text-white hover:bg-white/10"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-medium flex-1">Crear Cuenta</h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          className="text-white hover:bg-white/10"
        >
          <DoorOpen className="h-6 w-6" />
        </Button>
      </div>

      {/* Form Content */}
      <div className="p-4 space-y-4">
        {/* Tipo de Cuenta */}
        <div className="space-y-2">
          <p className="font-medium text-gray-900">Tipo de Cuenta:</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAccountType('individual')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                accountType === 'individual'
                  ? 'bg-[#1a1a2e] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              individual
            </button>
            <button
              type="button"
              onClick={() => setAccountType('business')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                accountType === 'business'
                  ? 'bg-[#1a1a2e] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              business
            </button>
          </div>
        </div>

        {/* Individual Form */}
        {accountType === 'individual' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-700 whitespace-nowrap">Nombre Completo:</span>
              <Input
                placeholder="Nombre Completo"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="flex-1 bg-gray-100 border-0"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-700 whitespace-nowrap">Correo Electrónico:</span>
              <Input
                type="email"
                placeholder="Correo Electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 bg-gray-100 border-0"
              />
            </div>
          </div>
        )}

        {/* Business Form */}
        {accountType === 'business' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-700 whitespace-nowrap">Nombre Legal:</span>
              <Input
                placeholder="Nombre Legal"
                value={businessLegalName}
                onChange={(e) => setBusinessLegalName(e.target.value)}
                className="flex-1 bg-gray-100 border-0"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-700 whitespace-nowrap">Correo Electrónico:</span>
              <Input
                type="email"
                placeholder="Correo Electrónico"
                value={businessEmail}
                onChange={(e) => setBusinessEmail(e.target.value)}
                className="flex-1 bg-gray-100 border-0"
              />
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-center pt-4">
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-[#1a1a2e] hover:bg-[#2a2a3e] text-white h-10 px-6 rounded-lg"
          >
            {loading ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmación</AlertDialogTitle>
            <AlertDialogDescription>
              Confirma la creación de una cuenta de tipo {accountType}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCreate}
              className="bg-[#1a1a2e] hover:bg-[#2a2a3e]"
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
