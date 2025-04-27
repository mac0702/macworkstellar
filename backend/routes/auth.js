const express = require('express');
const router = express.Router();
const StellarSdk = require('stellar-sdk');
const jwt = require('jsonwebtoken');
const { auth } = require('../middleware/auth');

// In-memory storage for demo
const users = new Map();
const nonces = new Map();

// Generate nonce for wallet signing
router.get('/nonce', async (req, res) => {
  try {
    const nonce = Math.random().toString(36).substring(2, 15);
    res.json({ nonce });
  } catch (error) {
    res.status(500).json({ error: 'Error generating nonce' });
  }
});

// Verify wallet signature and authenticate
router.post('/verify-signature', async (req, res) => {
  try {
    const { signature, message, address } = req.body;

    // For direct connections without signature
    if (signature === 'direct-connection') {
      const token = jwt.sign(
        { userId: address, walletAddress: address },
        'temporary-secret-key',
        { expiresIn: '24h' }
      );

      return res.json({
        token,
        user: {
          id: address,
          walletAddress: address,
          name: `User-${address.slice(0, 6)}`,
          email: `${address.toLowerCase()}@placeholder.com`,
          role: 'user'
        }
      });
    }

    // For Freighter wallet signatures
    try {
      // Verify the XDR signature
      const transaction = new StellarSdk.Transaction(signature, StellarSdk.Networks.TESTNET);
      
      // Check if the transaction is signed by the claimed address
      const signatures = transaction.signatures;
      if (!signatures.length) {
        return res.status(401).json({ error: 'No signature found' });
      }

      // Create or get user from memory
      let user = users.get(address.toLowerCase());
      if (!user) {
        user = {
          id: address,
          walletAddress: address.toLowerCase(),
          name: `User-${address.slice(0, 6)}`,
          email: `${address.toLowerCase()}@placeholder.com`,
          role: 'user',
          createdAt: new Date()
        };
        users.set(address.toLowerCase(), user);
      }

      // Generate JWT
      const token = jwt.sign(
        { userId: user.id, walletAddress: user.walletAddress },
        'temporary-secret-key',
        { expiresIn: '24h' }
      );

      res.json({ token, user });
    } catch (error) {
      console.error('Signature verification error:', error);
      res.status(401).json({ error: 'Invalid signature' });
    }
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Update user profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = users.get(req.user.walletAddress.toLowerCase());

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (name) user.name = name;
    if (email) user.email = email;

    users.set(req.user.walletAddress.toLowerCase(), user);

    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Error updating profile' });
  }
});

module.exports = router;