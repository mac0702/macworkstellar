import { AidToken } from './core/aid-delivery/tokens/AidToken';
import { DistributionManager } from './core/aid-delivery/distribution/DistributionManager';
import { AidMarketplace } from './core/marketplace/AidMarketplace';
import { ImpactTracker } from './core/impact/ImpactTracker';
import { PredictiveAnalytics } from './core/analytics/PredictiveAnalytics';

async function main() {
  console.log('Starting AidLink system...');

  // Initialize core components
  const marketplace = new AidMarketplace();
  const impactTracker = new ImpactTracker();
  const analytics = new PredictiveAnalytics();
  
  const distributionManager = new DistributionManager({
    batchSize: 100,
    distributionInterval: 3600, // 1 hour in seconds
    priorityCategories: ['food', 'medical', 'shelter']
  });

  // Example: Create and validate an aid token
  const token = new AidToken({
    issuer: 'example_issuer',
    recipient: 'example_recipient',
    amount: 1000,
    restrictions: {
      geographicBounds: {
        lat: 0,
        long: 0,
        radius: 100 // kilometers
      },
      expiryDate: new Date('2024-12-31'),
      usageCategories: ['food', 'medical']
    }
  });

  // Example: Register a vendor
  await marketplace.registerVendor({
    id: 'vendor1',
    name: 'Local Food Supplier',
    location: {
      lat: 0.1,
      long: 0.1
    },
    categories: ['food'],
    rating: 4.5
  });

  // Example: Find eligible vendors for the token
  const eligibleVendors = await marketplace.findEligibleVendors(token);
  console.log('Eligible vendors:', eligibleVendors);

  console.log('AidLink system is ready!');
}

main().catch(console.error);