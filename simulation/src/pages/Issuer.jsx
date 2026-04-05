import React, { useState, useMemo } from 'react';
import { Shield, Users, Database, Copy, CheckCircle2, Key, Download, FileJson, Plus, Trash2 } from 'lucide-react';
import { ethers } from 'ethers';
import { MerkleTree } from 'merkletreejs';
import { useWeb3 } from '../hooks/useWeb3';

const Issuer = () => {
    const { account, provider } = useWeb3();
    const [recipients, setRecipients] = useState([
        { address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', value: '500' },
        { address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', value: '750' }
    ]);
    const [isUpdatingRoot, setIsUpdatingRoot] = useState(false);
    const [txHash, setTxHash] = useState(null);

    // Wallet Migration State (as requested)
    const [migrationNewWallet, setMigrationNewWallet] = useState('');
    const [migrationSignature, setMigrationSignature] = useState(null);
    const [isSigning, setIsSigning] = useState(false);

    // Merkle Calculation
    const { root, tree, proofs } = useMemo(() => {
        if (recipients.length === 0) return { root: null, tree: null, proofs: {} };

        try {
            const leaves = recipients.map(r => 
                ethers.solidityPackedKeccak256(
                    ["address", "uint256"], 
                    [r.address, ethers.parseUnits(r.value, 18)]
                )
            );
            
            const merkleTree = new MerkleTree(leaves, ethers.keccak256, { sortPairs: true });
            const merkleRoot = merkleTree.getHexRoot();
            
            const merkleProofs = {};
            recipients.forEach((r, i) => {
                merkleProofs[r.address] = merkleTree.getHexProof(leaves[i]);
            });

            return { root: merkleRoot, tree: merkleTree, proofs: merkleProofs };
        } catch (err) {
            console.error("Merkle Error:", err);
            return { root: 'Error', tree: null, proofs: {} };
        }
    }, [recipients]);

    const addRecipient = () => {
        setRecipients([...recipients, { address: '', value: '0' }]);
    };

    const removeRecipient = (index) => {
        setRecipients(recipients.filter((_, i) => i !== index));
    };

    const updateRecipient = (index, field, val) => {
        const newRecipients = [...recipients];
        newRecipients[index][field] = val;
        setRecipients(newRecipients);
    };

    const handleUpdateRoot = async () => {
        if (!root || root === 'Error') return;
        setIsUpdatingRoot(true);
        
        // Simulating contract call since we don't have the full environment
        // In a real app: const contract = new ethers.Contract(ADDR, ABI, signer);
        setTimeout(() => {
            setTxHash('0x' + Math.random().toString(16).substring(2, 42));
            setIsUpdatingRoot(false);
        }, 1500);
    };

    const handleSignOld = async (e) => {
        e.preventDefault();
        if (!account || !migrationNewWallet) return;
        
        setIsSigning(true);
        try {
            // Replicating the logic from the requested snippet:
            // keccak256(abi.encodePacked(msg.sender, newWallet, address(this)))
            // Note: address(this) should be the Identity contract address. 
            // Using a placeholder for now.
            const identityAddress = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
            
            const messageHash = ethers.solidityPackedKeccak256(
                ["address", "address", "address"],
                [account, migrationNewWallet, identityAddress]
            );
            
            // Signing with Ethers (MetaMask will show the message hash)
            const signer = await provider.getSigner();
            const signature = await signer.signMessage(ethers.getBytes(messageHash));
            
            setMigrationSignature(signature);
        } catch (err) {
            console.error("Signing Error:", err);
        } finally {
            setIsSigning(false);
        }
    };

    const downloadProofs = () => {
        const data = JSON.stringify({
            root,
            recipients: recipients.map(r => ({
                address: r.address,
                value: r.value,
                proof: proofs[r.address]
            }))
        }, null, 2);
        
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `merkle-proofs-${Date.now()}.json`;
        a.click();
    };

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: '40px' }}>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Issuer Dashboard</h1>
                <p style={{ color: 'var(--text-dim)' }}>Manage recipient registrations and generate Merkle proofs for the SNAP system.</p>
            </header>

            <div className="grid" style={{ gridTemplateColumns: '1.5fr 1fr' }}>
                <div className="card glass">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <Users size={24} color="var(--primary)" />
                            <h2 style={{ fontSize: '1.5rem' }}>Recipient List</h2>
                        </div>
                        <button className="btn glass" onClick={addRecipient} style={{ fontSize: '0.875rem' }}>
                            <Plus size={16} /> Add Recipient
                        </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {recipients.map((r, i) => (
                            <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <div style={{ flex: 2 }}>
                                    <input 
                                        placeholder="Address (0x...)" 
                                        value={r.address}
                                        onChange={(e) => updateRecipient(i, 'address', e.target.value)}
                                        style={{ fontSize: '0.875rem' }}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <input 
                                        type="number" 
                                        placeholder="Amount" 
                                        value={r.value}
                                        onChange={(e) => updateRecipient(i, 'value', e.target.value)}
                                        style={{ fontSize: '0.875rem' }}
                                    />
                                </div>
                                <button type="button" onClick={() => removeRecipient(i)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '8px' }}>
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                    </div>

                    <div style={{ marginTop: '32px', padding: '20px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'var(--text-dim)', fontSize: '0.875rem' }}>
                            <Database size={16} />
                            <span>Calculated Merkle Root</span>
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <code style={{ flex: 1, padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--primary)' }}>
                                {root || 'Waiting for data...'}
                            </code>
                            <button className="btn glass" onClick={() => navigator.clipboard.writeText(root)} style={{ padding: '12px' }}>
                                <Copy size={18} />
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                        <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleUpdateRoot} disabled={isUpdatingRoot || !root}>
                            {isUpdatingRoot ? 'Updating...' : 'Push Root to Contract'}
                        </button>
                        <button className="btn glass" onClick={downloadProofs} disabled={!root}>
                            <Download size={18} /> Export Proofs
                        </button>
                    </div>

                    {txHash && (
                        <div className="animate-fade-in" style={{ marginTop: '20px', padding: '12px 16px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--success)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <CheckCircle2 size={18} color="var(--success)" />
                            <span style={{ fontSize: '0.875rem', color: 'var(--success)' }}>Merkle root successfully updated!</span>
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div className="card glass">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                            <Key size={20} color="var(--primary)" />
                            <h3 style={{ fontSize: '1.25rem' }}>Wallet Migration</h3>
                        </div>
                        <p style={{ color: 'var(--text-dim)', fontSize: '0.875rem', marginBottom: '20px', lineHeight: '1.5' }}>
                            Generate an off-chain signature to grant access to a new wallet. This uses the <code>signOld</code> logic.
                        </p>
                        
                        <form onSubmit={handleSignOld}>
                            <div className="input-group">
                                <label className="label">New Wallet Address</label>
                                <input 
                                    placeholder="0x..." 
                                    value={migrationNewWallet}
                                    onChange={(e) => setMigrationNewWallet(e.target.value)}
                                    required
                                />
                            </div>
                            <button className="btn btn-primary" style={{ width: '100%' }} disabled={isSigning || !account}>
                                {isSigning ? 'Signing...' : 'Sign Migration'}
                            </button>
                        </form>

                        {migrationSignature && (
                            <div style={{ marginTop: '20px' }}>
                                <label className="label">Signature</label>
                                <div style={{ position: 'relative' }}>
                                    <textarea 
                                        readOnly 
                                        value={migrationSignature} 
                                        style={{ width: '100%', height: '80px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)', padding: '8px', fontSize: '0.75rem', resize: 'none' }}
                                    />
                                    <button 
                                        onClick={() => navigator.clipboard.writeText(migrationSignature)}
                                        style={{ position: 'absolute', right: '8px', bottom: '8px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '4px', padding: '4px', cursor: 'pointer', color: 'var(--text-dim)' }}
                                    >
                                        <Copy size={14} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="card glass" style={{ background: 'rgba(93, 183, 255, 0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                            <FileJson size={20} color="var(--primary)" />
                            <h3 style={{ fontSize: '1.1rem' }}>Proof Format</h3>
                        </div>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-dim)', lineHeight: '1.5' }}>
                            Recipients will need their individual proof and the exact approved value to register on-chain. Deliver the exported JSON to them securely.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Issuer;
