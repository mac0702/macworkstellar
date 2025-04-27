# Stellar Integration Knowledge

## Overview
This project uses Stellar's blockchain for aid token issuance and distribution. Key features:
- Custom assets for aid tokens
- Multi-signature accounts for secure distribution
- Claimable balances for time-locked aid
- Built-in DEX for token exchange
- Low transaction fees
- Fast settlement

## Key Components

### Wallet Integration
- Uses Freighter wallet (Stellar's MetaMask equivalent)
- Required for all transactions
- TestNet configuration

### Asset Management
- Custom assets represent aid tokens
- Requires trust lines between accounts
- Asset code format: max 12 characters
- Issuer account must be funded

### Multi-Signature
- Used for secure aid distribution
- Configurable thresholds
- Time-locked using claimable balances

### Transaction Memos
- Used to store metadata
- Format: `category:region` for donations

## Important Links
- [Stellar Docs](https://developers.stellar.org/docs)
- [Freighter Wallet](https://www.freighter.app/)
- [Stellar Laboratory](https://laboratory.stellar.org/)
- [TestNet Info](https://developers.stellar.org/docs/fundamentals-and-concepts/testnet-and-pubnet)

## Best Practices
- Always test on TestNet first
- Use meaningful asset codes
- Include transaction memos for tracking
- Handle trust line errors
- Check account funding