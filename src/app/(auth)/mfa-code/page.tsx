'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function MFACodePage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!code) return;
    setLoading(true);

    // Simulate code verification
    setTimeout(() => {
      router.push('/dashboard');
    }, 1000);
  };

  const handleCancel = () => {
    router.push('/login');
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="w-1/2 flex flex-col justify-center items-center px-16 bg-white">
        <div className="w-full max-w-md">
          {/* Title */}
          <h1 className="text-3xl font-bold text-[#c9a227] text-center mb-4">
            MFA Authentication
          </h1>

          {/* Subtitle */}
          <p className="text-gray-600 text-center mb-8">
            Writedown received SMS code
          </p>

          {/* Code Input */}
          <div className="mb-8">
            <label className="block text-xs text-gray-500 mb-1 ml-2">
              E-mail
            </label>
            <input
              type="text"
              placeholder="SMS Code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:border-[#c9a227]"
            />
          </div>

          {/* Buttons */}
          <div className="space-y-4">
            <button
              onClick={handleSend}
              disabled={loading || !code}
              className="w-full py-3 bg-[#c9a227] text-white font-semibold rounded-full hover:bg-[#b8922a] transition-colors disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Send'}
            </button>

            <button
              onClick={handleCancel}
              className="w-full py-3 bg-[#e57373] text-white font-semibold rounded-full hover:bg-[#d32f2f] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Right side - Image */}
      <div className="w-1/2 relative">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=1470&q=80')`,
          }}
        />
      </div>
    </div>
  );
}
