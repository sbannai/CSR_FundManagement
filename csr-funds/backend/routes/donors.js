const express = require('express');
const router  = express.Router();
const { Donor, Communication } = require('../models/index');
const { authenticate, requireRole } = require('../middleware/auth');
const { upload } = require('../config/multer');
const { sendEmail, templates } = require('../utils/email');

// GET /api/donors
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (search) filter.$or = [
      { companyName: new RegExp(search, 'i') },
      { contactPerson: new RegExp(search, 'i') },
      { email: new RegExp(search, 'i') },
    ];
    // Donor role can only see their own
    if (req.user.role === 'donor') filter._id = req.user.donorId;

    const donors = await Donor.find(filter).populate('createdBy','name').sort('-createdAt');
    res.json({ data: donors });
  } catch (err) { next(err); }
});

// GET /api/donors/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const donor = await Donor.findById(req.params.id).populate('createdBy','name');
    if (!donor) return res.status(404).json({ error: 'Donor not found' });
    if (req.user.role === 'donor' && String(req.user.donorId) !== req.params.id)
      return res.status(403).json({ error: 'Access denied' });
    res.json({ data: donor });
  } catch (err) { next(err); }
});

// POST /api/donors
router.post('/', authenticate, requireRole('admin','csr_coordinator'), async (req, res, next) => {
  try {
    const donor = await Donor.create({ ...req.body, createdBy: req.user._id });
    // Welcome email
    try {
      const tmpl = templates.donorOnboarded(donor);
      await sendEmail({ to: donor.email, ...tmpl });
      await Communication.create({ type:'email', subject: tmpl.subject, recipients:[donor.email], donorId: donor._id, sentBy: req.user._id });
    } catch (e) { console.error('Email error:', e.message); }
    res.status(201).json({ message: 'Donor created', data: donor });
  } catch (err) { next(err); }
});

// PUT /api/donors/:id
router.put('/:id', authenticate, requireRole('admin','csr_coordinator'), async (req, res, next) => {
  try {
    const donor = await Donor.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!donor) return res.status(404).json({ error: 'Donor not found' });
    res.json({ message: 'Donor updated', data: donor });
  } catch (err) { next(err); }
});

// DELETE /api/donors/:id (admin only)
router.delete('/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    await Donor.findByIdAndDelete(req.params.id);
    res.json({ message: 'Donor deleted' });
  } catch (err) { next(err); }
});

// POST /api/donors/:id/documents - upload document
router.post('/:id/documents', authenticate, requireRole('admin','csr_coordinator'), upload.single('file'), async (req, res, next) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const donor = await Donor.findById(req.params.id);
    if (!donor) return res.status(404).json({ error: 'Donor not found' });
    donor.documents.push({ name: req.file.originalname, path: req.file.path.replace(/\\/g,'/'), uploadedAt: new Date() });
    await donor.save();
    res.json({ message: 'Document uploaded' });
  } catch (err) { next(err); }
});

// POST /api/donors/:id/email - send manual email
router.post('/:id/email', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const donor = await Donor.findById(req.params.id);
    if (!donor) return res.status(404).json({ error: 'Donor not found' });
    const { subject, html } = req.body;
    const result = await sendEmail({ to: donor.email, subject, html });
    const status = result.messageId === 'mock' ? 'mock' : 'sent';
    await Communication.create({ type:'email', subject, body: html, recipients:[donor.email], donorId: donor._id, sentBy: req.user._id, status });
    res.json({ message: 'Email sent' });
  } catch (err) { next(err); }
});

module.exports = router;
