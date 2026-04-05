import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { Shield, UserPlus, Sliders, Send, Wallet } from 'lucide-react';
import { useWeb3 } from './hooks/useWeb3';

// Pages
import Registration from './pages/Registration';
import AccessControl from './pages/AccessControl';
import Transaction from './pages/Transaction';

const App = () => {
  const { account, error, connect } = useWeb3();

  return (
    <Router>
      <div className="container">
        <nav>
          <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.5rem', fontWeight: '800' }}>
            <Shield size={32} color="#5DB7FF" />
            <span>SNAP<span style={{ color: '#5DB7FF' }}>TRUST</span></span>
          </div>
          
          <div className="nav-links">
            <NavLink to="/" className={({ isActive }) => isActive ? 'active' : ''}>Registration</NavLink>
            <NavLink to="/access" className={({ isActive }) => isActive ? 'active' : ''}>Access Control</NavLink>
            <NavLink to="/transaction" className={({ isActive }) => isActive ? 'active' : ''}>Simulation</NavLink>
          </div>

          <button className="btn btn-primary" onClick={connect}>
            <Wallet size={18} />
            {account ? `${account.substring(0, 6)}...${account.substring(38)}` : 'Connect Wallet'}
          </button>
        </nav>

        {error && (
          <div className="card glass animate-fade-in" style={{ borderColor: 'var(--danger)', marginBottom: '20px', padding: '12px 20px' }}>
            <p style={{ color: 'var(--danger)', fontSize: '0.875rem' }}>{error}</p>
          </div>
        )}

        <main>
          <Routes>
            <Route path="/" element={<Registration />} />
            <Route path="/access" element={<AccessControl />} />
            <Route path="/transaction" element={<Transaction />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;
