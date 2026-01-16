'use client';

import { useState, useEffect, useCallback } from 'react';

// Extend Window interface for ethereum providers
declare global {
  interface Window {
    ethereum?: EthereumProvider;
    coinbaseWalletExtension?: EthereumProvider;
  }
}

interface EthereumProvider {
  isMetaMask?: boolean;
  isCoinbaseWallet?: boolean;
  providers?: EthereumProvider[];
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on: (event: string, callback: (...args: unknown[]) => void) => void;
  removeListener: (event: string, callback: (...args: unknown[]) => void) => void;
}

export type WalletType = 'metamask' | 'coinbase' | 'unknown';

interface WalletState {
  isConnected: boolean;
  address: string | null;
  walletType: WalletType | null;
  chainId: string | null;
  isConnecting: boolean;
  error: string | null;
}

interface AvailableWallets {
  metamask: boolean;
  coinbase: boolean;
}

interface UseWalletReturn extends WalletState {
  availableWallets: AvailableWallets;
  connect: (preferredWallet?: WalletType) => Promise<string | null>;
  disconnect: () => void;
  switchToArbitrum: () => Promise<boolean>;
  sendUSDC: (toAddress: string, amount: string) => Promise<{ success: boolean; txHash?: string; error?: string }>;
}

// Arbitrum chain config
const ARBITRUM_CHAIN_ID = '0xa4b1'; // 42161 in hex
// USDC on Arbitrum (native USDC)
const USDC_CONTRACT_ADDRESS = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const USDC_DECIMALS = 6;

const ARBITRUM_CONFIG = {
  chainId: ARBITRUM_CHAIN_ID,
  chainName: 'Arbitrum One',
  nativeCurrency: {
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: ['https://arb1.arbitrum.io/rpc'],
  blockExplorerUrls: ['https://arbiscan.io'],
};

export function useWallet(): UseWalletReturn {
  const [state, setState] = useState<WalletState>({
    isConnected: false,
    address: null,
    walletType: null,
    chainId: null,
    isConnecting: false,
    error: null,
  });

  const [availableWallets, setAvailableWallets] = useState<AvailableWallets>({
    metamask: false,
    coinbase: false,
  });

  // Detect available wallets
  useEffect(() => {
    const detectWallets = () => {
      if (typeof window === 'undefined') return;

      const ethereum = window.ethereum;
      let hasMetaMask = false;
      let hasCoinbase = false;

      if (ethereum) {
        // Check for multiple providers (when both are installed)
        if (ethereum.providers?.length) {
          hasMetaMask = ethereum.providers.some((p) => p.isMetaMask);
          hasCoinbase = ethereum.providers.some((p) => p.isCoinbaseWallet);
        } else {
          hasMetaMask = !!ethereum.isMetaMask;
          hasCoinbase = !!ethereum.isCoinbaseWallet;
        }
      }

      // Also check for Coinbase Wallet extension specifically
      if (window.coinbaseWalletExtension) {
        hasCoinbase = true;
      }

      setAvailableWallets({
        metamask: hasMetaMask,
        coinbase: hasCoinbase,
      });
    };

    detectWallets();

    // Re-detect after a short delay (some wallets inject later)
    const timeout = setTimeout(detectWallets, 1000);
    return () => clearTimeout(timeout);
  }, []);

  // Get the appropriate provider based on wallet type
  const getProvider = useCallback((walletType?: WalletType): EthereumProvider | null => {
    if (typeof window === 'undefined' || !window.ethereum) return null;

    const ethereum = window.ethereum;

    // If multiple providers exist, find the right one
    if (ethereum.providers?.length) {
      if (walletType === 'metamask') {
        return ethereum.providers.find((p) => p.isMetaMask) || null;
      }
      if (walletType === 'coinbase') {
        return ethereum.providers.find((p) => p.isCoinbaseWallet) || null;
      }
      // Default to first available
      return ethereum.providers[0];
    }

    // Check for Coinbase extension
    if (walletType === 'coinbase' && window.coinbaseWalletExtension) {
      return window.coinbaseWalletExtension;
    }

    return ethereum;
  }, []);

  // Connect to wallet
  const connect = useCallback(async (preferredWallet?: WalletType): Promise<string | null> => {
    setState((prev) => ({ ...prev, isConnecting: true, error: null }));

    try {
      // Determine which wallet to use
      let walletToUse = preferredWallet;

      if (!walletToUse) {
        // Auto-select based on what's available
        if (availableWallets.coinbase && !availableWallets.metamask) {
          walletToUse = 'coinbase';
        } else if (availableWallets.metamask && !availableWallets.coinbase) {
          walletToUse = 'metamask';
        } else if (availableWallets.metamask) {
          // Default to MetaMask if both are available
          walletToUse = 'metamask';
        }
      }

      const provider = getProvider(walletToUse);

      if (!provider) {
        throw new Error('No wallet detected. Please install MetaMask or Coinbase Wallet.');
      }

      // Request account access
      const accounts = (await provider.request({
        method: 'eth_requestAccounts',
      })) as string[];

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found');
      }

      const address = accounts[0];

      // Get chain ID
      const chainId = (await provider.request({
        method: 'eth_chainId',
      })) as string;

      // Determine wallet type
      let detectedWalletType: WalletType = 'unknown';
      if (provider.isMetaMask) {
        detectedWalletType = 'metamask';
      } else if (provider.isCoinbaseWallet) {
        detectedWalletType = 'coinbase';
      }

      setState({
        isConnected: true,
        address,
        walletType: detectedWalletType,
        chainId,
        isConnecting: false,
        error: null,
      });

      // Store connection in localStorage
      localStorage.setItem('wallet_connected', 'true');
      localStorage.setItem('wallet_type', detectedWalletType);

      return address;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect wallet';
      setState((prev) => ({
        ...prev,
        isConnecting: false,
        error: errorMessage,
      }));
      return null;
    }
  }, [availableWallets, getProvider]);

  // Disconnect wallet
  const disconnect = useCallback(() => {
    setState({
      isConnected: false,
      address: null,
      walletType: null,
      chainId: null,
      isConnecting: false,
      error: null,
    });
    localStorage.removeItem('wallet_connected');
    localStorage.removeItem('wallet_type');
  }, []);

  // Switch to Arbitrum network
  const switchToArbitrum = useCallback(async (): Promise<boolean> => {
    const provider = getProvider(state.walletType || undefined);
    if (!provider) return false;

    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: ARBITRUM_CHAIN_ID }],
      });

      setState((prev) => ({ ...prev, chainId: ARBITRUM_CHAIN_ID }));
      return true;
    } catch (switchError: unknown) {
      // Chain not added, try to add it
      if ((switchError as { code?: number })?.code === 4902) {
        try {
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [ARBITRUM_CONFIG],
          });
          setState((prev) => ({ ...prev, chainId: ARBITRUM_CHAIN_ID }));
          return true;
        } catch {
          console.error('Failed to add Arbitrum network');
          return false;
        }
      }
      console.error('Failed to switch to Arbitrum:', switchError);
      return false;
    }
  }, [getProvider, state.walletType]);

  // Listen for account and chain changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) return;

    const provider = getProvider(state.walletType || undefined);
    if (!provider) return;

    const handleAccountsChanged = (accounts: unknown) => {
      const accountsArray = accounts as string[];
      if (accountsArray.length === 0) {
        disconnect();
      } else {
        setState((prev) => ({ ...prev, address: accountsArray[0] }));
      }
    };

    const handleChainChanged = (chainId: unknown) => {
      setState((prev) => ({ ...prev, chainId: chainId as string }));
    };

    provider.on('accountsChanged', handleAccountsChanged);
    provider.on('chainChanged', handleChainChanged);

    return () => {
      provider.removeListener('accountsChanged', handleAccountsChanged);
      provider.removeListener('chainChanged', handleChainChanged);
    };
  }, [disconnect, getProvider, state.walletType]);

  // Auto-reconnect on page load
  useEffect(() => {
    const autoReconnect = async () => {
      const wasConnected = localStorage.getItem('wallet_connected');
      const savedWalletType = localStorage.getItem('wallet_type') as WalletType | null;

      if (wasConnected === 'true' && savedWalletType) {
        const provider = getProvider(savedWalletType);
        if (provider) {
          try {
            const accounts = (await provider.request({
              method: 'eth_accounts',
            })) as string[];

            if (accounts && accounts.length > 0) {
              const chainId = (await provider.request({
                method: 'eth_chainId',
              })) as string;

              setState({
                isConnected: true,
                address: accounts[0],
                walletType: savedWalletType,
                chainId,
                isConnecting: false,
                error: null,
              });
            } else {
              // User disconnected from wallet
              localStorage.removeItem('wallet_connected');
              localStorage.removeItem('wallet_type');
            }
          } catch {
            console.error('Auto-reconnect failed');
          }
        }
      }
    };

    autoReconnect();
  }, [getProvider]);

  // Send USDC to an address
  const sendUSDC = useCallback(async (toAddress: string, amount: string): Promise<{ success: boolean; txHash?: string; error?: string }> => {
    const provider = getProvider(state.walletType || undefined);
    if (!provider) {
      return { success: false, error: 'No wallet connected' };
    }

    if (!state.address) {
      return { success: false, error: 'No account connected' };
    }

    if (state.chainId !== ARBITRUM_CHAIN_ID) {
      return { success: false, error: 'Please switch to Arbitrum network' };
    }

    try {
      // Convert amount to USDC units (6 decimals)
      const amountFloat = parseFloat(amount);
      if (isNaN(amountFloat) || amountFloat <= 0) {
        return { success: false, error: 'Invalid amount' };
      }
      const amountInUnits = BigInt(Math.floor(amountFloat * Math.pow(10, USDC_DECIMALS)));

      // ERC-20 transfer function signature: transfer(address,uint256)
      // Function selector: 0xa9059cbb
      const functionSelector = '0xa9059cbb';

      // Encode the parameters (address padded to 32 bytes, amount padded to 32 bytes)
      const toAddressPadded = toAddress.toLowerCase().replace('0x', '').padStart(64, '0');
      const amountHex = amountInUnits.toString(16).padStart(64, '0');

      const data = functionSelector + toAddressPadded + amountHex;

      // Send the transaction
      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: state.address,
          to: USDC_CONTRACT_ADDRESS,
          data: data,
        }],
      }) as string;

      return { success: true, txHash };
    } catch (error) {
      console.error('Error sending USDC:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to send USDC';
      return { success: false, error: errorMessage };
    }
  }, [getProvider, state.walletType, state.address, state.chainId]);

  return {
    ...state,
    availableWallets,
    connect,
    disconnect,
    switchToArbitrum,
    sendUSDC,
  };
}
