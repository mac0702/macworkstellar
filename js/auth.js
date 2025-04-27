class AuthHandler {
    constructor() {
        this.form = document.querySelector('.auth-form');
        this.web3 = null;
        this.web3Modal = null;
        this.provider = null;
        this.initializeWeb3Modal();
        this.setupEventListeners();
        this.apiBaseUrl = 'http://localhost:4000/api';
        this.checkAuthState();
        this.checkServerConnection();
    }

    checkAuthState() {
        const token = localStorage.getItem('auth_token');
        const user = localStorage.getItem('user');
        
        // If on auth pages and already authenticated, redirect to dashboard
        if (window.location.pathname.includes('/auth/') && token && user) {
            window.location.href = '/#dashboard';
        }
        
        // If on main app and not authenticated, redirect to login
        if (!window.location.pathname.includes('/auth/') && (!token || !user)) {
            window.location.href = '/pages/auth/login.html';
        }
    }

    async checkServerConnection() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/health`);
            if (!response.ok) {
                this.showAlert('Backend server is not responding. Please try again later.', 'error');
            }
        } catch (error) {
            console.error('Server connection error:', error);
            this.showAlert('Cannot connect to server. Please make sure the backend server is running.', 'error');
        }
    }

    async initializeWeb3Modal() {
        try {
            const Web3Modal = window.Web3Modal.default;
            const WalletConnectProvider = window.WalletConnectProvider.default;

            // Configure WalletConnect
            const providerOptions = {
                walletconnect: {
                    package: WalletConnectProvider,
                    options: {
                        infuraId: "YOUR_INFURA_ID",
                        qrcodeModalOptions: {
                            mobileLinks: [
                                "rainbow",
                                "trust",
                                "metamask",
                                "argent"
                            ]
                        }
                    }
                }
            };

            this.web3Modal = new Web3Modal({
                network: "mainnet",
                cacheProvider: true,
                providerOptions,
                theme: "dark"
            });

            // Replace MetaMask button with new options
            const metamaskBtn = document.querySelector('.metamask-btn');
            if (metamaskBtn) {
                metamaskBtn.innerHTML = '<i class="fas fa-wallet"></i> Connect Wallet';
                metamaskBtn.addEventListener('click', () => this.showConnectionModal());
            }
        } catch (error) {
            console.error('Web3Modal initialization error:', error);
            this.showAlert('Failed to initialize wallet options', 'error');
        }
    }

    showConnectionModal() {
        // Create modal HTML
        const modalHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2><i class="fas fa-wallet"></i> Connect Wallet</h2>
                    <button class="close-modal">×</button>
                </div>
                <div class="modal-body">
                    <div class="connection-options">
                        <div class="option-card" id="directAddress">
                            <div class="option-icon">
                                <i class="fas fa-keyboard"></i>
                            </div>
                            <h3>Enter Wallet Address</h3>
                            <p>Connect by entering your wallet address directly</p>
                            <div class="address-input" style="display: none;">
                                <input type="text" placeholder="Enter your wallet address (0x...)" 
                                       class="wallet-address-input">
                                <button class="btn primary connect-address-btn">
                                    <i class="fas fa-plug"></i> Connect
                                </button>
                            </div>
                        </div>

                        <div class="option-card" id="qrScanner">
                            <div class="option-icon">
                                <i class="fas fa-qrcode"></i>
                            </div>
                            <h3>Scan QR Code</h3>
                            <p>Connect using your phone's wallet app</p>
                        </div>
                    </div>
                </div>
            </div>`;

        // Create or get modal container
        let modal = document.getElementById('walletModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'walletModal';
            modal.className = 'modal';
            document.body.appendChild(modal);
        }

        // Set modal content
        modal.innerHTML = modalHTML;
        modal.style.display = 'flex';

        // Add event listeners
        const closeBtn = modal.querySelector('.close-modal');
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        // Close when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });

        // Handle direct address option
        const directAddressCard = modal.querySelector('#directAddress');
        directAddressCard.addEventListener('click', () => {
            const addressInput = directAddressCard.querySelector('.address-input');
            addressInput.style.display = 'flex';
            
            const connectBtn = addressInput.querySelector('.connect-address-btn');
            connectBtn.addEventListener('click', () => {
                const address = addressInput.querySelector('.wallet-address-input').value;
                if (this.isValidAddress(address)) {
                    this.handleDirectAddressConnection(address);
                    modal.style.display = 'none';
                } else {
                    this.showAlert('Please enter a valid wallet address', 'error');
                }
            });
        });

        // Handle QR scanner option
        const qrScannerCard = modal.querySelector('#qrScanner');
        qrScannerCard.addEventListener('click', async () => {
            try {
                const provider = await this.web3Modal.connectTo('walletconnect');
                this.provider = provider;
                this.web3 = new Web3(provider);
                
                const accounts = await this.web3.eth.getAccounts();
                if (accounts && accounts.length > 0) {
                    await this.handleMetaMaskSignup(accounts[0]);
                }
                modal.style.display = 'none';
            } catch (error) {
                console.error('QR connection error:', error);
                this.showAlert(error.message || 'Failed to connect via QR code', 'error');
            }
        });
    }

    isValidAddress(address) {
        return /^0x[a-fA-F0-9]{40}$/.test(address);
    }

    async handleDirectAddressConnection(address) {
        try {
            this.showAlert('Connecting with address...', 'info');
            
            // First check server connection
            try {
                const healthCheck = await fetch(`${this.apiBaseUrl}/health`);
                if (!healthCheck.ok) {
                    throw new Error('Backend server is not available');
                }
            } catch (error) {
                throw new Error('Please start the backend server first. Run: node backend/server.js');
            }
            
            // Get nonce from server
            const nonceResponse = await fetch(`${this.apiBaseUrl}/auth/nonce`);
            if (!nonceResponse.ok) {
                const error = await nonceResponse.json();
                throw new Error(error.message || 'Failed to get nonce from server');
            }
            const { nonce } = await nonceResponse.json();

            // Send to backend for verification
            const response = await fetch(`${this.apiBaseUrl}/auth/verify-signature`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    address,
                    message: `Connect to AidLink\nNonce: ${nonce}`,
                    signature: 'direct-connection'  // Special case for direct connection
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Connection failed');
            }

            const data = await response.json();
            this.showAlert('Connected successfully!', 'success');
            
            // Store auth data
            localStorage.setItem('auth_token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            // Redirect to home page
            setTimeout(() => {
                window.location.href = '/';
            }, 1500);
            
        } catch (error) {
            console.error('Direct connection error:', error);
            this.showAlert(error.message || 'Failed to connect with address', 'error');
        }
    }

    async connectSelectedWallet(walletType) {
        try {
            this.showAlert('Connecting wallet...', 'info');
            let provider;

            switch (walletType) {
                case 'walletconnect':
                    provider = await this.web3Modal.connectTo('walletconnect');
                    break;
                case 'coinbase':
                    provider = await this.web3Modal.connectTo('walletlink');
                    break;
                case 'metamask':
                    if (!window.ethereum) {
                        window.open('https://metamask.io/download.html', '_blank');
                        throw new Error('Please install MetaMask to use this option');
                    }
                    provider = await this.connectWallet();
                    break;
                default:
                    throw new Error('Unknown wallet type');
            }

            this.provider = provider;
            this.web3 = new Web3(provider);

            const accounts = await this.web3.eth.getAccounts();
            if (accounts && accounts.length > 0) {
                await this.handleMetaMaskSignup(accounts[0]);
            }
        } catch (error) {
            console.error('Wallet connection error:', error);
            this.showAlert(error.message || 'Failed to connect wallet', 'error');
        }
    }

    async connectWallet() {
        try {
            this.showAlert('Connecting to MetaMask...', 'info');
            
            // Check if MetaMask is installed
            if (!window.ethereum) {
                throw new Error('Please install MetaMask to continue');
            }

            // Request account access
            const accounts = await window.ethereum.request({ 
                method: 'eth_requestAccounts' 
            });

            if (!accounts || accounts.length === 0) {
                throw new Error('No accounts found. Please unlock MetaMask.');
            }

            // Initialize Web3
            this.web3 = new Web3(window.ethereum);

            // Setup event listeners
            window.ethereum.on('accountsChanged', (accounts) => {
                this.handleAccountsChanged(accounts);
            });

            window.ethereum.on('chainChanged', () => {
                window.location.reload();
            });

            window.ethereum.on('disconnect', () => {
                this.handleDisconnect();
            });

            this.showAlert('Wallet connected successfully!', 'success');
            return accounts[0];
        } catch (error) {
            console.error('Wallet connection error:', error);
            this.showAlert(error.message || 'Failed to connect wallet', 'error');
            throw error;
        }
    }

    async handleMetaMaskSignup(account) {
        try {
            this.showAlert('Signing up with MetaMask...', 'info');

            // Get nonce from server
            const nonceResponse = await fetch(`${this.apiBaseUrl}/auth/nonce`);
            if (!nonceResponse.ok) {
                throw new Error('Failed to get nonce from server');
            }
            const { nonce } = await nonceResponse.json();
            
            // Create message to sign
            const message = `Register with AidLink\nNonce: ${nonce}`;
            
            // Request signature from user
            const signature = await window.ethereum.request({
                method: 'personal_sign',
                params: [message, account]
            });

            // Send to backend for verification
            const response = await fetch(`${this.apiBaseUrl}/auth/verify-signature`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    address: account,
                    message,
                    signature 
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Registration failed');
            }

            const data = await response.json();
            this.showAlert('Registration successful!', 'success');
            
            // Store auth data
            localStorage.setItem('auth_token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            // Redirect to home page
            setTimeout(() => {
                window.location.href = '/';
            }, 1500);
            
        } catch (error) {
            console.error('MetaMask signup error:', error);
            this.showAlert(error.message || 'Failed to sign up with MetaMask', 'error');
        }
    }

    handleAccountsChanged(accounts) {
        if (accounts.length === 0) {
            this.showAlert('Please connect your wallet', 'error');
            this.handleDisconnect();
        } else {
            this.showAlert('Account changed to ' + this.truncateAddress(accounts[0]), 'info');
        }
    }

    handleDisconnect(error) {
        if (error) {
            console.error('Wallet disconnection error:', error);
        }
        this.web3Modal.clearCachedProvider();
        this.provider = null;
        this.web3 = null;
        this.showAlert('Wallet disconnected', 'info');
    }

    truncateAddress(address) {
        return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';
    }

    handleAuthSuccess(data) {
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        window.location.href = '/';
    }

    showAlert(message, type) {
        const alert = document.getElementById('authAlert');
        if (!alert) {
            console.error('Alert element not found');
            return;
        }

        const icon = type === 'success' ? 'check-circle' : 
                    type === 'error' ? 'exclamation-circle' :
                    'info-circle';
        
        alert.innerHTML = `
            <i class="fas fa-${icon}"></i>
            ${message}
        `;
        alert.className = `auth-alert ${type}`;
        alert.style.display = 'block';

        if (type === 'info') {
            alert.innerHTML += '<i class="fas fa-spinner fa-spin"></i>';
        }

        alert.style.animation = 'none';
        alert.offsetHeight; // Trigger reflow
        alert.style.animation = 'slideIn 0.3s ease';

        if (!message.includes('Connecting')) {
            setTimeout(() => {
                alert.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => {
                    alert.style.display = 'none';
                }, 300);
            }, 5000);
        }
    }
}

// Add styles for the new modal
const style = document.createElement('style');
style.textContent = `
    .connection-options {
        display: flex;
        gap: 1rem;
        margin: 1rem 0;
    }

    .option-card {
        flex: 1;
        padding: 1.5rem;
        border: 1px solid #ddd;
        border-radius: 12px;
        text-align: center;
        cursor: pointer;
        transition: all 0.3s ease;
    }

    .option-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .option-icon {
        font-size: 2rem;
        margin-bottom: 1rem;
        color: #3B99FC;
    }

    .option-card h3 {
        margin: 0.5rem 0;
        color: #333;
    }

    .option-card p {
        color: #666;
        font-size: 0.9rem;
        margin-bottom: 1rem;
    }

    .address-input {
        display: none;
        flex-direction: column;
        gap: 0.5rem;
        margin-top: 1rem;
    }

    .wallet-address-input {
        padding: 0.75rem;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 0.9rem;
    }

    .connect-address-btn {
        padding: 0.75rem;
        background: #3B99FC;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-weight: bold;
    }

    .connect-address-btn:hover {
        background: #2d7acc;
    }

    .modal {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        justify-content: center;
        align-items: center;
        z-index: 1000;
    }

    .modal-content {
        background: white;
        padding: 2rem;
        border-radius: 12px;
        width: 90%;
        max-width: 500px;
    }

    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
    }

    .close-modal {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
    }
`;

document.head.appendChild(style);

// Initialize auth handler when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AuthHandler();
});