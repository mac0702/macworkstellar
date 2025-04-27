import { Contract } from 'stellar-sdk';
import { createHash } from 'crypto';

interface ComplianceParameters {
  antiFungibility: {
    tokenId: string;  // Unique identifier
    transferRestrictions: 'none' | 'restricted' | 'locked';
    allowedTransferDestinations?: string[];  // List of allowed recipient addresses
  };
  geographicBounds?: {
    lat: number;
    long: number;
    radius: number;
    requiredPresenceInterval?: number;  // How often recipient must prove presence
  };
  timeConstraints: {
    expiryDate: Date;
    activationDate: Date;
    usageTimeWindow?: {
      start: number;  // Hour of day (0-23)
      end: number;    // Hour of day (0-23)
    };
  };
  purposeConstraints: {
    allowedCategories: string[];
    disallowedVendors?: string[];
    spendingLimits?: {
      daily?: number;
      weekly?: number;
      monthly?: number;
    };
  };
}

interface TokenMetadata {
  issuer: string;
  recipient: string;
  amount: number;
  issuanceDate: Date;
  lastTransferDate?: Date;
  transferCount: number;
  compliance: ComplianceParameters;
}

/**
 * EnhancedAidToken extends the basic AidToken with advanced compliance,
 * anti-fungibility protections, and usage constraints for more controlled
 * and effective aid distribution.
 */
export class EnhancedAidToken extends Contract {
  private metadata: TokenMetadata;
  private usageHistory: Map<string, number>;  // vendorId -> amount

  constructor(metadata: TokenMetadata) {
    super();
    this.metadata = {
      ...metadata,
      transferCount: 0,
      issuanceDate: new Date()
    };
    this.usageHistory = new Map();
  }

  /**
   * Validates if the token can be used in the given context
   */
  public async validateUsage(context: {
    location?: { lat: number; long: number };
    category: string;
    vendor: string;
    amount: number;
    timestamp: Date;
  }): Promise<{ isValid: boolean; reason?: string }> {
    // Anti-fungibility check
    if (this.metadata.compliance.antiFungibility.transferRestrictions === 'locked') {
      return { isValid: false, reason: 'Token is locked' };
    }

    // Geographic restriction check
    if (context.location && this.metadata.compliance.geographicBounds) {
      const distance = this.calculateDistance(
        context.location,
        this.metadata.compliance.geographicBounds
      );
      if (distance > this.metadata.compliance.geographicBounds.radius) {
        return { isValid: false, reason: 'Location out of bounds' };
      }
    }

    // Time window check
    const hour = context.timestamp.getHours();
    if (this.metadata.compliance.timeConstraints.usageTimeWindow) {
      const { start, end } = this.metadata.compliance.timeConstraints.usageTimeWindow;
      if (hour < start || hour >= end) {
        return { isValid: false, reason: 'Outside allowed time window' };
      }
    }

    // Category check
    if (!this.metadata.compliance.purposeConstraints.allowedCategories.includes(context.category)) {
      return { isValid: false, reason: 'Category not allowed' };
    }

    // Vendor check
    if (this.metadata.compliance.purposeConstraints.disallowedVendors?.includes(context.vendor)) {
      return { isValid: false, reason: 'Vendor not allowed' };
    }

    // Spending limit check
    if (this.metadata.compliance.purposeConstraints.spendingLimits) {
      const limits = this.metadata.compliance.purposeConstraints.spendingLimits;
      const currentDate = new Date();
      
      if (limits.daily) {
        const dailyTotal = this.calculateSpending('daily', currentDate);
        if (dailyTotal + context.amount > limits.daily) {
          return { isValid: false, reason: 'Daily spending limit exceeded' };
        }
      }

      // Add weekly and monthly checks similarly
    }

    return { isValid: true };
  }

  /**
   * Records a usage of the token
   */
  public async recordUsage(vendorId: string, amount: number): Promise<void> {
    const currentAmount = this.usageHistory.get(vendorId) || 0;
    this.usageHistory.set(vendorId, currentAmount + amount);
  }

  /**
   * Generates a unique fingerprint for the token
   */
  private generateTokenFingerprint(): string {
    const data = JSON.stringify({
      id: this.metadata.compliance.antiFungibility.tokenId,
      issuer: this.metadata.issuer,
      recipient: this.metadata.recipient,
      issuanceDate: this.metadata.issuanceDate
    });
    return createHash('sha256').update(data).digest('hex');
  }

  private calculateSpending(period: 'daily' | 'weekly' | 'monthly', currentDate: Date): number {
    let total = 0;
    const startTime = new Date(currentDate);
    
    switch (period) {
      case 'daily':
        startTime.setHours(0, 0, 0, 0);
        break;
      case 'weekly':
        startTime.setDate(currentDate.getDate() - currentDate.getDay());
        break;
      case 'monthly':
        startTime.setDate(1);
        break;
    }

    // Sum up all spending within the period
    this.usageHistory.forEach((amount, _) => {
      total += amount;
    });

    return total;
  }

  private calculateDistance(
    point1: { lat: number; long: number },
    point2: { lat: number; long: number }
  ): number {
    // Haversine formula implementation
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRad(point2.lat - point1.lat);
    const dLon = this.toRad(point2.long - point1.long);
    const lat1 = this.toRad(point1.lat);
    const lat2 = this.toRad(point2.lat);

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.sin(dLon/2) * Math.sin(dLon/2) * 
              Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * Math.PI / 180;
  }
}