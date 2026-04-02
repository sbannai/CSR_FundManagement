const express = require('express');
const router  = express.Router();
const { Donor, Branch, Proposal, Allocation, Utilization, Communication } = require('../models/index');
const { authenticate, requireRole } = require('../middleware/auth');

// GET /api/reports/dashboard  — role-aware summary stats
router.get('/dashboard', authenticate, async (req, res, next) => {
  try {
    const user = req.user;
    let data = {};

    if (user.role === 'admin' || user.role === 'csr_coordinator') {
      const [donors, branches, proposals, allocations, utilizations] = await Promise.all([
        Donor.countDocuments(),
        Branch.countDocuments({ isActive: true }),
        Proposal.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
        Allocation.aggregate([{ $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$amount' } } }]),
        Utilization.aggregate([{ $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$amountUtilized' } } }]),
      ]);

      const proposalMap    = proposals.reduce((a, p) => ({ ...a, [p._id]: p.count }), {});
      const allocationMap  = allocations.reduce((a, p) => ({ ...a, [p._id]: { count: p.count, total: p.total } }), {});
      const utilizationMap = utilizations.reduce((a, p) => ({ ...a, [p._id]: { count: p.count, total: p.total } }), {});

      const totalAllocated  = allocations.reduce((s, a) => s + a.total, 0);
      const totalUtilized   = utilizations.reduce((s, u) => s + u.total, 0);

      data = {
        donors, branches,
        proposals:   { total: proposals.reduce((s,p) => s+p.count,0), ...proposalMap },
        allocations: { ...allocationMap, totalAllocated },
        utilizations:{ ...utilizationMap, totalUtilized },
        utilizationRate: totalAllocated > 0 ? Math.round((totalUtilized / totalAllocated) * 100) : 0,
      };
    }

    if (user.role === 'branch_user') {
      const branchId = user.branchId;
      const [allocs, utils] = await Promise.all([
        Allocation.find({ branchId }).populate('proposalId','title'),
        Utilization.find({ branchId }),
      ]);
      const totalAllocated = allocs.reduce((s,a) => s+a.amount, 0);
      const totalUtilized  = utils.reduce((s,u) => s+u.amountUtilized, 0);
      data = {
        totalAllocated, totalUtilized,
        remaining: totalAllocated - totalUtilized,
        utilizationRate: totalAllocated > 0 ? Math.round((totalUtilized / totalAllocated) * 100) : 0,
        allocations: allocs.length,
        pendingVerification: utils.filter(u => u.status === 'pending').length,
      };
    }

    if (user.role === 'donor') {
      const donorId = user.donorId;
      const [proposals, allocs, utils] = await Promise.all([
        Proposal.find({ donorId }),
        Allocation.find({ donorId }),
        Utilization.find({ donorId }),
      ]);
      const totalAllocated = allocs.reduce((s,a) => s+a.amount, 0);
      const totalUtilized  = utils.reduce((s,u) => s+u.amountUtilized, 0);
      data = {
        proposals: proposals.length,
        approved:  proposals.filter(p => ['approved','partially_approved'].includes(p.status)).length,
        totalAllocated, totalUtilized,
        utilizationRate: totalAllocated > 0 ? Math.round((totalUtilized / totalAllocated) * 100) : 0,
      };
    }

    res.json({ data });
  } catch (err) { next(err); }
});

// GET /api/reports/fund-flow  — fund flow: donor → proposal → allocation → utilization
router.get('/fund-flow', authenticate, requireRole('admin','csr_coordinator','donor'), async (req, res, next) => {
  try {
    const filter = req.user.role === 'donor' ? { donorId: req.user.donorId } : {};
    const { fiscalYear } = req.query;
    if (fiscalYear) filter.fiscalYear = fiscalYear;

    const proposals = await Proposal.find(filter)
      .populate('donorId','companyName csrBudget')
      .populate('targetBranches','name code')
      .lean();

    const result = await Promise.all(proposals.map(async (p) => {
      const allocs = await Allocation.find({ proposalId: p._id }).populate('branchId','name code').lean();
      const allocsWithUtil = await Promise.all(allocs.map(async (a) => {
        const utils = await Utilization.find({ allocationId: a._id }).lean();
        const utilized = utils.reduce((s,u) => s+u.amountUtilized, 0);
        return { ...a, utilized, remaining: a.amount - utilized, utilizations: utils };
      }));
      const totalAllocated = allocs.reduce((s,a) => s+a.amount, 0);
      const totalUtilized  = allocsWithUtil.reduce((s,a) => s+a.utilized, 0);
      return { ...p, allocations: allocsWithUtil, totalAllocated, totalUtilized };
    }));

    res.json({ data: result });
  } catch (err) { next(err); }
});

// GET /api/reports/branch-summary
router.get('/branch-summary', authenticate, requireRole('admin','csr_coordinator'), async (req, res, next) => {
  try {
    const branches = await Branch.find({ isActive: true }).lean();
    const result = await Promise.all(branches.map(async (b) => {
      const allocs = await Allocation.find({ branchId: b._id });
      const utils  = await Utilization.find({ branchId: b._id });
      const totalAllocated = allocs.reduce((s,a) => s+a.amount, 0);
      const totalUtilized  = utils.reduce((s,u) => s+u.amountUtilized, 0);
      return { ...b, totalAllocated, totalUtilized, remaining: totalAllocated-totalUtilized,
        utilizationRate: totalAllocated>0 ? Math.round((totalUtilized/totalAllocated)*100):0,
        pendingBills: utils.filter(u=>u.status==='pending').length };
    }));
    res.json({ data: result.sort((a,b) => b.totalAllocated - a.totalAllocated) });
  } catch (err) { next(err); }
});

// GET /api/reports/donor-report/:donorId
router.get('/donor-report/:donorId', authenticate, async (req, res, next) => {
  try {
    const donorId = req.params.donorId;
    if (req.user.role === 'donor' && String(req.user.donorId) !== donorId)
      return res.status(403).json({ error: 'Access denied' });

    const [donor, proposals] = await Promise.all([
      Donor.findById(donorId),
      Proposal.find({ donorId }).populate('targetBranches','name code').lean(),
    ]);
    if (!donor) return res.status(404).json({ error: 'Donor not found' });

    const enriched = await Promise.all(proposals.map(async (p) => {
      const allocs = await Allocation.find({ proposalId: p._id }).populate('branchId','name code').lean();
      const utils  = await Utilization.find({ proposalId: p._id, status:'verified' }).lean();
      return { ...p,
        totalAllocated: allocs.reduce((s,a)=>s+a.amount,0),
        totalUtilized:  utils.reduce((s,u)=>s+u.amountUtilized,0),
        allocations: allocs,
      };
    }));

    res.json({ data: { donor, proposals: enriched } });
  } catch (err) { next(err); }
});

// GET /api/reports/communications
router.get('/communications', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { donorId, page=1, limit=20 } = req.query;
    const filter = donorId ? { donorId } : {};
    const offset = (parseInt(page)-1)*parseInt(limit);
    const [total, comms] = await Promise.all([
      Communication.countDocuments(filter),
      Communication.find(filter).populate('sentBy','name').populate('donorId','companyName').sort('-createdAt').skip(offset).limit(parseInt(limit)),
    ]);
    res.json({ data: comms, total, page: parseInt(page) });
  } catch (err) { next(err); }
});

module.exports = router;
