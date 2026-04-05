import React, { useState } from 'react';
import { UserPlus, Store, CheckCircle2 } from 'lucide-react';

const Registration = () => {
  const [role, setRole] = useState('recipient');
  const [value, setValue] = useState('');
  const [proof, setProof] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txHash, setTxHash] = useState(null);

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate transaction
    setTimeout(() => {
      setTxHash('0x' + Math.random().toString(16).substring(2, 42));
      setIsSubmitting(false);
    }, 2000);
  };

  return (
    <div className="animate-fade-in">
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Identity Registration</h1>
        <p style={{ color: 'var(--text-dim)' }}>Register your wallet as a recipient or merchant on the SNAP Trust layer.</p>
      </header>

      <div className="grid">
        <div className="card glass">
          <div style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
            <button 
              className={`btn ${role === 'recipient' ? 'btn-primary' : 'glass'}`}
              onClick={() => setRole('recipient')}
              style={{ flex: 1 }}
            >
              <UserPlus size={18} /> Recipient
            </button>
            <button 
              className={`btn ${role === 'merchant' ? 'btn-primary' : 'glass'}`}
              onClick={() => setRole('merchant')}
              style={{ flex: 1 }}
            >
              <Store size={18} /> Merchant
            </button>
          </div>

          <form onSubmit={handleRegister}>
            <div className="input-group">
              <label className="label">Approved Value (USDC)</label>
              <input 
                type="number" 
                placeholder="e.g. 500" 
                value={value}
                onChange={(e) => setValue(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label className="label">Merkle Proof (JSON array)</label>
              <input 
                type="text" 
                placeholder='["0xabc...", "0xdef..."]' 
                value={proof}
                onChange={(e) => setProof(e.target.value)}
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '8px' }}>
                Note: Recipient registration requires a valid proof from the USDA system.
              </p>
            </div>

            <button className="btn btn-primary" style={{ width: '100%' }} disabled={isSubmitting}>
              {isSubmitting ? 'Processing...' : `Register as ${role.charAt(0).toUpperCase() + role.slice(1)}`}
            </button>
          </form>

          {txHash && (
            <div className="animate-fade-in" style={{ marginTop: '24px', padding: '16px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--success)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success)', fontWeight: '600' }}>
                <CheckCircle2 size={18} />
                Registration Successful
              </div>
              <p style={{ fontSize: '0.75rem', marginTop: '4px', wordBreak: 'break-all', color: 'var(--text-dim)' }}>
                TX: {txHash}
              </p>
            </div>
          )}
        </div>

        <div className="card glass" style={{ height: 'fit-content' }}>
          <h3 style={{ marginBottom: '16px' }}>Why Register?</h3>
          <ul style={{ color: 'var(--text-dim)', paddingLeft: '20px', lineHeight: '1.6' }}>
            <li>Verify your identity on-chain for SNAP benefits.</li>
            <li>Enable recipient-defined security preferences.</li>
            <li>Prevent card skimming by whitelisting merchants.</li>
            <li>Securely migrate your account to new wallets.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Registration;
