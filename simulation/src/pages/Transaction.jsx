import React, { useState } from 'react';
import { CreditCard, Store, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

const Transaction = () => {
  const [recipient, setRecipient] = useState('');
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [txDetails, setTxDetails] = useState(null);

  const simulateSwipe = async (e) => {
    e.preventDefault();
    setStatus('loading');

    // Simulate contract interaction and access control check
    setTimeout(() => {
      // For simulation: if amount > 1000, fail (mock preference)
      if (amount > 1000) {
        setStatus('error');
        setTxDetails('Transaction Rejected: Amount exceeds recipient daily limit ($1,000)');
      } else {
        setStatus('success');
        setTxDetails({
          hash: '0x' + Math.random().toString(16).substring(2, 42),
          time: new Date().toLocaleTimeString(),
        });
      }
    }, 2000);
  };

  return (
    <div className="animate-fade-in">
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Payment Simulation</h1>
        <p style={{ color: 'var(--text-dim)' }}>Simulate a retail transaction to test the SNAP Trust layer protection.</p>
      </header>

      <div className="grid">
        <div className="card glass">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
            <CreditCard size={24} color="var(--primary)" />
            <h2 style={{ fontSize: '1.5rem' }}>POS Terminal</h2>
          </div>

          <form onSubmit={simulateSwipe}>
            <div className="input-group">
              <label className="label">Merchant Identity (External ID or Wallet)</label>
              <div style={{ position: 'relative' }}>
                <Store size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                <input 
                  style={{ paddingLeft: '48px' }} 
                  placeholder="e.g. Walmart POS-442" 
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <label className="label">Recipient Wallet</label>
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

            <button className="btn btn-primary" style={{ width: '100%', padding: '16px' }} disabled={status === 'loading'}>
              {status === 'loading' ? (
                <>
                  <Loader2 className="animate-spin" size={18} /> Verifying Preferences...
                </>
              ) : 'Swipe Card'}
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
                <p><strong>Hash:</strong> <span style={{ fontFamily: 'monospace' }}>{txDetails.hash}</span></p>
                <p><strong>Timestamp:</strong> {txDetails.time}</p>
                <p><strong>Reserve Logged:</strong> Approved by Usage Policy</p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="card glass animate-fade-in" style={{ borderColor: 'var(--danger)', background: 'rgba(239, 68, 68, 0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--danger)', marginBottom: '16px' }}>
                <AlertTriangle size={24} />
                <h3 style={{ fontSize: '1.25rem' }}>Transaction Blocked</h3>
              </div>
              <p style={{ color: 'var(--text)', fontSize: '0.95rem', marginBottom: '12px' }}>{txDetails}</p>
              <p style={{ color: 'var(--text-dim)', fontSize: '0.875rem' }}>
                The trust layer prevented this transaction because it violated one or more security preferences.
              </p>
            </div>
          )}

          {status === 'idle' && (
            <div className="card glass" style={{ borderStyle: 'dashed', opacity: 0.6 }}>
              <p style={{ textAlign: 'center', color: 'var(--text-dim)' }}>
                Waiting for payment interaction...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Transaction;
