const express = require('express');
const cors = require('cors');
const ethers = require('ethers');
const jwt = require('jsonwebtoken');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage for demo (replace with DB in production)
const users = new Map();
const nonces = new Map();

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Generate nonce
app.get('/api/auth/nonce', (req, res) => {
  try {
    const nonce = ethers.utils.randomBytes(32).toString('hex');
    res.json({ nonce });
  } catch (error) {
    console.error('Error generating nonce:', error);
    res.status(500).json({ error: 'Error generating nonce' });
  }
});

// Verify signature
app.post('/api/auth/verify-signature', (req, res) => {
  try {
    const { address, message, signature } = req.body;

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
          name: `User-${address.slice(2, 8)}`,
          email: `${address.toLowerCase()}@placeholder.com`,
          role: 'user'
        }
      });
    }

    // Verify the signature
    const signerAddr = ethers.utils.verifyMessage(message, signature);
    
    if (signerAddr.toLowerCase() !== address.toLowerCase()) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: address, walletAddress: address },
      'temporary-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: address,
        walletAddress: address,
        name: `User-${address.slice(2, 8)}`,
        email: `${address.toLowerCase()}@placeholder.com`,
        role: 'user'
      }
    });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});