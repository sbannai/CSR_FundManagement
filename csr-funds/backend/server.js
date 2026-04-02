require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const rateLimit = require('express-rate-limit');
const path      = require('path');
const connectDB = require('./config/db');

const app = express();

// ── Security ─────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin:  process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['GET','POST','PUT','DELETE','PATCH','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true,
}));
app.use(rateLimit({ windowMs: 15*60*1000, max: 300, message: { error: 'Too many requests' } }));
app.use('/api/auth/login', rateLimit({ windowMs: 15*60*1000, max: 20, message: { error: 'Too many login attempts' } }));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files
app.use('/uploads', express.static(path.resolve(process.env.UPLOAD_DIR || './uploads')));

// ── Logger ───────────────────────────────────────────────────
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'test')
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ── Routes ───────────────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/donors',        require('./routes/donors'));
app.use('/api/branches',      require('./routes/branches'));
app.use('/api/proposals',     require('./routes/proposals'));
app.use('/api/allocations',   require('./routes/allocations'));
app.use('/api/utilizations',  require('./routes/utilizations'));
app.use('/api/reports',       require('./routes/reports'));

app.get('/api/health', (req, res) => res.json({ status: 'OK', time: new Date().toISOString() }));
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// ── Global Error Handler ─────────────────────────────────────
app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: `File too large (max ${process.env.MAX_FILE_SIZE_MB||20} MB)` });
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

// ── Seed initial admin if DB is empty ────────────────────────
async function seedAdmin() {
  const User = require('./models/User');
  const count = await User.countDocuments();
  if (count === 0) {
    await User.create({ name: 'Super Admin', email: 'admin@school.edu', password: 'Admin@123', role: 'admin' });
    console.log('✅ Seeded default admin: admin@school.edu / Admin@123');
  }
}

// ── Start ────────────────────────────────────────────────────
connectDB().then(async () => {
  await seedAdmin();
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`🚀 CSR Funds API on port ${PORT}`));
});

module.exports = app;
