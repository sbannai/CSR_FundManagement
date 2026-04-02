const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true },
  email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:  { type: String, required: true },
  role:      { type: String, enum: ['admin','csr_coordinator','branch_user','donor'], required: true },
  branchId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },   // for branch_user
  donorId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Donor' },    // for donor
  isActive:  { type: Boolean, default: true },
  lastLogin: { type: Date },
}, { timestamps: true });

UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

UserSchema.methods.matchPassword = function(plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model('User', UserSchema);
