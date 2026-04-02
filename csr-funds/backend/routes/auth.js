const express = require('express');
const jwt     = require('jsonwebtoken');
const router  = express.Router();
const User    = require('../models/User');
const { authenticate, requireRole } = require('../middleware/auth');

const sign = (id) => jwt.sign({ id }, process.env.JWT_SECRET || 'dev_secret', { expiresIn: process.env.JWT_EXPIRES_IN || '8h' });

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = await User.findOne({ email: email.toLowerCase(), isActive: true })
      .populate('branchId', 'name code')
      .populate('donorId', 'companyName');
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await user.matchPassword(password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });
    res.json({ token: sign(user._id), user: { id: user._id, name: user.name, email: user.email, role: user.role, branchId: user.branchId, donorId: user.donorId } });
  } catch (err) { next(err); }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  const user = await User.findById(req.user._id).select('-password').populate('branchId','name code').populate('donorId','companyName');
  res.json({ user });
});

// POST /api/auth/users (admin only)
router.post('/users', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { name, email, password, role, branchId, donorId } = req.body;
    if (!name || !email || !password || !role) return res.status(400).json({ error: 'name, email, password, role required' });
    const user = await User.create({ name, email, password, role, branchId: branchId || undefined, donorId: donorId || undefined });
    res.status(201).json({ message: 'User created', id: user._id });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Email already exists' });
    next(err);
  }
});

// GET /api/auth/users
router.get('/users', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const users = await User.find().select('-password').populate('branchId','name').populate('donorId','companyName').sort('name');
    res.json({ data: users });
  } catch (err) { next(err); }
});

// PUT /api/auth/users/:id
router.put('/users/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { name, role, branchId, donorId, isActive } = req.body;
    await User.findByIdAndUpdate(req.params.id, { name, role, branchId: branchId||undefined, donorId: donorId||undefined, isActive });
    res.json({ message: 'User updated' });
  } catch (err) { next(err); }
});

// PUT /api/auth/password
router.put('/password', authenticate, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
    const ok = await user.matchPassword(currentPassword);
    if (!ok) return res.status(401).json({ error: 'Current password incorrect' });
    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password changed' });
  } catch (err) { next(err); }
});

module.exports = router;
