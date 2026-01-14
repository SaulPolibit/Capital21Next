'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown } from 'lucide-react';

const countries = [
  { code: '+56', name: 'Chile' },
  { code: '+52', name: 'México' },
  { code: '+1', name: 'USA' },
  { code: '+34', name: 'España' },
];

export default function MFAPage() {
  const router = useRouter();
  const [selectedCountry, setSelectedCountry] = useState(countries[0]);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleSendCode = async () => {
    if (!phoneNumber) return;
    setLoading(true);

    // Simulate sending code
    setTimeout(() => {
      router.push('/mfa-code');
    }, 1000);
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
            Write down your phone number
          </p>

          {/* Phone Input */}
          <div className="flex gap-2 mb-8">
            {/* Country Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-2 px-4 py-3 border border-gray-300 rounded-lg bg-white min-w-[120px]"
              >
                <span>{selectedCountry.name}</span>
                <ChevronDown size={16} />
              </button>
              {showDropdown && (
                <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                  {countries.map((country) => (
                    <button
                      key={country.code}
                      type="button"
                      onClick={() => {
                        setSelectedCountry(country);
                        setShowDropdown(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-100"
                    >
                      {country.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Phone Number Input */}
            <input
              type="tel"
              placeholder="Número de teléfono"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#c9a227]"
            />
          </div>

          {/* Send Code Button */}
          <button
            onClick={handleSendCode}
            disabled={loading || !phoneNumber}
            className="w-full py-3 bg-[#c9a227] text-white font-semibold rounded-full hover:bg-[#b8922a] transition-colors disabled:opacity-50"
          >
            {loading ? 'Enviando...' : 'Enviar Código'}
          </button>
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
