import React, { useState } from 'react';
import { Sliders, Lock, Unlock, Plus, X, ShieldAlert } from 'lucide-react';

const AccessControl = () => {
  const [merchants, setMerchants] = useState(['']);
  const [amount, setAmount] = useState('100');
  const [timeRange, setTimeRange] = useState({ start: '8', end: '20' });
  const [cooldown, setCooldown] = useState('3600');
  const [isBlocked, setIsBlocked] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const addMerchant = () => setMerchants([...merchants, '']);
  const removeMerchant = (index) => setMerchants(merchants.filter((_, i) => i !== index));
  const updateMerchant = (index, val) => {
    const newM = [...merchants];
    newM[index] = val;
    setMerchants(newM);
  };

  const handleUpdate = (e) => {
    e.preventDefault();
    setIsUpdating(true);
    setTimeout(() => setIsUpdating(false), 1500);
  };

  const toggleBlock = () => {
    setIsBlocked(!isBlocked);
  };

  return (
    <div className="animate-fade-in">
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Access Control</h1>
        <p style={{ color: 'var(--text-dim)' }}>Define your personal security rules to prevent fraudulent transactions.</p>
      </header>

      <div className="grid" style={{ gridTemplateColumns: '1.5fr 1fr' }}>
        <div className="card glass">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
            <Sliders size={24} color="var(--primary)" />
            <h2 style={{ fontSize: '1.5rem' }}>Preferences</h2>
          </div>

          <form onSubmit={handleUpdate}>
            <div className="input-group">
              <label className="label">Approved Merchants (Addresses)</label>
              {merchants.map((m, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input 
                    placeholder="0x..." 
                    value={m}
                    onChange={(e) => updateMerchant(i, e.target.value)}
                  />
                  {merchants.length > 1 && (
                    <button type="button" onClick={() => removeMerchant(i)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>
                      <X size={20} />
                    </button>
                  )}
                </div>
              ))}
              <button type="button" className="btn glass" onClick={addMerchant} style={{ fontSize: '0.875rem', padding: '8px 16px', marginTop: '8px' }}>
                <Plus size={16} /> Add Merchant
              </button>
            </div>

            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div className="input-group">
                <label className="label">Max Amount per Swipe (USDC)</label>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div className="input-group">
                <label className="label">Cooldown (Seconds)</label>
                <input type="number" value={cooldown} onChange={(e) => setCooldown(e.target.value)} />
              </div>
            </div>

            <div className="input-group">
              <label className="label">Daily Active Window (Hours 0-23)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input type="number" placeholder="Start" value={timeRange.start} onChange={(e) => setTimeRange({...timeRange, start: e.target.value})} />
                <span style={{ color: 'var(--text-dim)' }}>to</span>
                <input type="number" placeholder="End" value={timeRange.end} onChange={(e) => setTimeRange({...timeRange, end: e.target.value})} />
              </div>
            </div>

            <button className="btn btn-primary" style={{ width: '100%', marginTop: '12px' }} disabled={isUpdating}>
              {isUpdating ? 'Saving...' : 'Update Preferences'}
            </button>
          </form>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card glass" style={{ borderColor: isBlocked ? 'var(--danger)' : 'var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Lock size={20} color={isBlocked ? 'var(--danger)' : 'var(--text-dim)'} />
                <h3 style={{ fontSize: '1.25rem' }}>Block Account</h3>
              </div>
              <div className={`badge ${isBlocked ? 'badge-danger' : 'badge-success'}`}>
                {isBlocked ? 'Blocked' : 'Active'}
              </div>
            </div>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.875rem', marginBottom: '24px' }}>
              Instantly disable all transactions from this wallet. Recommended if you suspect your card info is stolen.
            </p>
            <button 
              className={`btn ${isBlocked ? 'btn-primary' : 'glass'}`} 
              onClick={toggleBlock}
              style={{ width: '100%', backgroundColor: isBlocked ? 'var(--success)' : 'rgba(239, 68, 68, 0.1)', color: isBlocked ? 'white' : 'var(--danger)' }}
            >
              {isBlocked ? <Unlock size={18} /> : <Lock size={18} />}
              {isBlocked ? 'Unblock Account' : 'Block Account Now'}
            </button>
          </div>

          <div className="card glass" style={{ background: 'rgba(93, 183, 255, 0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <ShieldAlert size={20} color="var(--primary)" />
              <h3 style={{ fontSize: '1.1rem' }}>Protection Status</h3>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-dim)', lineHeight: '1.5' }}>
              Your account is currently protected by <strong>{merchants.filter(m => m !== '').length}</strong> whitelisted merchants and a <strong>${amount}</strong> swipe limit.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccessControl;
