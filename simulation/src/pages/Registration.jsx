import React, { useState } from 'react';
import { UserPlus, Store, CheckCircle2, AlertTriangle, FileText, Copy, Check } from 'lucide-react';
import { useWeb3 } from '../hooks/useWeb3';
import { ethers } from 'ethers';
import { MerkleTree } from 'merkletreejs';
import keccak256 from 'keccak256';
import { Buffer } from 'buffer';

const SIMULATION_ISSUER_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

const Registration = () => {
  const { account, deployedAddresses } = useWeb3();
  const [role, setRole] = useState('recipient');
  const [value, setValue] = useState('');
  const [proof, setProof] = useState('');
  const [signature, setSignature] = useState('');
  const [externalId, setExternalId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txHash, setTxHash] = useState(null);

  // Application logic
  const [applicationData, setApplicationData] = useState(null);
  const [isApplying, setIsApplying] = useState(false);
  const [copied, setCopied] = useState(false);

  const applyAsRecipient = async () => {
    if (!account) return alert('Connect wallet first');
    setIsApplying(true);

    try {
      const approvedValue = "1000000000000000000000"; // 1000 USDC
      // Leaf: keccak256(abi.encodePacked(msg.sender, value))
      const leaf = ethers.solidityPackedKeccak256(["address", "uint256"], [account, approvedValue]);

      // Simulation: Create a tree with a few other random addresses + the user
      const otherLeaves = [
        ethers.solidityPackedKeccak256(["address", "uint256"], [ethers.Wallet.createRandom().address, "500"]),
        ethers.solidityPackedKeccak256(["address", "uint256"], [ethers.Wallet.createRandom().address, "2000"])
      ];

      const leaves = [...otherLeaves, leaf].map(l => Buffer.from(l.slice(2), 'hex'));
      const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
      const proof = tree.getHexProof(Buffer.from(leaf.slice(2), 'hex'));

      setApplicationData({
        type: 'recipient',
        proof: JSON.stringify(proof),
        value: "1000", // Human readable
        rawValue: approvedValue,
        root: tree.getHexRoot()
      });
    } catch (err) {
      console.error(err);
    }
    setIsApplying(false);
  };

  const applyAsMerchant = async () => {
    if (!account) return alert('Connect wallet first');
    if (!deployedAddresses?.Identity) return alert('Deploy contracts first');
    setIsApplying(true);

    try {
      const issuer = new ethers.Wallet(SIMULATION_ISSUER_KEY);
      const host = deployedAddresses.Identity;

      // Hash: keccak256(abi.encodePacked(msg.sender, address(this)))
      const messageHash = ethers.solidityPackedKeccak256(
        ["address", "address"],
        [account, host]
      );

      const sig = await issuer.signMessage(ethers.getBytes(messageHash));

      setApplicationData({
        type: 'merchant',
        signature: sig,
        externalId: Math.floor(Math.random() * 10000) + 1000
      });
    } catch (err) {
      console.error(err);
    }
    setIsApplying(false);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
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
          <div style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '32px',
            background: 'rgba(0,0,0,0.2)',
            padding: '4px',
            borderRadius: '14px'
          }}>
            <button
              className="btn"
              onClick={() => setRole('recipient')}
              style={{
                flex: 1,
                background: role === 'recipient' ? 'var(--primary)' : 'transparent',
                color: role === 'recipient' ? 'white' : 'var(--text-dim)',
                boxShadow: role === 'recipient' ? '0 4px 12px var(--primary-glow)' : 'none',
                border: role === 'recipient' ? '1px solid var(--primary)' : '1px solid transparent'
              }}
            >
              <UserPlus size={18} /> Recipient
            </button>
            <button
              className="btn"
              onClick={() => setRole('merchant')}
              style={{
                flex: 1,
                background: role === 'merchant' ? 'var(--secondary)' : 'transparent',
                color: role === 'merchant' ? 'white' : 'var(--text-dim)',
                boxShadow: role === 'merchant' ? '0 4px 12px rgba(99, 102, 241, 0.3)' : 'none',
                border: role === 'merchant' ? '1px solid var(--secondary)' : '1px solid transparent'
              }}
            >
              <Store size={18} /> Merchant
            </button>
          </div>

          <form onSubmit={handleRegister}>
            {role === 'recipient' ? (
              <>
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
                    required
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '8px' }}>
                    Note: Recipient registration requires a valid proof from the USDA system.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="input-group">
                  <label className="label">External Identifier (uint256)</label>
                  <input
                    type="number"
                    placeholder="e.g. 1001"
                    value={externalId}
                    onChange={(e) => setExternalId(e.target.value)}
                    required
                  />
                </div>

                <div className="input-group">
                  <label className="label">Admin Signature (bytes)</label>
                  <input
                    type="text"
                    placeholder="0x..."
                    value={signature}
                    onChange={(e) => setSignature(e.target.value)}
                    required
                  />
                </div>
              </>
            )}

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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card glass" style={{ height: 'fit-content' }}>
            <h3 style={{ marginBottom: '16px' }}>Why Register?</h3>
            <ul style={{ color: 'var(--text-dim)', paddingLeft: '20px', lineHeight: '1.6', marginBottom: '24px' }}>
              <li>Verify your identity on-chain for SNAP benefits.</li>
              <li>Enable recipient-defined security preferences.</li>
              <li>Prevent card skimming by whitelisting merchants.</li>
            </ul>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                className="btn"
                onClick={applyAsRecipient}
                disabled={isApplying}
                style={{
                  fontSize: '0.875rem',
                  background: '#FBBF24',
                  color: '#1E293B',
                  border: 'none',
                  fontWeight: '700'
                }}
              >
                <UserPlus size={16} /> Apply as Recipient
              </button>
              <button
                className="btn"
                onClick={applyAsMerchant}
                disabled={isApplying}
                style={{
                  fontSize: '0.875rem',
                  background: '#FBBF24',
                  color: '#1E293B',
                  border: 'none',
                  fontWeight: '700'
                }}
              >
                <Store size={16} /> Apply as Merchant
              </button>
            </div>
          </div>

          {applicationData && (
            <div className="card glass animate-fade-in" style={{ borderColor: 'var(--primary)', background: 'rgba(93, 183, 255, 0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}>
                  <FileText size={20} />
                  <h3 style={{ fontSize: '1.1rem' }}>Application Data</h3>
                </div>
                <button
                  onClick={() => setApplicationData(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
                >
                  Clear
                </button>
              </div>

              {applicationData.type === 'recipient' ? (
                <div style={{ fontSize: '0.875rem' }}>
                  <p style={{ marginBottom: '12px', color: 'var(--text-dim)' }}>
                    Proof generated against root: <br />
                    <code style={{ wordBreak: 'break-all', color: 'var(--text)', fontSize: '0.75rem' }}>{applicationData.root}</code>
                  </p>
                  <label className="label">Copy Proof Array:</label>
                  <div style={{ position: 'relative', marginBottom: '16px' }}>
                    <textarea
                      readOnly
                      value={applicationData.proof}
                      style={{ height: '80px', fontSize: '0.75rem', fontFamily: 'monospace', paddingRight: '40px' }}
                    />
                    <button
                      onClick={() => copyToClipboard(applicationData.proof)}
                      style={{ position: 'absolute', right: '8px', top: '8px', background: 'rgba(255,255,255,0.1)', border: 'none', padding: '4px', borderRadius: '4px', cursor: 'pointer', color: 'white' }}
                    >
                      {copied ? <Check size={16} color="var(--success)" /> : <Copy size={16} />}
                    </button>
                  </div>
                  <label className="label">Value:</label>
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: '8px' }}>
                    {applicationData.value} USDC
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '12px' }}>
                    <AlertTriangle size={12} style={{ marginRight: '4px' }} />
                    Note: The Issuer must first call <code>addRoot</code> with the root shown above.
                  </p>
                </div>
              ) : (
                <div style={{ fontSize: '0.875rem' }}>
                  <label className="label">Copy Signature:</label>
                  <div style={{ position: 'relative', marginBottom: '16px' }}>
                    <textarea
                      readOnly
                      value={applicationData.signature}
                      style={{ height: '80px', fontSize: '0.75rem', fontFamily: 'monospace', paddingRight: '40px' }}
                    />
                    <button
                      onClick={() => copyToClipboard(applicationData.signature)}
                      style={{ position: 'absolute', right: '8px', top: '8px', background: 'rgba(255,255,255,0.1)', border: 'none', padding: '4px', borderRadius: '4px', cursor: 'pointer', color: 'white' }}
                    >
                      {copied ? <Check size={16} color="var(--success)" /> : <Copy size={16} />}
                    </button>
                  </div>
                  <label className="label">External ID:</label>
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: '8px' }}>
                    {applicationData.externalId}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Registration;
