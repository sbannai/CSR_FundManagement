const mongoose = require('mongoose');

// ── Donor (CSR Company) ────────────────────────────────────────
const DonorSchema = new mongoose.Schema({
  companyName:    { type: String, required: true, trim: true },
  contactPerson:  { type: String, required: true, trim: true },
  email:          { type: String, required: true, trim: true },
  phone:          { type: String, trim: true },
  address:        { type: String, trim: true },
  cin:            { type: String, trim: true },          // Corporate Identification Number
  csrBudget:      { type: Number, default: 0 },          // Annual CSR budget in INR
  sector:         { type: String, trim: true },          // e.g. Education, Health
  status:         { type: String, enum: ['active','inactive','pending'], default: 'active' },
  notes:          { type: String },
  documents:      [{ name: String, path: String, uploadedAt: Date }],
  createdBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// ── School Branch ──────────────────────────────────────────────
const BranchSchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true },
  code:         { type: String, required: true, unique: true, trim: true },
  address:      { type: String, trim: true },
  city:         { type: String, trim: true },
  state:        { type: String, trim: true },
  principalName:{ type: String, trim: true },
  phone:        { type: String, trim: true },
  email:        { type: String, trim: true },
  isActive:     { type: Boolean, default: true },
}, { timestamps: true });

// ── Fund Proposal ──────────────────────────────────────────────
const ProposalSchema = new mongoose.Schema({
  title:           { type: String, required: true, trim: true },
  description:     { type: String, required: true },
  donorId:         { type: mongoose.Schema.Types.ObjectId, ref: 'Donor', required: true },
  requestedAmount: { type: Number, required: true },
  approvedAmount:  { type: Number },
  purpose:         { type: String, required: true },
  targetBranches:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'Branch' }],
  status:          {
    type: String,
    enum: ['draft','submitted','under_review','approved','rejected','partially_approved'],
    default: 'draft'
  },
  submittedAt:     { type: Date },
  reviewedAt:      { type: Date },
  reviewedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rejectionReason: { type: String },
  documents:       [{ name: String, path: String, uploadedAt: Date }],
  createdBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  fiscalYear:      { type: String },
  notes:           { type: String },
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

// ── Fund Allocation (per branch per proposal) ─────────────────
const AllocationSchema = new mongoose.Schema({
  proposalId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Proposal', required: true },
  donorId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Donor', required: true },
  branchId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  amount:       { type: Number, required: true },
  purpose:      { type: String, required: true },
  deadline:     { type: Date, required: true },
  status:       { type: String, enum: ['allocated','in_progress','completed','overdue'], default: 'allocated' },
  allocatedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes:        { type: String },
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

AllocationSchema.virtual('utilisedAmount', {
  ref: 'Utilization', localField: '_id', foreignField: 'allocationId',
  justOne: false,
});

// ── Fund Utilization (uploaded by branch user) ────────────────
const UtilizationSchema = new mongoose.Schema({
  allocationId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Allocation', required: true },
  proposalId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Proposal', required: true },
  branchId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  donorId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Donor', required: true },
  amountUtilized: { type: Number, required: true },
  description:    { type: String, required: true },
  expenseDate:    { type: Date, required: true },
  category:       { type: String, enum: ['infrastructure','books','uniforms','salary','equipment','events','other'], default: 'other' },
  status:         { type: String, enum: ['pending','verified','rejected'], default: 'pending' },
  verifiedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verifiedAt:     { type: Date },
  bills:          [{ name: String, path: String, uploadedAt: Date }],
  submittedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  remarks:        { type: String },
}, { timestamps: true });

// ── Communication Log ─────────────────────────────────────────
const CommunicationSchema = new mongoose.Schema({
  type:       { type: String, enum: ['email','note','call','meeting'], default: 'email' },
  subject:    { type: String, required: true },
  body:       { type: String },
  recipients: [{ type: String }],
  donorId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Donor' },
  proposalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Proposal' },
  sentBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status:     { type: String, enum: ['sent','failed','mock'], default: 'sent' },
}, { timestamps: true });

module.exports = {
  Donor:         mongoose.model('Donor',         DonorSchema),
  Branch:        mongoose.model('Branch',        BranchSchema),
  Proposal:      mongoose.model('Proposal',      ProposalSchema),
  Allocation:    mongoose.model('Allocation',    AllocationSchema),
  Utilization:   mongoose.model('Utilization',   UtilizationSchema),
  Communication: mongoose.model('Communication', CommunicationSchema),
};
