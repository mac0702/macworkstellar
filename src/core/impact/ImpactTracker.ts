import { MarketplaceTransaction } from '../marketplace/AidMarketplace';

interface ImpactMetrics {
  totalAidDistributed: number;
  beneficiariesReached: number;
  categoryCoverage: Map<string, number>;
  geographicCoverage: {
    regions: Map<string, number>;
    totalArea: number;
  };
  vendorParticipation: {
    total: number;
    active: number;
  };
}

interface ImpactEvent {
  type: 'distribution' | 'usage' | 'outcome';
  data: any;
  timestamp: Date;
}

/**
 * ImpactTracker measures and analyzes the effectiveness of aid distribution
 * through various metrics and indicators.
 */
export class ImpactTracker {
  private events: ImpactEvent[];
  private currentMetrics: ImpactMetrics;

  constructor() {
    this.events = [];
    this.currentMetrics = this.initializeMetrics();
  }

  /**
   * Records a new impact event
   */
  public async recordEvent(event: ImpactEvent): Promise<void> {
    this.events.push({
      ...event,
      timestamp: new Date()
    });
    await this.updateMetrics(event);
  }

  /**
   * Processes marketplace transactions to update impact metrics
   */
  public async processTransactions(transactions: MarketplaceTransaction[]): Promise<void> {
    for (const transaction of transactions) {
      await this.recordEvent({
        type: 'usage',
        data: transaction,
        timestamp: transaction.timestamp
      });
    }
  }

  /**
   * Gets current impact metrics
   */
  public getMetrics(): ImpactMetrics {
    return this.currentMetrics;
  }

  /**
   * Generates an impact report for a specific time period
   */
  public async generateReport(startDate: Date, endDate: Date): Promise<ImpactMetrics> {
    const relevantEvents = this.events.filter(
      event => event.timestamp >= startDate && event.timestamp <= endDate
    );

    const metrics = this.initializeMetrics();
    for (const event of relevantEvents) {
      await this.updateMetricsForReport(metrics, event);
    }

    return metrics;
  }

  private initializeMetrics(): ImpactMetrics {
    return {
      totalAidDistributed: 0,
      beneficiariesReached: 0,
      categoryCoverage: new Map(),
      geographicCoverage: {
        regions: new Map(),
        totalArea: 0
      },
      vendorParticipation: {
        total: 0,
        active: 0
      }
    };
  }

  private async updateMetrics(event: ImpactEvent): Promise<void> {
    // Update metrics based on event type
    switch (event.type) {
      case 'distribution':
        this.currentMetrics.totalAidDistributed += event.data.amount;
        this.currentMetrics.beneficiariesReached += 1;
        break;
      case 'usage':
        const transaction = event.data as MarketplaceTransaction;
        this.updateCategoryCoverage(transaction.category, transaction.amount);
        break;
      case 'outcome':
        // Process outcome data
        break;
    }
  }

  private async updateMetricsForReport(metrics: ImpactMetrics, event: ImpactEvent): Promise<void> {
    // Similar to updateMetrics but for report generation
    await this.updateMetrics(event);
  }

  private updateCategoryCoverage(category: string, amount: number): void {
    const current = this.currentMetrics.categoryCoverage.get(category) || 0;
    this.currentMetrics.categoryCoverage.set(category, current + amount);
  }
}