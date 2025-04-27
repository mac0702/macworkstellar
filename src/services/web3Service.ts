import Web3 from 'web3';
import AidTokenABI from '../contracts/AidToken.json';
import DonationManagerABI from '../contracts/DonationManager.json';

export class Web3Service {
    private web3: Web3;
    private aidTokenContract: any;
    private donationManagerContract: any;
    private account: string | null = null;
    private chainId: number | null = null;

    constructor(
        private aidTokenAddress: string,
        private donationManagerAddress: string
    ) {
        if (typeof window !== 'undefined' && typeof window.ethereum !== 'undefined') {
            this.web3 = new Web3(window.ethereum);
            this.setupMetaMaskListeners();
        } else {
            throw new Error('Please install MetaMask to use this application');
        }
    }

    private setupMetaMaskListeners() {
        window.ethereum.on('accountsChanged', (accounts: string[]) => {
            if (accounts.length === 0) {
                this.account = null;
                window.dispatchEvent(new Event('walletDisconnected'));
            } else {
                this.account = accounts[0];
                window.dispatchEvent(new Event('walletChanged'));
            }
        });

        window.ethereum.on('chainChanged', (chainId: string) => {
            this.chainId = parseInt(chainId);
            window.dispatchEvent(new Event('networkChanged'));
            window.location.reload();
        });

        window.ethereum.on('disconnect', () => {
            this.account = null;
            window.dispatchEvent(new Event('walletDisconnected'));
        });
    }

    private async initializeContracts() {
        try {
            const gasPrice = await this.web3.eth.getGasPrice();
            const block = await this.web3.eth.getBlock('latest');
            const gasLimit = block.gasLimit;

            const aidTokenCode = await this.web3.eth.getCode(this.aidTokenAddress);
            const donationManagerCode = await this.web3.eth.getCode(this.donationManagerAddress);

            if (aidTokenCode === '0x' || donationManagerCode === '0x') {
                throw new Error('One or more smart contracts not deployed at the specified addresses');
            }

            this.aidTokenContract = new this.web3.eth.Contract(
                AidTokenABI,
                this.aidTokenAddress,
                {
                    from: this.account || undefined,
                    gasPrice: gasPrice,
                    gas: Math.min(Math.floor(gasLimit * 0.9), 8000000)
                }
            );
            
            this.donationManagerContract = new this.web3.eth.Contract(
                DonationManagerABI,
                this.donationManagerAddress,
                {
                    from: this.account || undefined,
                    gasPrice: gasPrice,
                    gas: Math.min(Math.floor(gasLimit * 0.9), 8000000)
                }
            );
        } catch (error) {
            console.error('Contract initialization error:', error);
            throw new Error('Failed to initialize smart contracts');
        }
    }

    async connectWallet(): Promise<string> {
        try {
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            });

            this.chainId = parseInt(await window.ethereum.request({
                method: 'eth_chainId'
            }));

            this.account = accounts[0];
            await this.initializeContracts();
            
            return this.account;
        } catch (error) {
            console.error('Wallet connection error:', error);
            throw new Error('Failed to connect wallet');
        }
    }

    async donate(amount: string, category: string, region: string): Promise<any> {
        if (!this.account) {
            throw new Error('Wallet not connected');
        }

        if (!this.aidTokenContract) {
            throw new Error('Smart contracts not initialized');
        }

        try {
            const weiAmount = this.web3.utils.toWei(amount, 'ether');
            
            const gasPrice = await this.web3.eth.getGasPrice();
            const block = await this.web3.eth.getBlock('latest');
            
            const gasEstimate = await this.aidTokenContract.methods
                .donate(category, region)
                .estimateGas({ 
                    from: this.account, 
                    value: weiAmount,
                    gas: Math.min(Math.floor(block.gasLimit * 0.9), 8000000)
                });

            const gasLimit = Math.min(
                Math.floor(gasEstimate * 1.3),
                Math.floor(block.gasLimit * 0.9),
                8000000
            );

            return await this.aidTokenContract.methods
                .donate(category, region)
                .send({
                    from: this.account,
                    value: weiAmount,
                    gas: gasLimit,
                    gasPrice: gasPrice,
                    maxFeePerGas: gasPrice * 2,
                    maxPriorityFeePerGas: Math.floor(gasPrice * 0.1)
                });
        } catch (error) {
            console.error('Donation error:', error);
            if (error.message.includes('gas')) {
                throw new Error('Transaction requires too much gas. Try reducing the donation amount or splitting it into smaller transactions.');
            }
            throw new Error('Failed to process donation: ' + error.message);
        }
    }

    async getDonationHistory(donationId: number): Promise<any> {
        if (!this.aidTokenContract) {
            throw new Error('Smart contracts not initialized');
        }

        try {
            return await this.aidTokenContract.methods
                .getDonation(donationId)
                .call();
        } catch (error) {
            console.error('Get donation history error:', error);
            throw new Error('Failed to fetch donation history');
        }
    }

    async createMultiSigDonation(
        recipient: string,
        amount: string,
        purpose: string
    ): Promise<any> {
        if (!this.account) {
            throw new Error('Wallet not connected');
        }

        if (!this.donationManagerContract) {
            throw new Error('Smart contracts not initialized');
        }

        try {
            const weiAmount = this.web3.utils.toWei(amount, 'ether');
            const gasEstimate = await this.donationManagerContract.methods
                .createTransaction(recipient, weiAmount, purpose)
                .estimateGas({ from: this.account });

            return await this.donationManagerContract.methods
                .createTransaction(recipient, weiAmount, purpose)
                .send({ 
                    from: this.account,
                    gas: Math.round(gasEstimate * 1.2)
                });
        } catch (error) {
            console.error('Create multi-sig donation error:', error);
            throw new Error('Failed to create multi-signature donation');
        }
    }

    async approveMultiSigDonation(transactionId: number): Promise<any> {
        if (!this.account) {
            throw new Error('Wallet not connected');
        }

        if (!this.donationManagerContract) {
            throw new Error('Smart contracts not initialized');
        }

        try {
            const gasEstimate = await this.donationManagerContract.methods
                .approveTransaction(transactionId)
                .estimateGas({ from: this.account });

            return await this.donationManagerContract.methods
                .approveTransaction(transactionId)
                .send({ 
                    from: this.account,
                    gas: Math.round(gasEstimate * 1.2)
                });
        } catch (error) {
            console.error('Approve multi-sig donation error:', error);
            throw new Error('Failed to approve multi-signature donation');
        }
    }

    async getTransactionDetails(transactionId: number): Promise<any> {
        if (!this.donationManagerContract) {
            throw new Error('Smart contracts not initialized');
        }

        try {
            return await this.donationManagerContract.methods
                .getTransaction(transactionId)
                .call();
        } catch (error) {
            console.error('Get transaction details error:', error);
            throw new Error('Failed to fetch transaction details');
        }
    }

    async getContractBalance(): Promise<string> {
        try {
            const balance = await this.web3.eth.getBalance(this.aidTokenAddress);
            return this.web3.utils.fromWei(balance, 'ether');
        } catch (error) {
            console.error('Get contract balance error:', error);
            throw new Error('Failed to fetch contract balance');
        }
    }

    async subscribeToEvents(callback: (event: any) => void) {
        if (!this.aidTokenContract) {
            throw new Error('Smart contracts not initialized');
        }

        try {
            this.aidTokenContract.events.DonationReceived({})
                .on('data', callback)
                .on('error', (error: any) => {
                    console.error('Event subscription error:', error);
                    callback({ error: 'Failed to receive donation event' });
                });

            this.aidTokenContract.events.FundsDistributed({})
                .on('data', callback)
                .on('error', (error: any) => {
                    console.error('Event subscription error:', error);
                    callback({ error: 'Failed to receive distribution event' });
                });
        } catch (error) {
            console.error('Event subscription setup error:', error);
            throw new Error('Failed to setup event subscriptions');
        }
    }

    async signMessage(message: string): Promise<string> {
        if (!this.account) {
            throw new Error('Wallet not connected');
        }

        try {
            const signature = await window.ethereum.request({
                method: 'eth_sign',
                params: [this.account, this.web3.utils.utf8ToHex(message)]
            });
            return signature;
        } catch (error) {
            console.error('Message signing error:', error);
            throw new Error('Failed to sign message');
        }
    }

    isConnected(): boolean {
        return !!this.account;
    }

    getCurrentAccount(): string | null {
        return this.account;
    }

    getCurrentChainId(): number | null {
        return this.chainId;
    }

    private async willTransactionFit(gasEstimate: number): Promise<boolean> {
        const block = await this.web3.eth.getBlock('latest');
        return gasEstimate <= Math.floor(block.gasLimit * 0.9);
    }

    async getNetworkStatus(): Promise<{
        gasPrice: string;
        blockGasLimit: number;
        currentBlock: number;
        isMainnet: boolean;
    }> {
        const [gasPrice, block, chainId] = await Promise.all([
            this.web3.eth.getGasPrice(),
            this.web3.eth.getBlock('latest'),
            this.web3.eth.getChainId()
        ]);

        return {
            gasPrice: this.web3.utils.fromWei(gasPrice, 'gwei'),
            blockGasLimit: block.gasLimit,
            currentBlock: block.number,
            isMainnet: chainId === 1
        };
    }
}