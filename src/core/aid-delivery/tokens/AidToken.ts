import { Asset, Operation, TransactionBuilder, Networks, Server } from 'stellar-sdk';

interface Bounds {
  lat: number;
  long: number;
  radius: number;
}

interface AidTokenParams {
  code: string;
  issuer: string;
  recipient: string;
  amount: string;
  bounds?: Bounds;
  expiry?: Date;
  categories?: string[];
}

/**
 * AidToken - Programmable aid unit using Stellar custom assets
 */
export class AidToken {
  private params: AidTokenParams;
  private asset: Asset;
  private server: Server;

  constructor(params: AidTokenParams) {
    this.params = params;
    this.asset = new Asset(params.code, params.issuer);
    this.server = new Server('https://horizon-testnet.stellar.org');
  }

  async issue(): Promise<any> {
    try {
      const account = await this.server.loadAccount(this.params.issuer);
      
      const transaction = new TransactionBuilder(account, {
        fee: await this.server.fetchBaseFee(),
        networkPassphrase: Networks.TESTNET
      })
        // Create trustline
        .addOperation(Operation.changeTrust({
          source: this.params.recipient,
          asset: this.asset
        }))
        // Issue the asset
        .addOperation(Operation.payment({
          destination: this.params.recipient,
          asset: this.asset,
          amount: this.params.amount
        }))
        .setTimeout(30)
        .build();

      return transaction;
    } catch (error) {
      console.error('Token issuance error:', error);
      throw new Error('Failed to issue aid token');
    }
  }

  async validateUsage(location?: Bounds, category?: string): Promise<boolean> {
    // Check geographic bounds
    if (location && this.params.bounds) {
      if (this.getDistance(location, this.params.bounds) > this.params.bounds.radius) {
        return false;
      }
    }

    // Check category restrictions
    if (category && this.params.categories?.length) {
      if (!this.params.categories.includes(category)) {
        return false;
      }
    }

    // Check expiry
    if (this.params.expiry && new Date() > this.params.expiry) {
      return false;
    }

    // Check if recipient has required trustline
    try {
      const account = await this.server.loadAccount(this.params.recipient);
      const hasBalance = account.balances.some(balance => 
        balance.asset_code === this.params.code && 
        balance.asset_issuer === this.params.issuer
      );
      return hasBalance;
    } catch (error) {
      console.error('Validation error:', error);
      return false;
    }
  }

  private getDistance(p1: Bounds, p2: Bounds): number {
    const R = 6371; // Earth radius (km)
    const dLat = this.toRad(p2.lat - p1.lat);
    const dLon = this.toRad(p2.long - p1.long);
    const lat1 = this.toRad(p1.lat);
    const lat2 = this.toRad(p2.lat);

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.sin(dLon/2) * Math.sin(dLon/2) * 
              Math.cos(lat1) * Math.cos(lat2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  private toRad(deg: number): number {
    return deg * Math.PI / 180;
  }

  getAsset(): Asset {
    return this.asset;
  }
}