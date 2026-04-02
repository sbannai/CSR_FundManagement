const express = require('express');
const router  = express.Router();
const { Branch } = require('../models/index');
const { authenticate, requireRole } = require('../middleware/auth');

// GET /api/branches
router.get('/', authenticate, async (req, res, next) => {
  try {
    const branches = await Branch.find().sort('name');
    res.json({ data: branches });
  } catch (err) { next(err); }
});

// GET /api/branches/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const branch = await Branch.findById(req.params.id);
    if (!branch) return res.status(404).json({ error: 'Branch not found' });
    res.json({ data: branch });
  } catch (err) { next(err); }
});

// POST /api/branches
router.post('/', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const branch = await Branch.create(req.body);
    res.status(201).json({ message: 'Branch created', data: branch });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Branch code already exists' });
    next(err);
  }
});

// PUT /api/branches/:id
router.put('/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const branch = await Branch.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!branch) return res.status(404).json({ error: 'Branch not found' });
    res.json({ message: 'Branch updated', data: branch });
  } catch (err) { next(err); }
});

// DELETE /api/branches/:id
router.delete('/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    await Branch.findByIdAndDelete(req.params.id);
    res.json({ message: 'Branch deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
