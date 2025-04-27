import React, { useEffect, useState } from 'react';
import ConnectWallet from './components/ConnectWallet';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('auth_token');
    const user = localStorage.getItem('user');
    setIsAuthenticated(!!token && !!user);

    // Redirect to dashboard if we're on the root path and authenticated
    if (window.location.pathname === '/' && isAuthenticated) {
      window.location.href = '#dashboard';
    }
  }, [isAuthenticated]);

  const handleConnect = (address: string) => {
    console.log('Wallet connected:', address);
    setIsAuthenticated(true);
  };

  if (!isAuthenticated) {
    return (
      <div className="auth-container">
        <div className="auth-options">
          <h1>Welcome to AidLink</h1>
          <p>Please sign in or create an account to continue</p>
          <div className="auth-buttons">
            <a href="/pages/auth/login.html" className="btn secondary">
              <i className="fas fa-sign-in-alt"></i> Login
            </a>
            <a href="/pages/auth/signup.html" className="btn primary">
              <i className="fas fa-user-plus"></i> Register
            </a>
          </div>
          <div className="auth-divider">
            <span>or</span>
          </div>
          <ConnectWallet onConnect={handleConnect} />
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <header>
        <nav className="navbar">
          <div className="logo">
            <i className="fas fa-hand-holding-heart"></i> AidLink
          </div>
          <ul className="nav-links">
            <li><a href="#dashboard"><i className="fas fa-chart-line"></i> Dashboard</a></li>
            <li><a href="#tokens"><i className="fas fa-coins"></i> Aid Tokens</a></li>
            <li><a href="#marketplace"><i className="fas fa-store"></i> Marketplace</a></li>
            <li><a href="#analytics"><i className="fas fa-chart-bar"></i> Analytics</a></li>
          </ul>
          <div className="auth-section">
            <ConnectWallet onConnect={handleConnect} />
          </div>
        </nav>
      </header>
      {/* Rest of your app content */}
    </div>
  );
}

export default App;