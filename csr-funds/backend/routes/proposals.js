const express = require('express');
const router  = express.Router();
const { Proposal, Donor, Communication } = require('../models/index');
const { authenticate, requireRole } = require('../middleware/auth');
const { upload } = require('../config/multer');
const { sendEmail, templates } = require('../utils/email');

// GET /api/proposals
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { status, donorId, fiscalYear } = req.query;
    const filter = {};
    if (status)     filter.status     = status;
    if (fiscalYear) filter.fiscalYear = fiscalYear;

    // Donor can only see their own proposals
    if (req.user.role === 'donor') {
      filter.donorId = req.user.donorId;
    } else if (donorId) {
      filter.donorId = donorId;
    }
    // Branch user can only see proposals targeting their branch
    if (req.user.role === 'branch_user') {
      filter.targetBranches = req.user.branchId;
      filter.status = { $in: ['approved','partially_approved'] };
    }

    const proposals = await Proposal.find(filter)
      .populate('donorId', 'companyName contactPerson')
      .populate('targetBranches', 'name code')
      .populate('createdBy', 'name')
      .populate('reviewedBy', 'name')
      .sort('-createdAt');
    res.json({ data: proposals });
  } catch (err) { next(err); }
});

// GET /api/proposals/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const proposal = await Proposal.findById(req.params.id)
      .populate('donorId', 'companyName contactPerson email')
      .populate('targetBranches', 'name code city')
      .populate('createdBy', 'name')
      .populate('reviewedBy', 'name');
    if (!proposal) return res.status(404).json({ error: 'Proposal not found' });
    res.json({ data: proposal });
  } catch (err) { next(err); }
});

// POST /api/proposals
router.post('/', authenticate, requireRole('admin','csr_coordinator'), async (req, res, next) => {
  try {
    const proposal = await Proposal.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ message: 'Proposal created', data: proposal });
  } catch (err) { next(err); }
});

// PUT /api/proposals/:id
router.put('/:id', authenticate, requireRole('admin','csr_coordinator'), async (req, res, next) => {
  try {
    const { status, approvedAmount, rejectionReason, ...updateData } = req.body;
    // Only allow direct field updates here; status changes use dedicated endpoints
    const proposal = await Proposal.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!proposal) return res.status(404).json({ error: 'Proposal not found' });
    res.json({ message: 'Proposal updated', data: proposal });
  } catch (err) { next(err); }
});

// PATCH /api/proposals/:id/submit
router.patch('/:id/submit', authenticate, requireRole('admin','csr_coordinator'), async (req, res, next) => {
  try {
    const proposal = await Proposal.findById(req.params.id).populate('donorId');
    if (!proposal) return res.status(404).json({ error: 'Not found' });
    if (!['draft'].includes(proposal.status)) return res.status(400).json({ error: 'Only draft proposals can be submitted' });

    proposal.status = 'submitted';
    proposal.submittedAt = new Date();
    await proposal.save();

    // Notify admin via email
    const admins = await require('../models/User').find({ role: 'admin' }).select('email');
    for (const a of admins) {
      try {
        const tmpl = templates.proposalSubmitted(proposal, proposal.donorId);
        await sendEmail({ to: a.email, ...tmpl });
      } catch(e) { /* non-fatal */ }
    }
    res.json({ message: 'Proposal submitted for review', data: proposal });
  } catch (err) { next(err); }
});

// PATCH /api/proposals/:id/approve
router.patch('/:id/approve', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { approvedAmount, notes } = req.body;
    const proposal = await Proposal.findById(req.params.id).populate('donorId');
    if (!proposal) return res.status(404).json({ error: 'Not found' });
    if (!['submitted','under_review'].includes(proposal.status))
      return res.status(400).json({ error: 'Proposal cannot be approved in current state' });

    proposal.status = approvedAmount < proposal.requestedAmount ? 'partially_approved' : 'approved';
    proposal.approvedAmount = approvedAmount || proposal.requestedAmount;
    proposal.reviewedAt = new Date();
    proposal.reviewedBy = req.user._id;
    if (notes) proposal.notes = notes;
    await proposal.save();

    // Notify donor
    try {
      const tmpl = templates.proposalApproved(proposal, proposal.donorId);
      await sendEmail({ to: proposal.donorId.email, ...tmpl });
      await Communication.create({ type:'email', subject: tmpl.subject, recipients:[proposal.donorId.email], donorId: proposal.donorId._id, proposalId: proposal._id, sentBy: req.user._id });
    } catch(e) { console.error('Email error:', e.message); }

    res.json({ message: 'Proposal approved', data: proposal });
  } catch (err) { next(err); }
});

// PATCH /api/proposals/:id/reject
router.patch('/:id/reject', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { reason } = req.body;
    const proposal = await Proposal.findById(req.params.id).populate('donorId');
    if (!proposal) return res.status(404).json({ error: 'Not found' });

    proposal.status = 'rejected';
    proposal.rejectionReason = reason;
    proposal.reviewedAt = new Date();
    proposal.reviewedBy = req.user._id;
    await proposal.save();

    try {
      const tmpl = templates.proposalRejected(proposal, proposal.donorId, reason);
      await sendEmail({ to: proposal.donorId.email, ...tmpl });
    } catch(e) { /* non-fatal */ }

    res.json({ message: 'Proposal rejected', data: proposal });
  } catch (err) { next(err); }
});

// POST /api/proposals/:id/documents
router.post('/:id/documents', authenticate, requireRole('admin','csr_coordinator'), upload.single('file'), async (req, res, next) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const proposal = await Proposal.findById(req.params.id);
    if (!proposal) return res.status(404).json({ error: 'Proposal not found' });
    proposal.documents.push({ name: req.file.originalname, path: req.file.path.replace(/\\/g,'/'), uploadedAt: new Date() });
    await proposal.save();
    res.json({ message: 'Document uploaded' });
  } catch (err) { next(err); }
});

module.exports = router;
