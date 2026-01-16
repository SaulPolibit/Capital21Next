'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, DoorOpen, ChevronDown, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import type { BridgeTransaction, LocalUser } from '@/types';
import { toast } from 'sonner';

const countries = ['Chile', 'Argentina', 'Mexico', 'Colombia', 'Peru', 'USA'];

export default function RootDashboardPage() {
  const router = useRouter();
  const { userData, logout, isRoot } = useAuth();
  const [transactions, setTransactions] = useState<BridgeTransaction[]>([]);
  const [users, setUsers] = useState<LocalUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderByTx, setOrderByTx] = useState<'amount' | 'status'>('amount');
  const [orderByUsers, setOrderByUsers] = useState<'name' | 'country'>('name');
  const [totalReceived, setTotalReceived] = useState(0);

  // User creation form state
  const [showUserForm, setShowUserForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState<'admin' | 'customer'>('customer');
  const [formCountry, setFormCountry] = useState('Chile');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formPasswordConfirm, setFormPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);

  useEffect(() => {
    if (!isRoot && userData) {
      if (userData.role === 'admin') {
        router.push('/dashboard-admin');
      } else {
        router.push('/dashboard');
      }
    }
  }, [isRoot, userData, router]);

  const fetchData = async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      // Fetch all transactions
      const { data: txData, error: txError } = await supabase
        .from('bridge_transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (txError) {
        console.error('Error fetching transactions:', txError);
      }

      // Fetch all users
      const { data: usersData, error: usersError } = await supabase
        .from('local_users')
        .select('*')
        .order('display_name', { ascending: true });

      if (usersError) {
        console.error('Error fetching users:', usersError);
      }

      setTransactions(txData || []);
      setUsers(usersData || []);

      // Calculate total received
      const total = (txData || [])
        .filter(tx => tx.state === 'completed')
        .reduce((sum, tx) => sum + parseFloat(tx.amount || '0'), 0);
      setTotalReceived(total);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (isRoot) {
      fetchData();
    }
  }, [isRoot]);

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const sortedTransactions = [...transactions].sort((a, b) => {
    if (orderByTx === 'amount') {
      return parseFloat(b.amount || '0') - parseFloat(a.amount || '0');
    }
    return (a.state || '').localeCompare(b.state || '');
  });

  const sortedUsers = [...users].sort((a, b) => {
    if (orderByUsers === 'name') {
      return (a.display_name || '').localeCompare(b.display_name || '');
    }
    return (a.country || '').localeCompare(b.country || '');
  });

  const handleToggleUser = async (user: LocalUser) => {
    try {
      const newDisabled = !user.disabled;
      const { error } = await supabase
        .from('local_users')
        .update({ disabled: newDisabled })
        .eq('id', user.id);

      if (error) throw error;

      toast.success(newDisabled ? 'User disabled' : 'User enabled');
      fetchData(false);
    } catch (error) {
      console.error('Error toggling user:', error);
      toast.error('Error updating user');
    }
  };

  const handleCreateUser = async () => {
    // Validate required fields
    if (!formName.trim()) {
      toast.error('Name is required');
      return;
    }

    if (!formEmail.trim()) {
      toast.error('Email is required');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formEmail)) {
      toast.error('Invalid email format');
      return;
    }

    if (!formPassword) {
      toast.error('Password is required');
      return;
    }

    if (formPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (!formPasswordConfirm) {
      toast.error('Password confirmation is required');
      return;
    }

    if (formPassword !== formPasswordConfirm) {
      toast.error('Passwords do not match');
      return;
    }

    setCreatingUser(true);
    try {
      // Call API to create user with email confirmed
      const response = await fetch('/api/users/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formEmail.trim(),
          password: formPassword,
          displayName: formName.trim(),
          role: formRole,
          country: formCountry,
          phoneNumber: formPhone.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user');
      }

      toast.success('User created successfully');

      // Reset form
      setFormName('');
      setFormEmail('');
      setFormPhone('');
      setFormPassword('');
      setFormPasswordConfirm('');
      setFormRole('customer');
      setFormCountry('Chile');

      // Refresh users list without showing loading spinner
      fetchData(false);
    } catch (error: unknown) {
      console.error('Error creating user:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error creating user';
      toast.error(errorMessage);
    } finally {
      setCreatingUser(false);
    }
  };

  const exportTransactionsToCSV = () => {
    const headers = ['Transaction ID', 'Destination', 'Fee', 'Amount', 'State'];
    const rows = sortedTransactions.map(tx => [
      tx.bridge_transaction_id || '',
      tx.destination_external_account_id || '',
      tx.developer_fee || '',
      tx.amount || '',
      tx.state || '',
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transactions.csv';
    a.click();
  };

  const exportUsersToCSV = () => {
    const headers = ['Name', 'Email', 'Country', 'Phone Number', 'Role', 'Disabled'];
    const rows = sortedUsers.map(user => [
      user.display_name || '',
      user.email || '',
      user.country || '',
      user.phone_number || '',
      user.role || '',
      user.disabled ? 'Yes' : 'No',
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users.csv';
    a.click();
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
        <h1 className="text-2xl font-semibold">Century 21 Root</h1>
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

          {/* Order By and Export */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Order by</span>
              <button
                onClick={() => setOrderByTx('amount')}
                className={`px-3 py-1 rounded text-sm ${
                  orderByTx === 'amount'
                    ? 'bg-[#5a6672] text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                Amount
              </button>
              <button
                onClick={() => setOrderByTx('status')}
                className={`px-3 py-1 rounded text-sm ${
                  orderByTx === 'status'
                    ? 'bg-[#5a6672] text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                Status
              </button>
            </div>
            <button
              onClick={exportTransactionsToCSV}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              Export to CSV
            </button>
          </div>

          {/* Transactions Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#5a6672] text-white">
                  <th className="px-4 py-3 text-left font-semibold">Transaction ID</th>
                  <th className="px-4 py-3 text-left font-semibold">Destination</th>
                  <th className="px-4 py-3 text-left font-semibold">Fee</th>
                  <th className="px-4 py-3 text-left font-semibold">Amount</th>
                  <th className="px-4 py-3 text-left font-semibold">State</th>
                </tr>
              </thead>
              <tbody>
                {sortedTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      No transactions yet
                    </td>
                  </tr>
                ) : (
                  sortedTransactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-gray-200">
                      <td className="px-4 py-3 text-gray-600">
                        {tx.bridge_transaction_id ?? '[id]'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {tx.destination_external_account_id ?? '[destination]'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        $ {tx.developer_fee || '0'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        $ {tx.amount || '0'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {tx.state || '[state]'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <p className="mt-4 font-bold text-gray-900">
            Total received: ${totalReceived.toFixed(2)}
          </p>
        </div>

        {/* Users Section */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Users</h2>

          {/* Order By and Export */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Order by</span>
              <button
                onClick={() => setOrderByUsers('name')}
                className={`px-3 py-1 rounded text-sm ${
                  orderByUsers === 'name'
                    ? 'bg-[#5a6672] text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                Name
              </button>
              <button
                onClick={() => setOrderByUsers('country')}
                className={`px-3 py-1 rounded text-sm ${
                  orderByUsers === 'country'
                    ? 'bg-[#5a6672] text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                Country
              </button>
            </div>
            <button
              onClick={exportUsersToCSV}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              Export to CSV
            </button>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#5a6672] text-white">
                  <th className="px-4 py-3 text-left font-semibold">Name</th>
                  <th className="px-4 py-3 text-left font-semibold">Email</th>
                  <th className="px-4 py-3 text-left font-semibold">Country</th>
                  <th className="px-4 py-3 text-left font-semibold">Phone number</th>
                  <th className="px-4 py-3 text-left font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {sortedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      No users yet
                    </td>
                  </tr>
                ) : (
                  sortedUsers.map((user) => (
                    <tr key={user.id} className="border-b border-gray-200">
                      <td className="px-4 py-3 text-gray-600">
                        {user.display_name || '[name]'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {user.email || '[email]'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {user.country || '[country]'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {user.phone_number || '[phone]'}
                      </td>
                      <td className="px-4 py-3">
                        {user.id === userData?.id ? (
                          <span className="text-gray-400 text-sm">-</span>
                        ) : (
                          <button
                            onClick={() => handleToggleUser(user)}
                            className="px-4 py-2 bg-[#c9a227] text-white text-sm font-medium rounded-lg hover:bg-[#b8922a] transition-colors"
                          >
                            {user.disabled ? 'Habilitar' : 'Deshabilitar'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* User Creation Section */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">User Creation</h2>

          <div className="space-y-4 max-w-2xl">
            {/* Name */}
            <div className="flex items-center gap-4">
              <span className="text-gray-600 w-48">Name:</span>
              <input
                type="text"
                placeholder="Name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="flex-1 px-4 py-2 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c9a227]"
              />
            </div>

            {/* User Type */}
            <div className="flex items-center gap-4">
              <span className="text-gray-600 w-48">User Type:</span>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                  className="flex items-center justify-between w-48 px-4 py-2 bg-gray-100 rounded-lg"
                >
                  <span>{formRole}</span>
                  <ChevronDown className="h-4 w-4" />
                </button>
                {showRoleDropdown && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                    {(['admin', 'customer'] as const).map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => {
                          setFormRole(role);
                          setShowRoleDropdown(false);
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-100"
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Country */}
            <div className="flex items-center gap-4">
              <span className="text-gray-600 w-48">Country:</span>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                  className="flex items-center justify-between w-48 px-4 py-2 bg-gray-100 rounded-lg"
                >
                  <span>{formCountry}</span>
                  <ChevronDown className="h-4 w-4" />
                </button>
                {showCountryDropdown && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                    {countries.map((country) => (
                      <button
                        key={country}
                        type="button"
                        onClick={() => {
                          setFormCountry(country);
                          setShowCountryDropdown(false);
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-100"
                      >
                        {country}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Email */}
            <div className="flex items-center gap-4">
              <span className="text-gray-600 w-48">Email:</span>
              <input
                type="email"
                placeholder="Email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                className="flex-1 px-4 py-2 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c9a227]"
              />
            </div>

            {/* Phone Number */}
            <div className="flex items-center gap-4">
              <span className="text-gray-600 w-48">Phone Number (with country code):</span>
              <input
                type="tel"
                placeholder="Phone Number"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                className="flex-1 px-4 py-2 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c9a227]"
              />
            </div>

            {/* Password */}
            <div className="flex items-center gap-4">
              <span className="text-gray-600 w-48">Password:</span>
              <div className="flex-1 relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c9a227] pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Password Confirm */}
            <div className="flex items-center gap-4">
              <span className="text-gray-600 w-48">Password Confirm:</span>
              <div className="flex-1 relative">
                <input
                  type={showPasswordConfirm ? 'text' : 'password'}
                  placeholder="Confirm Password"
                  value={formPasswordConfirm}
                  onChange={(e) => setFormPasswordConfirm(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c9a227] pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPasswordConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Create User Button */}
            <div className="pt-4">
              <button
                onClick={handleCreateUser}
                disabled={creatingUser}
                className="px-8 py-3 bg-[#c9a227] text-white font-semibold rounded-lg hover:bg-[#b8922a] transition-colors disabled:opacity-50"
              >
                {creatingUser ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
