import React, { useState } from 'react';
import { ethers } from 'ethers';
import { Sliders, Lock, Unlock, Plus, X, ShieldAlert, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { useWeb3 } from '../hooks/useWeb3';
import IdentityJSON from '../utils/artifacts/Identity.json';

const AccessControl = () => {
  const { provider, account, deployedAddresses } = useWeb3();
  const [merchants, setMerchants] = useState(['']);
  const [amount, setAmount] = useState('100');
  const [timeRange, setTimeRange] = useState({ start: '8', end: '20' });
  const [cooldown, setCooldown] = useState('3600');
  const [isBlocked, setIsBlocked] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [txResult, setTxResult] = useState(null);
  const [realPreferences, setRealPreferences] = useState(null);

  const [selectedPrefs, setSelectedPrefs] = useState({
    merchants: true,
    times: true,
    cooldown: true
  });

  const addMerchant = () => setMerchants([...merchants, '']);
  const removeMerchant = (index) => setMerchants(merchants.filter((_, i) => i !== index));
  const updateMerchant = (index, val) => {
    const newM = [...merchants];
    newM[index] = val;
    setMerchants(newM);
  };

  const fetchPreferences = async () => {
    if (!deployedAddresses?.Identity || !provider || !account) return;
    try {
      const identity = new ethers.Contract(deployedAddresses.Identity, IdentityJSON.abi, provider);
      const prefs = await identity.getRecipientPreferences(account);
      // prefs is a Struct/Result: { approvedMerchants, approvedAmount, startTime, endTime, timeLimit, isBlocked }
      setRealPreferences(prefs);
      
      // Update local blocked state to match on-chain
      setIsBlocked(prefs.isBlocked);
    } catch (err) {
      console.error('Error fetching prefs:', err);
    }
  };

  React.useEffect(() => {
    fetchPreferences();
  }, [account, deployedAddresses]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!deployedAddresses?.Identity || !provider) return;

    setIsUpdating(true);
    setTxResult(null);
    try {
      const signer = await provider.getSigner();
      const identity = new ethers.Contract(deployedAddresses.Identity, IdentityJSON.abi, signer);

      const which = [
        selectedPrefs.merchants,
        selectedPrefs.times,
        selectedPrefs.cooldown
      ];

      const tx = await identity.setPreferences(
        which,
        merchants.filter(m => ethers.isAddress(m)),
        ethers.parseUnits(amount, 18),
        BigInt(timeRange.start),
        BigInt(timeRange.end),
        BigInt(cooldown)
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          const parsed = identity.interface.parseLog(log);
          return parsed.name === 'PreferencesUpdated';
        } catch (e) { return false; }
      });

      setTxResult({
        hash: receipt.hash,
        event: event ? identity.interface.parseLog(event) : null
      });
      fetchPreferences();
    } catch (err) {
      console.error(err);
      alert(err.reason || err.message);
    }
    setIsUpdating(false);
  };

  const toggleBlock = async () => {
    if (!deployedAddresses?.Identity || !provider) return;
    const newStatus = !isBlocked;

    setIsUpdating(true);
    try {
      const signer = await provider.getSigner();
      const identity = new ethers.Contract(deployedAddresses.Identity, IdentityJSON.abi, signer);

      const tx = await identity.setBlocked(newStatus);
      const receipt = await tx.wait();

      setIsBlocked(newStatus);
      setTxResult({
        hash: receipt.hash,
        type: 'block',
        status: newStatus
      });
      fetchPreferences();
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
    setIsUpdating(false);
  };

  return (
    <div className="animate-fade-in">
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Access Control</h1>
        <p style={{ color: 'var(--text-dim)' }}>Define your personal security rules to prevent fraudulent transactions.</p>
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

      <div className="grid" style={{ gridTemplateColumns: '1.5fr 1fr' }}>
        <div className="card glass">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
            <Sliders size={24} color="var(--primary)" />
            <h2 style={{ fontSize: '1.5rem' }}>Preferences</h2>
          </div>

          <form onSubmit={handleUpdate}>
            {/* Category 1: Merchants & Amount */}
            <div className="input-group" style={{
              padding: '24px',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '16px',
              border: selectedPrefs.merchants ? '1px solid var(--primary)' : '1px solid transparent',
              marginBottom: '24px',
              transition: 'all 0.3s ease'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h4 style={{ margin: 0, fontSize: '1.1rem' }}>Add New Merchants & Set Limits</h4>
                <input
                  type="checkbox"
                  checked={selectedPrefs.merchants}
                  onChange={e => setSelectedPrefs({ ...selectedPrefs, merchants: e.target.checked })}
                  style={{
                    width: '24px',
                    height: '24px',
                    cursor: 'pointer',
                    accentColor: 'var(--primary)'
                  }}
                />
              </div>

              <div style={{ opacity: selectedPrefs.merchants ? 1 : 0.3, pointerEvents: selectedPrefs.merchants ? 'all' : 'none', transition: 'opacity 0.3s ease' }}>
                <label className="label">Allowed Merchant Addresses</label>
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

                <button
                  type="button"
                  className="btn"
                  onClick={addMerchant}
                  style={{
                    fontSize: '0.75rem',
                    padding: '8px 16px',
                    marginTop: '8px',
                    background: '#FBBF24',
                    color: '#1E293B',
                    fontWeight: '700'
                  }}
                >
                  <Plus size={16} /> Add Merchant Address
                </button>

                <div className="input-group" style={{ marginTop: '20px' }}>
                  <label className="label">Max Amount per Swipe (USDC)</label>
                  <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Category 2: Active Windows */}
            <div className="input-group" style={{
              padding: '24px',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '16px',
              border: selectedPrefs.times ? '1px solid var(--primary)' : '1px solid transparent',
              marginBottom: '24px',
              transition: 'all 0.3s ease'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h4 style={{ margin: 0, fontSize: '1.1rem' }}>Set Time Window</h4>
                <input
                  type="checkbox"
                  checked={selectedPrefs.times}
                  onChange={e => setSelectedPrefs({ ...selectedPrefs, times: e.target.checked })}
                  style={{
                    width: '24px',
                    height: '24px',
                    cursor: 'pointer',
                    accentColor: 'var(--primary)'
                  }}
                />
              </div>

              <div style={{ opacity: selectedPrefs.times ? 1 : 0.3, pointerEvents: selectedPrefs.times ? 'all' : 'none', transition: 'opacity 0.3s ease' }}>
                <label className="label">Daily Active Window (Hours 0-23)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input type="number" placeholder="Start Hour" value={timeRange.start} onChange={(e) => setTimeRange({ ...timeRange, start: e.target.value })} />
                  <span style={{ color: 'var(--text-dim)' }}>to</span>
                  <input type="number" placeholder="End Hour" value={timeRange.end} onChange={(e) => setTimeRange({ ...timeRange, end: e.target.value })} />
                </div>
              </div>
            </div>

            {/* Category 3: Cooldown/Limit */}
            <div className="input-group" style={{
              padding: '24px',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '16px',
              border: selectedPrefs.cooldown ? '1px solid var(--primary)' : '1px solid transparent',
              marginBottom: '24px',
              transition: 'all 0.3s ease'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h4 style={{ margin: 0, fontSize: '1.1rem' }}>Amount of Swipes per Day</h4>
                <input
                  type="checkbox"
                  checked={selectedPrefs.cooldown}
                  onChange={e => setSelectedPrefs({ ...selectedPrefs, cooldown: e.target.checked })}
                  style={{
                    width: '24px',
                    height: '24px',
                    cursor: 'pointer',
                    accentColor: 'var(--primary)'
                  }}
                />
              </div>

              <div style={{ opacity: selectedPrefs.cooldown ? 1 : 0.3, pointerEvents: selectedPrefs.cooldown ? 'all' : 'none', transition: 'opacity 0.3s ease' }}>
                <label className="label">Swipe Count / Time Limit (Seconds)</label>
                <input type="number" placeholder="e.g. 3600" value={cooldown} onChange={(e) => setCooldown(e.target.value)} />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '8px' }}>
                  Defines the minimum gap required between consecutive transactions.
                </p>
              </div>
            </div>

            <button className="btn btn-primary" style={{ width: '100%', marginTop: '12px', padding: '16px' }} disabled={isUpdating}>
              {isUpdating ? 'Executing Transaction...' : 'Update Selected Preferences'}
            </button>
          </form>

          {txResult && (
            <div className="animate-fade-in" style={{
              marginTop: '24px',
              padding: '20px',
              borderRadius: '12px',
              background: 'rgba(16, 185, 129, 0.05)',
              border: '1px solid var(--success)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success)', fontWeight: '700', marginBottom: '12px' }}>
                <CheckCircle2 size={18} />
                Transaction Complete
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                  <span style={{ color: 'var(--text-dim)' }}>Hash:</span>
                  <span style={{ fontFamily: 'monospace' }}>{txResult.hash.substring(0, 20)}...</span>
                </div>
                {txResult.event && (
                  <div style={{ borderTop: '1px solid rgba(16, 185, 129, 0.2)', paddingTop: '8px', marginTop: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--success)', marginBottom: '4px' }}>
                      <Info size={12} /> Emitted Event: {txResult.event.name}
                    </div>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                      Preferences successfully committed to identity registry.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card glass" style={{ borderColor: isBlocked ? 'var(--danger)' : 'var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Lock size={20} color={isBlocked ? 'var(--danger)' : 'var(--text-dim)'} />
                <h3 style={{ fontSize: '1.25rem' }}>Panic Block</h3>
              </div>
              <div className={`badge ${isBlocked ? 'badge-danger' : 'badge-success'}`}>
                {isBlocked ? 'Blocked' : 'Active'}
              </div>
            </div>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.875rem', marginBottom: '24px' }}>
              Instantly disable all transactions. This toggles the <code>isBlocked</code> state on your identity contract.
            </p>
            <button
              className="btn"
              onClick={toggleBlock}
              disabled={isUpdating}
              style={{
                width: '100%',
                backgroundColor: isBlocked ? 'var(--success)' : 'rgba(239, 68, 68, 0.1)',
                color: isBlocked ? 'white' : 'var(--danger)',
                border: isBlocked ? 'none' : '1px solid var(--danger)'
              }}
            >
              {isBlocked ? <Unlock size={18} /> : <Lock size={18} />}
              {isBlocked ? 'Disable Panic Block' : 'Activate Panic Block'}
            </button>
          </div>

          <div className="card glass" style={{ background: 'rgba(93, 183, 255, 0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <ShieldAlert size={20} color="var(--primary)" />
              <h3 style={{ fontSize: '1.1rem' }}>Preference Status</h3>
            </div>
            
            {realPreferences && realPreferences.approvedAmount > 0 ? (
              <div style={{ fontSize: '0.875rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-dim)' }}>Swipe Limit:</span>
                    <span style={{ color: 'white' }}>${ethers.formatUnits(realPreferences.approvedAmount, 18)} USDC</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-dim)' }}>Time Window:</span>
                    <span style={{ color: 'white' }}>{realPreferences.startTime.toString()}:00 - {realPreferences.endTime.toString()}:00</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-dim)' }}>Whitelisted:</span>
                    <span style={{ color: 'white' }}>{realPreferences.approvedMerchants.length} Merchants</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-dim)' }}>Cooldown:</span>
                    <span style={{ color: 'white' }}>{realPreferences.timeLimit.toString()} Sec</span>
                  </div>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: '0.875rem', color: 'var(--text-dim)', lineHeight: '1.5', fontStyle: 'italic' }}>
                When preferences are set, the active settings will be displayed here.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccessControl;
