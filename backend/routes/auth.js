const express = require('express');
const router = express.Router();
const ethers = require('ethers');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

// Generate nonce for wallet signing
router.get('/nonce', async (req, res) => {
  try {
    const nonce = ethers.utils.randomBytes(32).toString('hex');
    res.json({ nonce });
  } catch (error) {
    res.status(500).json({ error: 'Error generating nonce' });
  }
});

// Verify wallet signature and authenticate
router.post('/verify-signature', async (req, res) => {
  try {
    const { signature, message, address } = req.body;

    // Verify the signature
    const signerAddr = ethers.utils.verifyMessage(message, signature);
    
    if (signerAddr.toLowerCase() !== address.toLowerCase()) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Find or create user
    let user = await User.findOne({ walletAddress: address.toLowerCase() });
    
    if (!user) {
      user = new User({
        walletAddress: address.toLowerCase(),
        nonce: ethers.utils.randomBytes(32).toString('hex'),
        email: `${address.toLowerCase()}@placeholder.com`,
        name: `User-${address.slice(2, 8)}`
      });
      await user.save();
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, walletAddress: user.walletAddress },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        walletAddress: user.walletAddress,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Update user profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (name) user.name = name;
    if (email) user.email = email;

    await user.save();

    res.json({
      user: {
        id: user._id,
        walletAddress: user.walletAddress,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Error updating profile' });
  }
});

module.exports = router;