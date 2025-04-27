const express = require('express');
const cors = require('cors');
const StellarSdk = require('stellar-sdk');
const jwt = require('jsonwebtoken');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Constants (would normally be in .env)
const JWT_SECRET = 'temporary-secret-key';
const DONATION_ACCOUNT = 'GCYEIQW6RCFTVMG4JWPQRS3KIGVTOSTGGM5QRJZC3SYL4RQKEEMTXK4F';

// Initialize Stellar SDK (TestNet)
const stellarServer = new StellarSdk.Server('https://horizon-testnet.stellar.org');
const networkPassphrase = StellarSdk.Networks.TESTNET;

// In-memory storage for demo (replace with DB in production)
const users = new Map();
const nonces = new Map();

// Routes
app.use('/api/auth', require('./routes/auth'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Get account info
app.get('/api/account/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const account = await stellarServer.loadAccount(address);
    res.json(account);
  } catch (error) {
    console.error('Error fetching account:', error);
    res.status(500).json({ error: 'Failed to fetch account info' });
  }
});

// Submit transaction
app.post('/api/transaction/submit', async (req, res) => {
  try {
    const { signedXDR } = req.body;
    const transaction = StellarSdk.TransactionBuilder.fromXDR(
      signedXDR,
      networkPassphrase
    );
    const result = await stellarServer.submitTransaction(transaction);
    res.json(result);
  } catch (error) {
    console.error('Transaction submission error:', error);
    res.status(500).json({ error: 'Failed to submit transaction' });
  }
});

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Using Stellar network: ${networkPassphrase}`);
}).on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.log(`Port ${PORT} is busy, trying port ${PORT + 1}...`);
    setTimeout(() => {
      server.close();
      server.listen(PORT + 1);
    }, 1000);
  }
});

// Handle process termination
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Closing server...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});