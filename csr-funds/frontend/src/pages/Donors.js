import React, { useEffect, useState, useRef } from 'react';
import { donorAPI } from '../api';
import { Loader, Alert, Modal, Confirm, EmptyState, StatusBadge, fmtINR, fmtDate } from '../components/UI';

export default function Donors() {
  const [donors,  setDonors]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [search,  setSearch]  = useState('');
  const [statusF, setStatusF] = useState('');
  const [showForm,  setShowForm]  = useState(false);
  const [editDonor, setEditDonor] = useState(null);
  const [delDonor,  setDelDonor]  = useState(null);
  const [emailDonor,setEmailDonor]= useState(null);
  const [viewDonor, setViewDonor] = useState(null);

  const load = async () => {
    setLoading(true);
    try { const r = await donorAPI.list({ search, status: statusF }); setDonors(r.data||[]); }
    catch(e) { setError(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [search, statusF]);

  const handleDelete = async () => {
    try { await donorAPI.delete(delDonor._id); setDelDonor(null); setSuccess('Donor deleted'); load(); }
    catch(e) { setError(e.message); setDelDonor(null); }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div><h1 className="page-title">CSR Donors</h1><p className="page-sub">{donors.length} registered donors</p></div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Add Donor</button>
      </div>
      {error   && <Alert type="error"   onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert type="success" onClose={() => setSuccess('')}>{success}</Alert>}

      <div className="filters">
        <input className="search-in" placeholder="Search donors…" value={search} onChange={e => setSearch(e.target.value)} />
        <select className="filter-sel" value={statusF} onChange={e => setStatusF(e.target.value)}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      {loading ? <Loader /> : donors.length === 0 ? (
        <EmptyState icon="🏢" title="No donors found" desc="Add your first CSR donor to get started."
          action={<button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Add Donor</button>} />
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Company</th><th>Contact Person</th><th>Email</th><th>CSR Budget</th><th>Sector</th><th>Status</th><th>Added</th><th>Actions</th></tr></thead>
              <tbody>
                {donors.map(d => (
                  <tr key={d._id}>
                    <td className="bold-col" style={{cursor:'pointer'}} onClick={() => setViewDonor(d)}>{d.companyName}</td>
                    <td>{d.contactPerson}</td>
                    <td style={{fontSize:'.82rem'}}>{d.email}</td>
                    <td className="mono">{fmtINR(d.csrBudget)}</td>
                    <td>{d.sector||'—'}</td>
                    <td><StatusBadge status={d.status} /></td>
                    <td style={{fontSize:'.75rem',color:'var(--ink3)'}}>{fmtDate(d.createdAt)}</td>
                    <td>
                      <div style={{display:'flex',gap:4}}>
                        <button className="btn btn-ghost btn-xs" onClick={() => setViewDonor(d)}>View</button>
                        <button className="btn btn-ghost btn-xs" onClick={() => setEditDonor(d)}>Edit</button>
                        <button className="btn btn-blue btn-xs" onClick={() => setEmailDonor(d)}>📧</button>
                        <button className="btn btn-danger btn-xs" onClick={() => setDelDonor(d)}>✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(showForm || editDonor) && (
        <DonorForm donor={editDonor}
          onClose={() => { setShowForm(false); setEditDonor(null); }}
          onSave={async (data) => {
            editDonor ? await donorAPI.update(editDonor._id, data) : await donorAPI.create(data);
            setShowForm(false); setEditDonor(null);
            setSuccess(editDonor ? 'Donor updated' : 'Donor created — welcome email sent');
            load();
          }}
          onError={setError} />
      )}

      {delDonor && <Confirm title="Delete Donor" message="Remove this donor from the system?" name={delDonor.companyName} onConfirm={handleDelete} onClose={() => setDelDonor(null)} />}

      {emailDonor && (
        <EmailModal donor={emailDonor} onClose={() => setEmailDonor(null)}
          onSend={async (d) => { await donorAPI.sendEmail(emailDonor._id, d); setEmailDonor(null); setSuccess('Email sent'); }}
          onError={setError} />
      )}

      {viewDonor && <DonorDetail donor={viewDonor} onClose={() => setViewDonor(null)} onEdit={() => { setViewDonor(null); setEditDonor(viewDonor); }} />}

      {delDonor && <Confirm title="Delete Donor" message="Remove this donor from the system?" name={delDonor.companyName} onConfirm={handleDelete} onClose={() => setDelDonor(null)} />}
    </div>
  );
}

function DonorForm({ donor, onClose, onSave, onError }) {
  const [form, setForm] = useState(donor ? { ...donor } : { companyName:'', contactPerson:'', email:'', phone:'', address:'', cin:'', csrBudget:0, sector:'', status:'active', notes:'' });
  const [busy, setBusy] = useState(false);
  const setF = k => e => setForm(f => ({...f,[k]:e.target.value}));
  return (
    <Modal title={donor ? 'Edit Donor' : 'Add CSR Donor'} onClose={onClose} footer={
      <><button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={busy} onClick={async()=>{ setBusy(true); try{await onSave(form);}catch(e){onError(e.message);}finally{setBusy(false);} }}>{busy?'Saving…':donor?'Save Changes':'Add Donor'}</button></>
    }>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Company Name *</label><input className="form-input" value={form.companyName} onChange={setF('companyName')} placeholder="Tata Consultancy Services" autoFocus /></div>
        <div className="form-group"><label className="form-label">Contact Person *</label><input className="form-input" value={form.contactPerson} onChange={setF('contactPerson')} placeholder="Rajesh Kumar" /></div>
      </div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Email *</label><input className="form-input" type="email" value={form.email} onChange={setF('email')} /></div>
        <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={form.phone} onChange={setF('phone')} /></div>
      </div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">CIN</label><input className="form-input" value={form.cin} onChange={setF('cin')} placeholder="U72200MH2004PLC..." /></div>
        <div className="form-group"><label className="form-label">Annual CSR Budget (₹)</label><input className="form-input" type="number" value={form.csrBudget} onChange={setF('csrBudget')} /></div>
      </div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Sector</label><select className="form-select" value={form.sector} onChange={setF('sector')}><option value="">Select…</option>{['Education','Health','Environment','Livelihood','Rural Development','Other'].map(s=><option key={s}>{s}</option>)}</select></div>
        <div className="form-group"><label className="form-label">Status</label><select className="form-select" value={form.status} onChange={setF('status')}><option value="active">Active</option><option value="inactive">Inactive</option><option value="pending">Pending</option></select></div>
      </div>
      <div className="form-group"><label className="form-label">Address</label><textarea className="form-textarea" rows={2} value={form.address} onChange={setF('address')} /></div>
      <div className="form-group"><label className="form-label">Notes</label><textarea className="form-textarea" rows={2} value={form.notes} onChange={setF('notes')} /></div>
    </Modal>
  );
}

function EmailModal({ donor, onClose, onSend, onError }) {
  const [form, setForm] = useState({ subject: `CSR Fund Update — ${donor.companyName}`, html: '' });
  const [busy, setBusy] = useState(false);
  return (
    <Modal title={`Send Email to ${donor.contactPerson}`} onClose={onClose} footer={
      <><button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={busy||!form.html} onClick={async()=>{ setBusy(true); try{await onSend(form);}catch(e){onError(e.message);}finally{setBusy(false);} }}>{busy?'Sending…':'Send Email'}</button></>
    }>
      <div className="form-group"><label className="form-label">To</label><input className="form-input" value={donor.email} disabled /></div>
      <div className="form-group"><label className="form-label">Subject</label><input className="form-input" value={form.subject} onChange={e=>setForm(f=>({...f,subject:e.target.value}))} /></div>
      <div className="form-group"><label className="form-label">Message (HTML supported)</label><textarea className="form-textarea" rows={6} value={form.html} onChange={e=>setForm(f=>({...f,html:e.target.value}))} placeholder="Enter your message here…" /></div>
    </Modal>
  );
}

function DonorDetail({ donor, onClose, onEdit }) {
  return (
    <Modal title={donor.companyName} onClose={onClose} large footer={<><button className="btn btn-secondary" onClick={onClose}>Close</button><button className="btn btn-primary" onClick={onEdit}>Edit</button></>}>
      <div className="form-row">
        {[['Contact Person',donor.contactPerson],['Email',donor.email],['Phone',donor.phone||'—'],['CIN',donor.cin||'—'],['CSR Budget',fmtINR(donor.csrBudget)],['Sector',donor.sector||'—']].map(([k,v])=>(
          <div key={k} style={{marginBottom:10}}><div style={{fontSize:'.72rem',fontWeight:700,color:'var(--ink3)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:3}}>{k}</div><div style={{fontWeight:600}}>{v}</div></div>
        ))}
      </div>
      {donor.address && <div style={{marginBottom:10}}><div className="form-label">Address</div><div>{donor.address}</div></div>}
      {donor.notes   && <div style={{marginBottom:10}}><div className="form-label">Notes</div><div style={{color:'var(--ink2)'}}>{donor.notes}</div></div>}
      {donor.documents?.length > 0 && (
        <div><div className="form-label" style={{marginBottom:6}}>Documents</div>
          {donor.documents.map((d,i)=>(
            <div key={i} style={{display:'flex',gap:8,alignItems:'center',marginBottom:4,fontSize:'.83rem'}}>
              <span>📎</span><span>{d.name}</span><span style={{color:'var(--ink3)',fontSize:'.72rem'}}>{fmtDate(d.uploadedAt)}</span>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
