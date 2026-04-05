import { useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';

const ARC_CHAIN_ID = '0x4ce942'; // Hex for 5042002
const ARC_NETWORK_CONFIG = {
  chainId: ARC_CHAIN_ID,
  chainName: 'Arc Testnet',
  nativeCurrency: {
    name: 'USDC',
    symbol: 'USDC',
    decimals: 18,
  },
  rpcUrls: ['https://rpc.testnet.arc.network'],
  blockExplorerUrls: ['https://testnet.arcscan.app'],
};

export const useWeb3 = () => {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [error, setError] = useState(null);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      setError('MetaMask is not installed');
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      const network = await provider.getNetwork();

      setAccount(accounts[0]);
      setProvider(provider);
      setChainId(network.chainId);

      // Check if on Arc Testnet
      if (network.chainId !== BigInt(5042002)) {
        await switchNetwork();
      }
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const switchNetwork = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: ARC_CHAIN_ID }],
      });
    } catch (err) {
      if (err.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [ARC_NETWORK_CONFIG],
        });
      } else {
        setError('Failed to switch network');
      }
    }
  };

  useEffect(() => {
    if (window.ethereum) {
      const handleAccounts = (accounts) => setAccount(accounts[0] || null);
      const handleChain = (hexId) => setChainId(BigInt(hexId));
      
      window.ethereum.on('accountsChanged', handleAccounts);
      window.ethereum.on('chainChanged', handleChain);
      
      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccounts);
        window.ethereum.removeListener('chainChanged', handleChain);
      };
    }
  }, []);

  return { account, provider, chainId, error, connect };
};
