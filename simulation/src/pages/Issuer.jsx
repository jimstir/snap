import React, { useState } from 'react';
import { ethers } from 'ethers';
import { Shield, Rocket, CheckCircle2, Loader2, AlertTriangle, FileCode } from 'lucide-react';
import { useWeb3 } from '../hooks/useWeb3';

// Artifacts
import IdentityJSON from '../utils/artifacts/Identity.json';
import SnapReserveJSON from '../utils/artifacts/SnapReserve.json';
import SnapTokenJSON from '../utils/artifacts/SnapToken.json';
import UsageJSON from '../utils/artifacts/Usage.json';

const Issuer = () => {
  const { provider, account, deployedAddresses, setDeployedAddresses } = useWeb3();
  const [status, setStatus] = useState('idle'); // idle, deploying, success, error
  const [activeTab, setActiveTab] = useState('deploy');
  const [currentStep, setCurrentStep] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  const steps = [
    { name: 'SnapToken', factory: SnapTokenJSON },
    { name: 'SnapReserve', factory: SnapReserveJSON },
    { name: 'Identity', factory: IdentityJSON },
    { name: 'Usage', factory: UsageJSON }
  ];

  const deployAll = async () => {
    if (!provider || !account) {
      alert('Please connect your wallet first');
      return;
    }

    setStatus('deploying');
    setErrorMsg('');
    const signer = await provider.getSigner();
    const addrs = {};

    try {
      // 1. Deploy SnapToken
      setCurrentStep(0);
      const SnapTokenFactory = new ethers.ContractFactory(
        SnapTokenJSON.abi,
        SnapTokenJSON.bytecode,
        signer
      );
      const snapToken = await SnapTokenFactory.deploy(ethers.parseEther("1000000"));
      await snapToken.waitForDeployment();
      addrs.SnapToken = await snapToken.getAddress();

      // 2. Deploy SnapReserve
      setCurrentStep(1);
      const SnapReserveFactory = new ethers.ContractFactory(
        SnapReserveJSON.abi,
        SnapReserveJSON.bytecode,
        signer
      );
      const snapReserve = await SnapReserveFactory.deploy(addrs.SnapToken, "SnapReserve", "SNAPR");
      await snapReserve.waitForDeployment();
      addrs.SnapReserve = await snapReserve.getAddress();

      // 3. Deploy Identity
      setCurrentStep(2);
      const IdentityFactory = new ethers.ContractFactory(
        IdentityJSON.abi,
        IdentityJSON.bytecode,
        signer
      );
      const identity = await IdentityFactory.deploy(account, addrs.SnapReserve);
      await identity.waitForDeployment();
      addrs.Identity = await identity.getAddress();

      // 4. Deploy Usage
      setCurrentStep(3);
      const UsageFactory = new ethers.ContractFactory(
        UsageJSON.abi,
        UsageJSON.bytecode,
        signer
      );
      const usage = await UsageFactory.deploy(addrs.Identity, addrs.SnapReserve, account, addrs.SnapToken);
      await usage.waitForDeployment();
      addrs.Usage = await usage.getAddress();

      setDeployedAddresses(addrs);
      setStatus('success');
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message);
      setStatus('error');
    }
  };

  return (
    <div className="animate-fade-in">
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Issuer Hub</h1>
        <p style={{ color: 'var(--text-dim)' }}>Administrative control center for the SNAP Trust Layer.</p>
      </header>

      <div style={{ display: 'flex', gap: '20px', marginBottom: '32px', borderBottom: '1px solid var(--border)' }}>
        <button 
          onClick={() => setActiveTab('deploy')}
          style={{ 
            padding: '12px 24px', 
            background: 'none', 
            border: 'none', 
            color: activeTab === 'deploy' ? 'var(--primary)' : 'var(--text-dim)',
            borderBottom: activeTab === 'deploy' ? '2px solid var(--primary)' : '2px solid transparent',
            cursor: 'pointer',
            fontWeight: '600',
            transition: 'all 0.2s'
          }}
        >
          Deploy Reserve
        </button>
        <button 
          style={{ 
            padding: '12px 24px', 
            background: 'none', 
            border: 'none', 
            color: 'rgba(255,255,255,0.2)',
            cursor: 'not-allowed',
            fontWeight: '600'
          }}
          disabled
        >
          System Configuration (Coming Soon)
        </button>
      </div>

      <div className="grid">
        <div className="card glass">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
            <Rocket size={24} color="var(--primary)" />
            <h2 style={{ fontSize: '1.5rem' }}>Infrastructure Deployment</h2>
          </div>

          <p style={{ color: 'var(--text-dim)', marginBottom: '32px', fontSize: '0.95rem', lineHeight: '1.6' }}>
            Initialize the entire trust layer ecosystem. This will deploy the Token, Reserve, Identity, and Usage contracts as an integrated system.
          </p>

          {status === 'idle' && (
            <button className="btn btn-primary" style={{ width: '100%', padding: '16px' }} onClick={deployAll}>
              <Rocket size={18} /> Initialize System Deployment
            </button>
          )}

          {status === 'deploying' && (
            <div style={{ padding: '24px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)' }}>
              {steps.map((step, index) => (
                <div key={index} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px', 
                  marginBottom: '16px',
                  opacity: index === currentStep ? 1 : index < currentStep ? 0.6 : 0.3
                }}>
                  {index < currentStep ? (
                    <CheckCircle2 size={20} color="var(--success)" />
                  ) : index === currentStep ? (
                    <Loader2 size={20} className="animate-spin" color="var(--primary)" />
                  ) : (
                    <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--text-dim)' }} />
                  )}
                  <span style={{ fontWeight: index === currentStep ? '600' : '400' }}>
                    Deploying {step.name}...
                  </span>
                </div>
              ))}
            </div>
          )}

          {status === 'success' && (
            <div className="animate-fade-in">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--success)', marginBottom: '24px' }}>
                <CheckCircle2 size={24} />
                <h3 style={{ fontSize: '1.25rem' }}>System Deployed</h3>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {Object.entries(deployedAddresses).map(([name, addr]) => (
                  <div key={name} style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '4px' }}>{name}</div>
                    <div style={{ fontFamily: 'monospace', fontSize: '0.875rem', wordBreak: 'break-all' }}>{addr}</div>
                  </div>
                ))}
              </div>

              <button className="btn glass" style={{ width: '100%', marginTop: '24px' }} onClick={() => setStatus('idle')}>
                Deploy New Instance
              </button>
            </div>
          )}

          {status === 'error' && (
            <div className="card" style={{ borderColor: 'var(--danger)', background: 'rgba(239,68,68,0.05)', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--danger)', marginBottom: '12px' }}>
                <AlertTriangle size={24} />
                <h3 style={{ fontSize: '1.1rem' }}>Deployment Failed</h3>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-dim)', marginBottom: '16px' }}>{errorMsg}</p>
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={deployAll}>
                Retry Deployment
              </button>
            </div>
          )}
        </div>

        <div className="card glass" style={{ height: 'fit-content' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <FileCode size={24} color="var(--primary)" />
            <h3 style={{ fontSize: '1.25rem' }}>System Integrity</h3>
          </div>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', lineHeight: '1.6' }}>
            The deployment flow ensures that all contracts are properly cross-referenced:
          </p>
          <ul style={{ paddingLeft: '20px', color: 'var(--text-dim)', fontSize: '0.875rem', lineHeight: '1.8', marginTop: '12px' }}>
            <li>SnapToken is the base reserve asset.</li>
            <li>SnapReserve manages asset liquidity.</li>
            <li>Identity contract handles role gating and preferences.</li>
            <li>Usage contract orchestrates transactions between all layers.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Issuer;
