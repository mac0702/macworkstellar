import React, { useState } from 'react';
import { ethers } from 'ethers';

interface ConnectWalletProps {
  onConnect?: (address: string) => void;
}

const ConnectWallet: React.FC<ConnectWalletProps> = ({ onConnect }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [error, setError] = useState<string>('');
  
  const API_BASE_URL = 'http://localhost:4000/api';

  const handleDirectAddress = async (address: string) => {
    if (!ethers.utils.isAddress(address)) {
      setError('Invalid wallet address');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/nonce`);
      if (!response.ok) {
        throw new Error('Failed to get nonce');
      }
      const { nonce } = await response.json();

      const verifyResponse = await fetch(`${API_BASE_URL}/auth/verify-signature`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address,
          message: `Connect to AidLink\nNonce: ${nonce}`,
          signature: 'direct-connection'
        }),
      });

      if (!verifyResponse.ok) {
        throw new Error('Failed to verify address');
      }

      const data = await verifyResponse.json();
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      setWalletAddress(address);
      onConnect?.(address);
      setIsModalOpen(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to connect wallet');
    }
  };

  const connectWithMetaMask = async () => {
    if (typeof window.ethereum === 'undefined') {
      setError('MetaMask is not installed');
      return;
    }

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      const address = accounts[0];
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      // Get nonce from server
      const response = await fetch(`${API_BASE_URL}/auth/nonce`);
      if (!response.ok) {
        throw new Error('Failed to get nonce');
      }
      const { nonce } = await response.json();

      // Sign message
      const message = `Connect to AidLink\nNonce: ${nonce}`;
      const signature = await signer.signMessage(message);

      // Verify signature
      const verifyResponse = await fetch(`${API_BASE_URL}/auth/verify-signature`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address,
          message,
          signature
        }),
      });

      if (!verifyResponse.ok) {
        throw new Error('Failed to verify signature');
      }

      const data = await verifyResponse.json();
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      setWalletAddress(address);
      onConnect?.(address);
      setIsModalOpen(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to connect wallet');
    }
  };

  const connectWithWalletConnect = async () => {
    setError('WalletConnect coming soon');
  };

  return (
    <div>
      <button 
        onClick={() => setIsModalOpen(true)}
        className="btn primary"
      >
        {walletAddress 
          ? `Connected: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
          : <><i className="fas fa-wallet"></i> Connect Wallet</>
        }
      </button>

      {isModalOpen && (
        <div className="modal" style={{ display: 'flex' }}>
          <div className="modal-content">
            <div className="modal-header">
              <h2><i className="fas fa-wallet"></i> Connect Wallet</h2>
              <button 
                className="close-modal"
                onClick={() => setIsModalOpen(false)}
              >×</button>
            </div>
            <div className="modal-body">
              <div className="connection-options">
                <div className="option-card">
                  <div className="option-icon">
                    <i className="fas fa-keyboard"></i>
                  </div>
                  <h3>Enter Wallet Address</h3>
                  <p>Connect by entering your wallet address directly</p>
                  <div className="address-input">
                    <input
                      type="text"
                      placeholder="Enter your wallet address (0x...)"
                      className="wallet-address-input"
                      onChange={(e) => setError('')}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleDirectAddress(e.currentTarget.value);
                        }
                      }}
                    />
                    <button 
                      className="btn primary connect-address-btn"
                      onClick={(e) => handleDirectAddress(
                        (e.currentTarget.previousElementSibling as HTMLInputElement).value
                      )}
                    >
                      <i className="fas fa-plug"></i> Connect
                    </button>
                  </div>
                </div>

                <div className="option-card" onClick={connectWithWalletConnect}>
                  <div className="option-icon">
                    <i className="fas fa-qrcode"></i>
                  </div>
                  <h3>Scan QR Code</h3>
                  <p>Connect using your phone's wallet app</p>
                </div>

                <div className="option-card" onClick={connectWithMetaMask}>
                  <div className="option-icon">
                    <i className="fas fa-fox"></i>
                  </div>
                  <h3>MetaMask</h3>
                  <p>Connect using browser extension</p>
                </div>
              </div>

              {error && (
                <div className="error-message" style={{
                  color: 'red',
                  marginTop: '1rem',
                  textAlign: 'center'
                }}>
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectWallet;