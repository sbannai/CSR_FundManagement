# CSR Fund Management System
**Sevak Digital Technologies Pvt. Ltd.**

A full-stack end-to-end CSR (Corporate Social Responsibility) fund tracking system enabling transparent management of CSR funds from donor onboarding to fund utilization across school branches.

---

## Features (per Requirements Document)

### User Roles
| Role | Capabilities |
|---|---|
| **Admin** | Full system control, manage donors, approve/reject proposals, allocate funds, monitor all branches, trigger email communications |
| **CSR Coordinator** | Add/update CSR company details, create proposals, track proposal & approval status, upload documents |
| **Branch School User** | View allocated funds, submit fund utilization updates, upload bills & proofs |
| **Donor (CSR Company)** | View their proposals and reports, receive automated email updates |

### Core Modules
- ✅ **Donor Onboarding** — Register CSR companies with CIN, budget, sector, contact details; auto welcome email
- ✅ **Proposal Management** — Full lifecycle: Draft → Submitted → Under Review → Approved/Rejected
- ✅ **Fund Allocation** — Admin allocates approved funds to specific school branches with purpose and deadline
- ✅ **Fund Utilization** — Branch users submit utilization reports with bill/proof uploads; admin verifies
- ✅ **Email Communications** — Automated emails at every stage (onboarding, submission, approval, rejection, allocation, utilization)
- ✅ **Reporting & Transparency** — Fund flow pipeline, branch summary, donor reports, communication logs
- ✅ **Document Management** — Upload proposals, donor documents, bills, and proofs (PDF, DOCX, images)
- ✅ **Audit Trail** — Communication log with all automated and manual emails

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Context API, Axios |
| Middleware/API | Node.js 18, Express 4 |
| Database | MongoDB 6 + Mongoose |
| Auth | JWT (8h expiry) + bcrypt (cost 12) |
| Email | Nodemailer (SMTP / Gmail) |
| File Upload | Multer (disk storage) |
| Security | Helmet.js, express-rate-limit, CORS |

---

## Quick Start

### Prerequisites
- Node.js v16+
- MongoDB (local or Atlas)

### 1. Clone / Extract

```bash
cd csr-funds
```

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB URI and SMTP credentials
```

**.env configuration:**
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/csr_funds
JWT_SECRET=your_long_random_secret_here
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
FRONTEND_URL=http://localhost:3000
```

> **Note:** If SMTP is not configured, emails are logged to console (mock mode) — app works without email.

### 3. Seed Demo Data

```bash
cd backend
node seed.js
```

### 4. Start Backend

```bash
npm run dev    # development (nodemon)
# or
npm start      # production
# → API on http://localhost:5000
```

### 5. Start Frontend

```bash
cd frontend
npm install
npm start
# → App on http://localhost:3000
```

---

## Demo Credentials (after running seed.js)

| Email | Password | Role |
|---|---|---|
| admin@school.edu | Admin@123 | Admin |
| coord@school.edu | Admin@123 | CSR Coordinator |
| branch@school.edu | Admin@123 | Branch User |
| donor@company.com | Admin@123 | Donor |

> Admin is auto-created on first server start even without seed.

---

## API Endpoints

### Authentication
```
POST   /api/auth/login           Login
GET    /api/auth/me              Current user
POST   /api/auth/users           Create user (Admin)
GET    /api/auth/users           List users (Admin)
PUT    /api/auth/users/:id       Update user (Admin)
PUT    /api/auth/password        Change password
```

### Donors
```
GET    /api/donors               List donors
POST   /api/donors               Create donor + send welcome email
PUT    /api/donors/:id           Update donor
DELETE /api/donors/:id           Delete donor (Admin)
POST   /api/donors/:id/documents Upload document
POST   /api/donors/:id/email     Send manual email (Admin)
```

### Proposals
```
GET    /api/proposals            List proposals (role-filtered)
POST   /api/proposals            Create proposal
PUT    /api/proposals/:id        Update proposal
PATCH  /api/proposals/:id/submit Submit for review
PATCH  /api/proposals/:id/approve Approve + notify donor
PATCH  /api/proposals/:id/reject  Reject + notify donor
POST   /api/proposals/:id/documents Upload document
```

### Allocations
```
GET    /api/allocations          List allocations (role-filtered)
POST   /api/allocations          Allocate funds to branch (Admin)
PUT    /api/allocations/:id      Update allocation
PATCH  /api/allocations/:id/status Update status
```

### Utilizations
```
GET    /api/utilizations         List utilizations (role-filtered)
POST   /api/utilizations         Submit utilization + bills (Branch)
PATCH  /api/utilizations/:id/verify Verify/reject utilization (Admin)
POST   /api/utilizations/:id/bills  Add more bills
```

### Reports
```
GET    /api/reports/dashboard       Role-aware dashboard stats
GET    /api/reports/fund-flow       Complete fund flow pipeline
GET    /api/reports/branch-summary  All branches utilization
GET    /api/reports/donor-report/:id Donor-specific report
GET    /api/reports/communications  Email/comm log (Admin)
```

---

## Project Structure

```
csr-funds/
├── backend/
│   ├── config/
│   │   ├── db.js              MongoDB connection
│   │   └── multer.js          File upload config
│   ├── middleware/
│   │   └── auth.js            JWT auth + role guard
│   ├── models/
│   │   ├── User.js            User schema (4 roles)
│   │   └── index.js           Donor, Branch, Proposal,
│   │                          Allocation, Utilization, Communication
│   ├── routes/
│   │   ├── auth.js            Auth endpoints
│   │   ├── donors.js          Donor CRUD + email
│   │   ├── branches.js        Branch CRUD
│   │   ├── proposals.js       Proposal lifecycle
│   │   ├── allocations.js     Fund allocation
│   │   ├── utilizations.js    Fund utilization + bills
│   │   └── reports.js         Dashboard + reports
│   ├── utils/
│   │   └── email.js           Nodemailer + 6 email templates
│   ├── server.js              Express app entry point
│   ├── seed.js                Demo data seeder
│   └── .env.example
│
├── frontend/
│   ├── public/index.html
│   └── src/
│       ├── api.js             Axios client + all API functions
│       ├── App.js             Shell, sidebar, routing
│       ├── styles.css         Design system (Plus Jakarta Sans)
│       ├── context/
│       │   └── AuthContext.js JWT state + role helpers
│       ├── components/
│       │   └── UI.js          Shared components
│       └── pages/
│           ├── Login.js       Login with demo shortcuts
│           ├── Dashboard.js   Role-aware stats dashboard
│           ├── Donors.js      CSR donor management
│           ├── Proposals.js   Proposal lifecycle management
│           ├── Allocations.js Fund allocation to branches
│           ├── Utilizations.js Fund utilization + bill upload
│           ├── Reports.js     Fund flow + branch summary
│           ├── Branches.js    School branch management
│           └── Users.js       User management (Admin)
│
├── package.json
└── README.md
```

---

## Automated Email Triggers

| Event | Recipients | Template |
|---|---|---|
| Donor onboarded | Donor | Welcome email with portal access info |
| Proposal submitted | All Admins | Notification with proposal details |
| Proposal approved | Donor | Approval notice with approved amount |
| Proposal rejected | Donor | Rejection notice with reason |
| Fund allocated | Branch (email) | Allocation notice with deadline |
| Utilization submitted | All Admins | Update notification |

> If SMTP is not configured, emails are logged to console. Set `SMTP_USER` and `SMTP_PASS` in `.env` to enable real email delivery.

---

## Security

- JWT authentication on all protected routes
- bcrypt password hashing (cost factor 12)
- Role-based access control (4 levels)
- Rate limiting: 20 login/15min, 300 general/15min
- Helmet.js security headers
- MIME type validation on file uploads
- File size limit (configurable, default 20 MB)
- CORS configured to frontend origin only

---

## Production Deployment

### Backend (Railway / Render / Heroku)
```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
JWT_SECRET=<strong-random-secret>
FRONTEND_URL=https://your-frontend-domain.com
```

### Frontend (Vercel / Netlify)
```env
REACT_APP_API_URL=https://your-api-domain.com/api
```
Build: `npm run build` → deploy `build/` folder.
