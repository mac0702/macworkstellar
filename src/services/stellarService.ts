import { 
  Server, 
  Networks, 
  Asset, 
  Keypair, 
  TransactionBuilder,
  Operation,
  Account,
  BASE_FEE,
  Claimant,
  Memo,
} from 'stellar-sdk';

export class StellarService {
  private server: Server;
  private account: Account | null = null;
  private publicKey: string | null = null;

  constructor() {
    // Initialize with Stellar testnet - we'll make this configurable later
    this.server = new Server('https://horizon-testnet.stellar.org');
  }

  async connectWallet(): Promise<string> {
    try {
      // Check if Freighter (Stellar wallet) is installed
      if (typeof window === 'undefined' || !window.freighter) {
        throw new Error('Please install Freighter wallet to use this application');
      }

      // Request public key from Freighter
      this.publicKey = await window.freighter.getPublicKey();
      
      // Load account details
      const account = await this.server.loadAccount(this.publicKey);
      this.account = new Account(this.publicKey, account.sequence);

      return this.publicKey;
    } catch (error) {
      console.error('Wallet connection error:', error);
      throw new Error('Failed to connect wallet');
    }
  }

  async donate(amount: string, category: string, region: string): Promise<any> {
    if (!this.publicKey || !this.account) {
      throw new Error('Wallet not connected');
    }

    try {
      // Create a payment operation
      const transaction = new TransactionBuilder(this.account, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET
      })
        .addOperation(Operation.payment({
          destination: process.env.DONATION_ACCOUNT || '',
          asset: Asset.native(), // Using XLM for now
          amount: amount
        }))
        // Add category and region as transaction memo
        .addMemo(Memo.text(`${category}:${region}`))
        .setTimeout(30)
        .build();

      // Sign with Freighter
      const signedXDR = await window.freighter.signTransaction(
        transaction.toXDR(),
        Networks.TESTNET
      );

      // Submit the transaction
      const result = await this.server.submitTransaction(
        TransactionBuilder.fromXDR(signedXDR, Networks.TESTNET)
      );

      return result;
    } catch (error) {
      console.error('Donation error:', error);
      throw new Error('Failed to process donation: ' + error.message);
    }
  }

  async createMultiSigDonation(
    recipient: string,
    amount: string,
    purpose: string
  ): Promise<any> {
    if (!this.publicKey || !this.account) {
      throw new Error('Wallet not connected');
    }

    try {
      // Create a claimable balance that requires multiple signatures
      const transaction = new TransactionBuilder(this.account, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET
      })
        .addOperation(Operation.createClaimableBalance({
          asset: Asset.native(),
          amount: amount,
          claimants: [
            {
              destination: recipient,
              predicate: Claimant.predicateBeforeRelativeTime('86400') // 24 hours
            },
            {
              destination: this.publicKey,
              predicate: Claimant.predicateNot(
                Claimant.predicateBeforeRelativeTime('86400')
              )
            }
          ]
        }))
        .addMemo(Memo.text(purpose))
        .setTimeout(30)
        .build();

      const signedXDR = await window.freighter.signTransaction(
        transaction.toXDR(),
        Networks.TESTNET
      );

      return await this.server.submitTransaction(
        TransactionBuilder.fromXDR(signedXDR, Networks.TESTNET)
      );
    } catch (error) {
      console.error('Create multi-sig donation error:', error);
      throw new Error('Failed to create multi-signature donation');
    }
  }

  async getBalance(): Promise<string> {
    if (!this.publicKey) {
      throw new Error('Wallet not connected');
    }

    try {
      const account = await this.server.loadAccount(this.publicKey);
      const balance = account.balances.find(b => b.asset_type === 'native');
      return balance ? balance.balance : '0';
    } catch (error) {
      console.error('Get balance error:', error);
      throw new Error('Failed to fetch balance');
    }
  }

  async createAidToken(
    code: string,
    amount: string,
    recipient: string
  ): Promise<any> {
    if (!this.publicKey || !this.account) {
      throw new Error('Wallet not connected');
    }

    try {
      // Create a new asset
      const aidAsset = new Asset(code, this.publicKey);

      // Create transaction to issue the asset
      const transaction = new TransactionBuilder(this.account, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET
      })
        // Create trust line for recipient
        .addOperation(Operation.changeTrust({
          source: recipient,
          asset: aidAsset
        }))
        // Issue the asset to recipient
        .addOperation(Operation.payment({
          destination: recipient,
          asset: aidAsset,
          amount: amount
        }))
        .setTimeout(30)
        .build();

      const signedXDR = await window.freighter.signTransaction(
        transaction.toXDR(),
        Networks.TESTNET
      );

      return await this.server.submitTransaction(
        TransactionBuilder.fromXDR(signedXDR, Networks.TESTNET)
      );
    } catch (error) {
      console.error('Create aid token error:', error);
      throw new Error('Failed to create aid token');
    }
  }

  async streamTransactions(callback: (tx: any) => void) {
    if (!this.publicKey) {
      throw new Error('Wallet not connected');
    }

    try {
      // Stream transactions for the connected account
      this.server
        .transactions()
        .forAccount(this.publicKey)
        .cursor('now')
        .stream({
          onmessage: (tx) => callback(tx)
        });
    } catch (error) {
      console.error('Transaction streaming error:', error);
      throw new Error('Failed to stream transactions');
    }
  }

  isConnected(): boolean {
    return !!this.publicKey;
  }

  getCurrentAccount(): string | null {
    return this.publicKey;
  }
}