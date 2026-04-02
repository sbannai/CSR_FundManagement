const express = require('express');
const router  = express.Router();
const { Utilization, Allocation, Proposal, Communication } = require('../models/index');
const { authenticate, requireRole } = require('../middleware/auth');
const { upload } = require('../config/multer');
const { sendEmail, templates } = require('../utils/email');

// GET /api/utilizations
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { allocationId, branchId, status, donorId } = req.query;
    const filter = {};
    if (allocationId) filter.allocationId = allocationId;
    if (status)       filter.status       = status;

    if (req.user.role === 'branch_user') filter.branchId  = req.user.branchId;
    else if (branchId)                   filter.branchId  = branchId;

    if (req.user.role === 'donor')       filter.donorId = req.user.donorId;
    else if (donorId)                    filter.donorId = donorId;

    const utils = await Utilization.find(filter)
      .populate('allocationId', 'amount purpose deadline')
      .populate('proposalId', 'title fiscalYear')
      .populate('branchId', 'name code')
      .populate('donorId', 'companyName')
      .populate('submittedBy', 'name')
      .populate('verifiedBy', 'name')
      .sort('-createdAt');
    res.json({ data: utils });
  } catch (err) { next(err); }
});

// GET /api/utilizations/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const util = await Utilization.findById(req.params.id)
      .populate('allocationId')
      .populate('proposalId', 'title')
      .populate('branchId', 'name code city')
      .populate('donorId', 'companyName')
      .populate('submittedBy', 'name')
      .populate('verifiedBy', 'name');
    if (!util) return res.status(404).json({ error: 'Not found' });
    res.json({ data: util });
  } catch (err) { next(err); }
});

// POST /api/utilizations  (branch user submits utilization)
router.post('/', authenticate, requireRole('admin','branch_user'), upload.array('bills', 10), async (req, res, next) => {
  try {
    const { allocationId, amountUtilized, description, expenseDate, category, remarks } = req.body;

    const allocation = await Allocation.findById(allocationId).populate('proposalId');
    if (!allocation) return res.status(404).json({ error: 'Allocation not found' });

    // Check branch ownership
    if (req.user.role === 'branch_user' && String(req.user.branchId) !== String(allocation.branchId))
      return res.status(403).json({ error: 'Access denied' });

    // Check amount doesn't exceed allocation
    const existing = await Utilization.aggregate([
      { $match: { allocationId: allocation._id } },
      { $group: { _id: null, total: { $sum: '$amountUtilized' } } }
    ]);
    const alreadyUsed = existing[0]?.total || 0;
    if (alreadyUsed + parseFloat(amountUtilized) > allocation.amount)
      return res.status(400).json({ error: `Amount exceeds allocation. Remaining: ₹${(allocation.amount - alreadyUsed).toLocaleString('en-IN')}` });

    const bills = (req.files || []).map(f => ({ name: f.originalname, path: f.path.replace(/\\/g,'/'), uploadedAt: new Date() }));

    const util = await Utilization.create({
      allocationId, amountUtilized: parseFloat(amountUtilized),
      description, expenseDate, category: category || 'other', remarks, bills,
      proposalId: allocation.proposalId._id,
      branchId:   allocation.branchId,
      donorId:    allocation.donorId,
      submittedBy: req.user._id,
    });

    // Update allocation status
    if (!['in_progress','completed'].includes(allocation.status)) {
      allocation.status = 'in_progress';
      await allocation.save();
    }

    // Notify admin
    try {
      const admins = await require('../models/User').find({ role:'admin' }).select('email');
      const tmpl = templates.utilizationUpdated(util, allocation.proposalId);
      for (const a of admins) await sendEmail({ to: a.email, ...tmpl });
      await Communication.create({ type:'email', subject: tmpl.subject, donorId: allocation.donorId, proposalId: allocation.proposalId._id, sentBy: req.user._id });
    } catch(e) { /* non-fatal */ }

    res.status(201).json({ message: 'Utilization submitted', data: util });
  } catch (err) { next(err); }
});

// PATCH /api/utilizations/:id/verify
router.patch('/:id/verify', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { status, remarks } = req.body;
    const util = await Utilization.findByIdAndUpdate(req.params.id, {
      status, remarks, verifiedBy: req.user._id, verifiedAt: new Date()
    }, { new: true });
    if (!util) return res.status(404).json({ error: 'Not found' });

    // If all utilizations for allocation are verified, mark allocation complete
    if (status === 'verified') {
      const alloc = await Allocation.findById(util.allocationId);
      const utils = await Utilization.find({ allocationId: alloc._id });
      const total = utils.reduce((s,u) => s + u.amountUtilized, 0);
      if (total >= alloc.amount) { alloc.status = 'completed'; await alloc.save(); }
    }

    res.json({ message: 'Utilization verified', data: util });
  } catch (err) { next(err); }
});

// POST /api/utilizations/:id/bills - add more bills
router.post('/:id/bills', authenticate, requireRole('admin','branch_user'), upload.array('bills', 10), async (req, res, next) => {
  try {
    const util = await Utilization.findById(req.params.id);
    if (!util) return res.status(404).json({ error: 'Not found' });
    const newBills = (req.files || []).map(f => ({ name: f.originalname, path: f.path.replace(/\\/g,'/'), uploadedAt: new Date() }));
    util.bills.push(...newBills);
    await util.save();
    res.json({ message: 'Bills uploaded' });
  } catch (err) { next(err); }
});

module.exports = router;
