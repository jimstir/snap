import React, { useState } from 'react';
import { ethers } from 'ethers';
import { CreditCard, Store, CheckCircle2, AlertTriangle, Loader2, Info } from 'lucide-react';
import { useWeb3 } from '../hooks/useWeb3';
import UsageJSON from '../utils/artifacts/Usage.json';

const Transaction = () => {
  const { provider, deployedAddresses } = useWeb3();
  const [recipient, setRecipient] = useState('');
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [txDetails, setTxDetails] = useState(null);

  const handleSwipe = async (e) => {
    e.preventDefault();
    if (!deployedAddresses?.Usage || !provider) return;

    setStatus('loading');
    setTxDetails(null);

    try {
      const signer = await provider.getSigner();
      const usage = new ethers.Contract(deployedAddresses.Usage, UsageJSON.abi, signer);

      // Call Usage.pay(recipient, merchant, amount)
      // Note: amount is in 18 decimals (USDC simulation)
      const tx = await usage.pay(
        recipient,
        merchant,
        ethers.parseUnits(amount, 18)
      );

      const receipt = await tx.wait();
      
      // Parse logs for events
      const logs = receipt.logs.map(log => {
        try {
          return usage.interface.parseLog(log);
        } catch (e) { return null; }
      }).filter(Boolean);

      setStatus('success');
      setTxDetails({
        hash: receipt.hash,
        time: new Date().toLocaleTimeString(),
        events: logs
      });
    } catch (err) {
      console.error(err);
      setStatus('error');
      setTxDetails(err.reason || err.message || 'Transaction failed');
    }
  };

  return (
    <div className="animate-fade-in">
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Payment Simulation</h1>
        <p style={{ color: 'var(--text-dim)' }}>Simulate a retail transaction to test the SNAP Trust layer protection.</p>
      </header>

      {!deployedAddresses && (
        <div className="card glass animate-fade-in" style={{ borderColor: 'var(--danger)', background: 'rgba(239,68,68,0.05)', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--danger)' }}>
            <AlertTriangle size={24} />
            <div>
              <h3 style={{ fontSize: '1.1rem' }}>Infrastructure Not Detected</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                The core contracts are not yet deployed. Please go to the <strong>Issuer</strong> tab to deploy the reserve system first.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid">
        <div className="card glass">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
            <CreditCard size={24} color="var(--primary)" />
            <h2 style={{ fontSize: '1.5rem' }}>POS Terminal</h2>
          </div>

          <form onSubmit={handleSwipe}>
            <div className="input-group">
              <label className="label">Merchant Wallet Address</label>
              <div style={{ position: 'relative' }}>
                <Store size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                <input 
                  style={{ paddingLeft: '48px' }} 
                  placeholder="0x..." 
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <label className="label">Recipient Wallet Address</label>
              <input 
                placeholder="0x..." 
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label className="label">Transaction Amount (USDC)</label>
              <input 
                type="number" 
                placeholder="0.00" 
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <button className="btn btn-primary" style={{ width: '100%', padding: '16px' }} disabled={status === 'loading' || !deployedAddresses}>
              {status === 'loading' ? (
                <>
                  <Loader2 className="animate-spin" size={18} /> Validating & Processing...
                </>
              ) : 'Swipe Card (Issuer Call)'}
            </button>
          </form>
        </div>

        <div>
          {status === 'success' && (
            <div className="card glass animate-fade-in" style={{ borderColor: 'var(--success)', background: 'rgba(16, 185, 129, 0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--success)', marginBottom: '16px' }}>
                <CheckCircle2 size={24} />
                <h3 style={{ fontSize: '1.25rem' }}>Transaction Approved</h3>
              </div>
              <div style={{ color: 'var(--text-dim)', fontSize: '0.875rem', lineHeight: '1.8' }}>
                <p><strong>Status:</strong> Confirmed on Arc Testnet</p>
                <p><strong>Hash:</strong> <span style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{txDetails.hash}</span></p>
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(16, 185, 129, 0.2)' }}>
                  <h4 style={{ color: 'var(--success)', marginBottom: '8px' }}>Events Emitted:</h4>
                  {txDetails.events.map((ev, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px', background: 'rgba(16, 185, 129, 0.1)', padding: '8px', borderRadius: '8px' }}>
                      <Info size={14} style={{ marginTop: '3px' }} />
                      <div>
                        <div style={{ fontWeight: '600', color: 'white' }}>{ev.name}</div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                          Recipient notified and reserve record committed.
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="card glass animate-fade-in" style={{ borderColor: 'var(--danger)', background: 'rgba(239, 68, 68, 0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--danger)', marginBottom: '16px' }}>
                <AlertTriangle size={24} />
                <h3 style={{ fontSize: '1.25rem' }}>Transaction Reverted</h3>
              </div>
              <p style={{ color: 'var(--text)', fontSize: '0.95rem', marginBottom: '12px' }}>{txDetails}</p>
              <p style={{ color: 'var(--text-dim)', fontSize: '0.875rem' }}>
                The trust layer refused to process this transaction. Common reasons include whitelisting failure, daily limit exceedance, or insufficient reserve balance.
              </p>
            </div>
          )}

          {status === 'idle' && (
            <div className="card glass" style={{ borderStyle: 'dashed', opacity: 0.6 }}>
              <p style={{ textAlign: 'center', color: 'var(--text-dim)' }}>
                Waiting for POS interaction...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Transaction;
