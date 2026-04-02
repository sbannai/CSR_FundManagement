const express = require('express');
const router  = express.Router();
const { Allocation, Proposal, Branch, Communication } = require('../models/index');
const { authenticate, requireRole } = require('../middleware/auth');
const { sendEmail, templates } = require('../utils/email');

// GET /api/allocations
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { proposalId, branchId, status } = req.query;
    const filter = {};
    if (proposalId) filter.proposalId = proposalId;
    if (status)     filter.status     = status;

    // Branch user only sees their allocations
    if (req.user.role === 'branch_user') {
      filter.branchId = req.user.branchId;
    } else if (branchId) {
      filter.branchId = branchId;
    }

    // Donor only sees allocations linked to their proposals
    if (req.user.role === 'donor') {
      filter.donorId = req.user.donorId;
    }

    const allocations = await Allocation.find(filter)
      .populate('proposalId', 'title status fiscalYear')
      .populate('donorId', 'companyName')
      .populate('branchId', 'name code city')
      .populate('allocatedBy', 'name')
      .sort('-createdAt');
    res.json({ data: allocations });
  } catch (err) { next(err); }
});

// GET /api/allocations/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const alloc = await Allocation.findById(req.params.id)
      .populate('proposalId')
      .populate('donorId', 'companyName contactPerson email')
      .populate('branchId', 'name code city email')
      .populate('allocatedBy', 'name');
    if (!alloc) return res.status(404).json({ error: 'Allocation not found' });
    res.json({ data: alloc });
  } catch (err) { next(err); }
});

// POST /api/allocations - admin allocates to branch
router.post('/', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { proposalId, branchId, amount, purpose, deadline, notes } = req.body;

    const proposal = await Proposal.findById(proposalId);
    if (!proposal || !['approved','partially_approved'].includes(proposal.status))
      return res.status(400).json({ error: 'Proposal must be approved to allocate funds' });

    // Check existing allocations don't exceed approved amount
    const existing = await Allocation.aggregate([
      { $match: { proposalId: proposal._id } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const allocated = existing[0]?.total || 0;
    if (allocated + amount > proposal.approvedAmount)
      return res.status(400).json({ error: `Allocation exceeds approved amount. Remaining: ₹${(proposal.approvedAmount - allocated).toLocaleString('en-IN')}` });

    const alloc = await Allocation.create({
      proposalId, branchId, amount, purpose, deadline, notes,
      donorId: proposal.donorId,
      allocatedBy: req.user._id,
    });

    // Email branch
    try {
      const branch = await Branch.findById(branchId);
      if (branch?.email) {
        const tmpl = templates.fundAllocated(alloc, branch);
        await sendEmail({ to: branch.email, ...tmpl });
      }
    } catch(e) { /* non-fatal */ }

    res.status(201).json({ message: 'Funds allocated', data: alloc });
  } catch (err) { next(err); }
});

// PUT /api/allocations/:id
router.put('/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const alloc = await Allocation.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!alloc) return res.status(404).json({ error: 'Allocation not found' });
    res.json({ message: 'Allocation updated', data: alloc });
  } catch (err) { next(err); }
});

// PATCH /api/allocations/:id/status
router.patch('/:id/status', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const alloc = await Allocation.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    res.json({ message: 'Status updated', data: alloc });
  } catch (err) { next(err); }
});

module.exports = router;
