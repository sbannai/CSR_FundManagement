/**
 * Seed script — creates demo users for all 4 roles
 * Run: node seed.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User     = require('./models/User');
const { Donor, Branch } = require('./models/index');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/csr_funds');
  console.log('Connected to MongoDB');

  // Create demo donor
  let donor = await Donor.findOne({ email: 'donor@company.com' });
  if (!donor) {
    donor = await Donor.create({
      companyName: 'Tata Consultancy Services',
      contactPerson: 'Rajesh Kumar',
      email: 'donor@company.com',
      phone: '+91-9876543210',
      cin: 'L22210MH1995PLC084781',
      csrBudget: 5000000,
      sector: 'Education',
      status: 'active',
    });
    console.log('✅ Demo donor created');
  }

  // Create demo branch
  let branch = await Branch.findOne({ code: 'GCB-001' });
  if (!branch) {
    branch = await Branch.create({
      name: 'Gachibowli Campus',
      code: 'GCB-001',
      address: 'Plot 42, Nanakramguda, Gachibowli',
      city: 'Hyderabad',
      state: 'Telangana',
      principalName: 'Dr. Priya Sharma',
      phone: '+91-40-12345678',
      email: 'branch@school.edu',
    });
    console.log('✅ Demo branch created');
  }

  // Create demo users
  const users = [
    { name: 'Super Admin',    email: 'admin@school.edu',  password: 'Admin@123', role: 'admin' },
    { name: 'CSR Coordinator',email: 'coord@school.edu',  password: 'Admin@123', role: 'csr_coordinator' },
    { name: 'Branch Manager', email: 'branch@school.edu', password: 'Admin@123', role: 'branch_user', branchId: branch._id },
    { name: 'Rajesh Kumar',   email: 'donor@company.com', password: 'Admin@123', role: 'donor', donorId: donor._id },
  ];

  for (const u of users) {
    const exists = await User.findOne({ email: u.email });
    if (!exists) {
      await User.create(u);
      console.log(`✅ Created user: ${u.email} (${u.role})`);
    } else {
      console.log(`⏭  User exists: ${u.email}`);
    }
  }

  console.log('\n🎉 Seed complete! Login credentials:');
  console.log('   admin@school.edu   / Admin@123  (Admin)');
  console.log('   coord@school.edu   / Admin@123  (CSR Coordinator)');
  console.log('   branch@school.edu  / Admin@123  (Branch User)');
  console.log('   donor@company.com  / Admin@123  (Donor)');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
