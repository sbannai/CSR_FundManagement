const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST   || 'smtp.gmail.com',
  port:   parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM = process.env.EMAIL_FROM || 'CSR Funds <no-reply@school.edu>';

const sendEmail = async ({ to, subject, html, text }) => {
  if (!process.env.SMTP_USER) {
    console.log(`[EMAIL MOCK] To: ${to} | Subject: ${subject}`);
    return { messageId: 'mock' };
  }
  return transporter.sendMail({ from: FROM, to, subject, html, text });
};

// ── Email Templates ─────────────────────────────────────────────
const templates = {
  donorOnboarded: (donor) => ({
    subject: 'Welcome to CSR Fund Management Portal',
    html: `<h2>Dear ${donor.contactPerson},</h2>
      <p>Welcome! Your CSR company <strong>${donor.companyName}</strong> has been successfully onboarded to the CSR Fund Management System.</p>
      <p>You will receive regular updates on fund allocation and utilization.</p>
      <p><strong>Donor ID:</strong> ${donor._id}</p>
      <br><p>Regards,<br>CSR Fund Management Team</p>`,
  }),

  proposalSubmitted: (proposal, donor) => ({
    subject: `Proposal Submitted: ${proposal.title}`,
    html: `<h2>Proposal Submitted</h2>
      <p>Dear Admin,</p>
      <p>A new CSR fund proposal <strong>"${proposal.title}"</strong> has been submitted for donor <strong>${donor.companyName}</strong>.</p>
      <p><strong>Requested Amount:</strong> ₹${proposal.requestedAmount?.toLocaleString('en-IN')}</p>
      <p>Please review and approve at your earliest convenience.</p>`,
  }),

  proposalApproved: (proposal, donor) => ({
    subject: `Fund Proposal Approved: ${proposal.title}`,
    html: `<h2>Proposal Approved</h2>
      <p>Dear ${donor.contactPerson},</p>
      <p>We are pleased to inform you that the fund proposal <strong>"${proposal.title}"</strong> has been <span style="color:green;font-weight:bold">APPROVED</span>.</p>
      <p><strong>Approved Amount:</strong> ₹${proposal.approvedAmount?.toLocaleString('en-IN')}</p>
      <p>Funds will be allocated to the respective school branches shortly.</p>`,
  }),

  proposalRejected: (proposal, donor, reason) => ({
    subject: `Fund Proposal Update: ${proposal.title}`,
    html: `<h2>Proposal Status Update</h2>
      <p>Dear ${donor.contactPerson},</p>
      <p>The fund proposal <strong>"${proposal.title}"</strong> has been reviewed.</p>
      <p><strong>Status:</strong> <span style="color:red">Rejected</span></p>
      ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
      <p>Please contact us for further details.</p>`,
  }),

  fundAllocated: (allocation, branch) => ({
    subject: `Fund Allocated to ${branch.name}`,
    html: `<h2>Fund Allocation Notice</h2>
      <p>Dear ${branch.name} Team,</p>
      <p>A fund of <strong>₹${allocation.amount?.toLocaleString('en-IN')}</strong> has been allocated to your branch.</p>
      <p><strong>Purpose:</strong> ${allocation.purpose}</p>
      <p><strong>Deadline:</strong> ${new Date(allocation.deadline).toLocaleDateString('en-IN')}</p>
      <p>Please update the fund utilization details in the portal.</p>`,
  }),

  utilizationUpdated: (utilization, proposal) => ({
    subject: `Fund Utilization Update — ${proposal.title}`,
    html: `<h2>Fund Utilization Report</h2>
      <p>Dear Admin,</p>
      <p>A fund utilization update has been submitted for proposal <strong>"${proposal.title}"</strong>.</p>
      <p><strong>Amount Utilized:</strong> ₹${utilization.amountUtilized?.toLocaleString('en-IN')}</p>
      <p><strong>Description:</strong> ${utilization.description}</p>
      <p>Please review the uploaded bills/proofs in the portal.</p>`,
  }),
};

module.exports = { sendEmail, templates };
