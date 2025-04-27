import { EnhancedAidToken } from '../tokens/EnhancedAidToken';

interface IssuanceParty {
  id: string;
  name: string;
  role: 'ngo' | 'government' | 'donor';
  contributionAmount: number;
  approvalRequired: boolean;
}

interface IssuancePolicy {
  minRequiredApprovals: number;
  maxIssuanceAmount: number;
  allowedCategories: string[];
  geographicRestrictions?: {
    allowedRegions: Array<{
      name: string;
      bounds: {
        lat: number;
        long: number;
        radius: number;
      };
    }>;
  };
}

interface IssuanceProposal {
  id: string;
  parties: IssuanceParty[];
  policy: IssuancePolicy;
  status: 'pending' | 'approved' | 'rejected' | 'executed';
  approvals: Set<string>;  // Party IDs that have approved
  totalAmount: number;
  createdAt: Date;
  expiresAt: Date;
}

/**
 * MultiPartyIssuance manages the collaborative creation of aid tokens
 * between multiple organizations, ensuring consensus and compliance.
 */
export class MultiPartyIssuance {
  private proposals: Map<string, IssuanceProposal>;
  private parties: Map<string, IssuanceParty>;

  constructor() {
    this.proposals = new Map();
    this.parties = new Map();
  }

  /**
   * Registers a new party that can participate in token issuance
   */
  public async registerParty(party: IssuanceParty): Promise<void> {
    if (this.parties.has(party.id)) {
      throw new Error('Party already registered');
    }
    this.parties.set(party.id, party);
  }

  /**
   * Creates a new issuance proposal
   */
  public async createProposal(
    initiatorId: string,
    parties: string[],
    policy: IssuancePolicy,
    totalAmount: number
  ): Promise<IssuanceProposal> {
    // Validate initiator
    if (!this.parties.has(initiatorId)) {
      throw new Error('Initiator not registered');
    }

    // Validate all parties exist
    for (const partyId of parties) {
      if (!this.parties.has(partyId)) {
        throw new Error(`Party ${partyId} not registered`);
      }
    }

    const proposal: IssuanceProposal = {
      id: this.generateProposalId(),
      parties: parties.map(id => this.parties.get(id)!),
      policy,
      status: 'pending',
      approvals: new Set([initiatorId]),  // Initiator automatically approves
      totalAmount,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)  // 7 days expiry
    };

    this.proposals.set(proposal.id, proposal);
    return proposal;
  }

  /**
   * Approves an issuance proposal
   */
  public async approveProposal(proposalId: string, partyId: string): Promise<void> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error('Proposal not found');
    }

    if (proposal.status !== 'pending') {
      throw new Error('Proposal is no longer pending');
    }

    if (!proposal.parties.find(p => p.id === partyId)) {
      throw new Error('Party not involved in proposal');
    }

    proposal.approvals.add(partyId);

    // Check if we have enough approvals
    if (proposal.approvals.size >= proposal.policy.minRequiredApprovals) {
      proposal.status = 'approved';
    }
  }

  /**
   * Executes an approved proposal and issues the tokens
   */
  public async executeProposal(proposalId: string): Promise<EnhancedAidToken[]> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error('Proposal not found');
    }

    if (proposal.status !== 'approved') {
      throw new Error('Proposal is not approved');
    }

    // Create tokens based on the proposal
    const tokens: EnhancedAidToken[] = [];
    // Implementation would create actual tokens here
    
    proposal.status = 'executed';
    return tokens;
  }

  private generateProposalId(): string {
    return `PROP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}