import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';

const Web3Context = createContext();

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

export const Web3Provider = ({ children }) => {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [error, setError] = useState(null);
  const [deployedAddresses, setDeployedAddressesState] = useState(() => {
    const saved = localStorage.getItem('snap_contracts');
    return saved ? JSON.parse(saved) : null;
  });

  const setDeployedAddresses = (addresses) => {
    setDeployedAddressesState(addresses);
    localStorage.setItem('snap_contracts', JSON.stringify(addresses));
  };

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
      const init = async () => {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const network = await provider.getNetwork();
          setAccount(accounts[0]);
          setProvider(provider);
          setChainId(network.chainId);
        }
      };
      init();

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

  return (
    <Web3Context.Provider value={{ account, provider, chainId, error, connect, deployedAddresses, setDeployedAddresses }}>
      {children}
    </Web3Context.Provider>
  );
};

export const useWeb3 = () => useContext(Web3Context);
