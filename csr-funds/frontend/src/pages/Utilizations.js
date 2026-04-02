import React, { useEffect, useState, useRef } from 'react';
import { utilizationAPI, allocationAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { Loader, Alert, Modal, EmptyState, StatusBadge, fmtINR, fmtDate, ProgressBar } from '../components/UI';

const CATEGORIES = ['infrastructure','books','uniforms','salary','equipment','events','other'];

export default function Utilizations() {
  const { isAdmin, isBranch } = useAuth();
  const [utils,   setUtils]   = useState([]);
  const [allocs,  setAllocs]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [statusF, setStatusF] = useState('');
  const [showForm,setShowForm]= useState(false);
  const [viewU,   setViewU]   = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = statusF ? { status: statusF } : {};
      const [ul, al] = await Promise.all([
        utilizationAPI.list(params),
        allocationAPI.list(isBranch() ? {} : {}),
      ]);
      setUtils(ul.data||[]);
      setAllocs(al.data||[]);
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [statusF]);

  const handleVerify = async (id, status) => {
    try { await utilizationAPI.verify(id, { status }); setSuccess('Utilization verified'); load(); }
    catch(e) { setError(e.message); }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div><h1 className="page-title">Fund Utilization</h1><p className="page-sub">{utils.length} records</p></div>
        {isBranch() && <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Submit Utilization</button>}
      </div>
      {error   && <Alert type="error"   onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert type="success" onClose={() => setSuccess('')}>{success}</Alert>}

      <div className="filters">
        <select className="filter-sel" value={statusF} onChange={e => setStatusF(e.target.value)}>
          <option value="">All</option>
          <option value="pending">Pending Verification</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {loading ? <Loader /> : utils.length === 0 ? (
        <EmptyState icon="📤" title="No utilization records" desc={isBranch() ? "Submit your first fund utilization report with bills and proofs." : "No utilization reports submitted yet."}
          action={isBranch() && <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Submit Utilization</button>} />
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Branch</th><th>Proposal</th><th>Amount</th><th>Category</th>
                  <th>Expense Date</th><th>Bills</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {utils.map(u => (
                  <tr key={u._id} style={{cursor:'pointer'}} onClick={() => setViewU(u)}>
                    <td className="bold-col">{u.branchId?.name||'—'}</td>
                    <td style={{maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontSize:'.82rem'}}>{u.proposalId?.title||'—'}</td>
                    <td className="mono">{fmtINR(u.amountUtilized)}</td>
                    <td><span className="badge badge-teal" style={{textTransform:'capitalize'}}>{u.category}</span></td>
                    <td style={{fontSize:'.78rem'}}>{fmtDate(u.expenseDate)}</td>
                    <td style={{fontSize:'.78rem',color:'var(--ink3)'}}>{u.bills?.length||0} file{(u.bills?.length||0)!==1?'s':''}</td>
                    <td><StatusBadge status={u.status} /></td>
                    <td onClick={e=>e.stopPropagation()}>
                      <div style={{display:'flex',gap:4}}>
                        <button className="btn btn-ghost btn-xs" onClick={() => setViewU(u)}>View</button>
                        {isAdmin() && u.status==='pending' && (
                          <>
                            <button className="btn btn-success btn-xs" onClick={() => handleVerify(u._id,'verified')}>✓</button>
                            <button className="btn btn-danger btn-xs" onClick={() => handleVerify(u._id,'rejected')}>✕</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <UtilizationForm allocs={allocs.filter(a => ['allocated','in_progress'].includes(a.status))}
          onClose={() => setShowForm(false)}
          onSave={async (fd, prog) => {
            await utilizationAPI.create(fd, prog);
            setShowForm(false);
            setSuccess('Utilization submitted — admin notified');
            load();
          }} onError={setError} />
      )}

      {viewU && <UtilizationDetail util={viewU} onClose={() => setViewU(null)} isAdmin={isAdmin()} onVerify={(status)=>{ handleVerify(viewU._id, status); setViewU(null); }} />}
    </div>
  );
}

function UtilizationForm({ allocs, onClose, onSave, onError }) {
  const [form, setForm] = useState({ allocationId:'', amountUtilized:'', description:'', expenseDate:'', category:'other', remarks:'' });
  const [files, setFiles] = useState([]);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef();
  const setF = k => e => setForm(f=>({...f,[k]:e.target.value}));
  const selAlloc = allocs.find(a => a._id === form.allocationId);

  const submit = async () => {
    if (!form.allocationId || !form.amountUtilized || !form.description || !form.expenseDate)
      return onError('Please fill all required fields');
    setBusy(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k,v]) => fd.append(k, v));
      files.forEach(f => fd.append('bills', f));
      await onSave(fd, setProgress);
    } catch(e) { onError(e.message); }
    finally { setBusy(false); setProgress(0); }
  };

  return (
    <Modal title="Submit Fund Utilization" onClose={onClose} large footer={
      <><button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={busy} onClick={submit}>{busy?`Uploading ${progress}%…`:'Submit Utilization'}</button></>
    }>
      <div className="form-group">
        <label className="form-label">Allocation *</label>
        <select className="form-select" value={form.allocationId} onChange={setF('allocationId')}>
          <option value="">Select allocation…</option>
          {allocs.map(a=><option key={a._id} value={a._id}>{a.proposalId?.title||'Proposal'} — {a.branchId?.name||'Branch'} ({fmtINR(a.amount)})</option>)}
        </select>
      </div>
      {selAlloc && <div className="alert alert-info" style={{marginBottom:'1rem'}}>Allocated: {fmtINR(selAlloc.amount)} | Purpose: {selAlloc.purpose}</div>}
      <div className="form-row">
        <div className="form-group"><label className="form-label">Amount Utilized (₹) *</label><input className="form-input" type="number" value={form.amountUtilized} onChange={setF('amountUtilized')} /></div>
        <div className="form-group"><label className="form-label">Expense Date *</label><input className="form-input" type="date" value={form.expenseDate} onChange={setF('expenseDate')} /></div>
      </div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Category</label><select className="form-select" value={form.category} onChange={setF('category')}>{CATEGORIES.map(c=><option key={c} value={c} style={{textTransform:'capitalize'}}>{c}</option>)}</select></div>
        <div className="form-group"><label className="form-label">Remarks</label><input className="form-input" value={form.remarks} onChange={setF('remarks')} /></div>
      </div>
      <div className="form-group"><label className="form-label">Description *</label><textarea className="form-textarea" rows={2} value={form.description} onChange={setF('description')} placeholder="How were the funds utilized?" /></div>
      <div className="form-group">
        <label className="form-label">Upload Bills / Proofs</label>
        <div className="drop-zone" onClick={() => fileRef.current.click()}>
          <input ref={fileRef} type="file" multiple style={{display:'none'}} onChange={e => setFiles([...e.target.files])} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
          <div className="drop-zone-icon">📎</div>
          {files.length > 0 ? (
            <div style={{fontWeight:600}}>{files.length} file{files.length>1?'s':''} selected</div>
          ) : (
            <><div className="drop-zone-text">Click to attach bills & receipts</div><div className="drop-zone-sub">PDF, Images, Word — up to 10 files</div></>
          )}
        </div>
      </div>
      {busy && progress > 0 && <ProgressBar value={progress} />}
    </Modal>
  );
}

function UtilizationDetail({ util, onClose, isAdmin, onVerify }) {
  return (
    <Modal title="Utilization Details" onClose={onClose} large footer={
      <>{isAdmin && util.status==='pending' && (
        <><button className="btn btn-danger" onClick={() => onVerify('rejected')}>✕ Reject</button>
          <button className="btn btn-success" onClick={() => onVerify('verified')}>✓ Verify</button></>
      )}<button className="btn btn-secondary" onClick={onClose}>Close</button></>
    }>
      <div className="form-row">
        {[['Branch',util.branchId?.name||'—'],['Proposal',util.proposalId?.title||'—'],['Amount',fmtINR(util.amountUtilized)],['Category',util.category],['Date',fmtDate(util.expenseDate)],['Status',util.status]].map(([k,v])=>(
          <div key={k} style={{marginBottom:10}}><div style={{fontSize:'.72rem',fontWeight:700,color:'var(--ink3)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:3}}>{k}</div><div style={{fontWeight:600,textTransform:'capitalize'}}>{v}</div></div>
        ))}
      </div>
      <div style={{marginBottom:12}}><div className="form-label">Description</div><div style={{color:'var(--ink2)'}}>{util.description}</div></div>
      {util.remarks && <div style={{marginBottom:12}}><div className="form-label">Remarks</div><div style={{color:'var(--ink2)'}}>{util.remarks}</div></div>}
      {util.bills?.length > 0 && (
        <div>
          <div className="form-label" style={{marginBottom:6}}>Bills / Proofs ({util.bills.length})</div>
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            {util.bills.map((b,i)=>(
              <div key={i} style={{display:'flex',gap:8,alignItems:'center',padding:'6px 10px',background:'var(--bg2)',borderRadius:'var(--radius)',fontSize:'.83rem'}}>
                <span>📎</span><span style={{flex:1,fontWeight:500}}>{b.name}</span>
                <span style={{fontSize:'.72rem',color:'var(--ink3)'}}>{fmtDate(b.uploadedAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {util.verifiedBy && <div style={{marginTop:12,padding:'8px 12px',background:'var(--green-lt)',borderRadius:'var(--radius)',fontSize:'.82rem',color:'var(--green)'}}><strong>Verified by:</strong> {util.verifiedBy?.name||'Admin'} on {fmtDate(util.verifiedAt)}</div>}
    </Modal>
  );
}
