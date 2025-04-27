import { Contract, Operation } from 'stellar-sdk';

interface Bounds {
  lat: number;
  long: number;
  radius: number;
}

interface AidTokenParams {
  issuer: string;
  recipient: string;
  amount: number;
  bounds?: Bounds;
  expiry?: Date;
  categories?: string[];
}

/**
 * AidToken - Programmable aid unit with compliance parameters
 */
export class AidToken {
  private params: AidTokenParams;

  constructor(params: AidTokenParams) {
    this.params = params;
  }

  async validateUsage(location?: Bounds, category?: string): Promise<boolean> {
    if (location && this.params.bounds) {
      if (this.getDistance(location, this.params.bounds) > this.params.bounds.radius) {
        return false;
      }
    }

    if (category && this.params.categories?.length) {
      if (!this.params.categories.includes(category)) {
        return false;
      }
    }

    if (this.params.expiry && new Date() > this.params.expiry) {
      return false;
    }

    return true;
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
}