import { AidToken } from '../aid-delivery/tokens/AidToken';

interface Vendor {
  id: string;
  name: string;
  location: {
    lat: number;
    long: number;
  };
  categories: string[];
  rating: number;
}

interface MarketplaceTransaction {
  tokenId: string;
  vendorId: string;
  amount: number;
  category: string;
  timestamp: Date;
}

/**
 * AidMarketplace manages the network of vendors and facilitates
 * aid token transactions in an efficient, transparent manner.
 */
export class AidMarketplace {
  private vendors: Map<string, Vendor>;
  private transactions: MarketplaceTransaction[];

  constructor() {
    this.vendors = new Map();
    this.transactions = [];
  }

  /**
   * Registers a new vendor in the marketplace
   */
  public async registerVendor(vendor: Vendor): Promise<void> {
    if (this.vendors.has(vendor.id)) {
      throw new Error('Vendor already registered');
    }
    this.vendors.set(vendor.id, vendor);
  }

  /**
   * Finds eligible vendors for a given aid token based on location and categories
   */
  public async findEligibleVendors(token: AidToken): Promise<Vendor[]> {
    const eligibleVendors: Vendor[] = [];
    
    for (const vendor of this.vendors.values()) {
      const isEligible = await token.validateUsage({
        location: vendor.location,
        category: vendor.categories[0] // TODO: Check all categories
      });

      if (isEligible) {
        eligibleVendors.push(vendor);
      }
    }

    // Sort by rating
    return eligibleVendors.sort((a, b) => b.rating - a.rating);
  }

  /**
   * Records a transaction between a token holder and vendor
   */
  public async recordTransaction(transaction: MarketplaceTransaction): Promise<void> {
    // Validate vendor exists
    if (!this.vendors.has(transaction.vendorId)) {
      throw new Error('Vendor not found');
    }

    this.transactions.push({
      ...transaction,
      timestamp: new Date()
    });
  }

  /**
   * Gets transaction history for analysis
   */
  public getTransactionHistory(
    filter?: {
      vendorId?: string;
      category?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): MarketplaceTransaction[] {
    let filtered = this.transactions;

    if (filter?.vendorId) {
      filtered = filtered.filter(t => t.vendorId === filter.vendorId);
    }
    if (filter?.category) {
      filtered = filtered.filter(t => t.category === filter.category);
    }
    if (filter?.startDate) {
      filtered = filtered.filter(t => t.timestamp >= filter.startDate!);
    }
    if (filter?.endDate) {
      filtered = filtered.filter(t => t.timestamp <= filter.endDate!);
    }

    return filtered;
  }
}