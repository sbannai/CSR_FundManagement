import React from 'react';

export const Loader = () => (
  <div className="loader"><div className="spin" /> Loading…</div>
);

export const Alert = ({ type = 'error', children, onClose }) => (
  <div className={`alert alert-${type}`}>
    <span>{type==='error'?'⚠':type==='success'?'✓':type==='amber'?'⚡':'ℹ'}</span>
    <span style={{flex:1}}>{children}</span>
    {onClose && <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:'inherit'}}>✕</button>}
  </div>
);

export const Modal = ({ title, children, onClose, footer, large }) => (
  <div className="modal-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
    <div className={`modal${large?' modal-lg':''}`}>
      <div className="modal-header">
        <h3 className="modal-title">{title}</h3>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>✕</button>
      </div>
      <div className="modal-body">{children}</div>
      {footer && <div className="modal-footer">{footer}</div>}
    </div>
  </div>
);

export const Confirm = ({ title, message, name, onConfirm, onClose }) => (
  <Modal title={title} onClose={onClose} footer={
    <><button className="btn btn-secondary" onClick={onClose}>Cancel</button>
      <button className="btn btn-danger" onClick={onConfirm}>Confirm</button></>
  }>
    <p style={{color:'var(--ink2)',marginBottom:4}}>{message}</p>
    {name && <strong style={{color:'var(--red)'}}>&ldquo;{name}&rdquo;</strong>}
  </Modal>
);

export const EmptyState = ({ icon, title, desc, action }) => (
  <div className="empty">
    <div className="empty-icon">{icon}</div>
    <div className="empty-title">{title}</div>
    {desc && <p style={{fontSize:'.83rem',marginTop:4}}>{desc}</p>}
    {action && <div style={{marginTop:'1rem'}}>{action}</div>}
  </div>
);

export const ProgressBar = ({ value, color }) => (
  <div className="progress-bar">
    <div className={`progress-fill${color?' '+color:''}`} style={{width:`${Math.min(value||0,100)}%`}} />
  </div>
);

// Format Indian Rupees
export const fmtINR = (n) => {
  if (!n && n !== 0) return '—';
  return '₹' + Number(n).toLocaleString('en-IN');
};

export const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
};

export const fmtDateTime = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
};

// Status badge mapping
const STATUS_MAP = {
  // Proposal
  draft:              ['badge-gray',   'Draft'],
  submitted:          ['badge-blue',   'Submitted'],
  under_review:       ['badge-amber',  'Under Review'],
  approved:           ['badge-green',  'Approved'],
  rejected:           ['badge-red',    'Rejected'],
  partially_approved: ['badge-teal',   'Partly Approved'],
  // Allocation
  allocated:          ['badge-blue',   'Allocated'],
  in_progress:        ['badge-amber',  'In Progress'],
  completed:          ['badge-green',  'Completed'],
  overdue:            ['badge-red',    'Overdue'],
  // Utilization
  pending:            ['badge-amber',  'Pending'],
  verified:           ['badge-green',  'Verified'],
  // Donor
  active:             ['badge-green',  'Active'],
  inactive:           ['badge-gray',   'Inactive'],
};

export const StatusBadge = ({ status }) => {
  const [cls, label] = STATUS_MAP[status] || ['badge-gray', status];
  return <span className={`badge ${cls}`}>{label}</span>;
};

export const RoleBadge = ({ role }) => {
  const map = { admin:'badge-orange', csr_coordinator:'badge-blue', branch_user:'badge-green', donor:'badge-purple' };
  const labels = { admin:'Admin', csr_coordinator:'CSR Coord.', branch_user:'Branch User', donor:'Donor' };
  return <span className={`badge ${map[role]||'badge-gray'}`}>{labels[role]||role}</span>;
};

export const UtilBar = ({ allocated, utilized, size='sm' }) => {
  const pct = allocated > 0 ? Math.round((utilized/allocated)*100) : 0;
  const color = pct >= 90 ? 'green' : pct >= 50 ? 'blue' : 'amber';
  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',fontSize:'.72rem',color:'var(--ink3)',marginBottom:3}}>
        <span>{fmtINR(utilized)} used</span><span>{pct}%</span>
      </div>
      <ProgressBar value={pct} color={color} />
      <div style={{fontSize:'.7rem',color:'var(--ink3)',marginTop:2}}>{fmtINR(allocated)} allocated</div>
    </div>
  );
};
