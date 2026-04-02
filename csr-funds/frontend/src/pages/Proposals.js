import React, { useEffect, useState } from 'react';
import { proposalAPI, donorAPI, branchAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { Loader, Alert, Modal, Confirm, EmptyState, StatusBadge, fmtINR, fmtDate } from '../components/UI';

export default function Proposals({ navigate }) {
  const { isAdmin, canManage, isBranch, isDonor } = useAuth();
  const [proposals, setProposals] = useState([]);
  const [donors,    setDonors]    = useState([]);
  const [branches,  setBranches]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState('');
  const [statusF,   setStatusF]   = useState('');
  const [showForm,  setShowForm]  = useState(false);
  const [editP,     setEditP]     = useState(null);
  const [delP,      setDelP]      = useState(null);
  const [approveP,  setApproveP]  = useState(null);
  const [rejectP,   setRejectP]   = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = statusF ? { status: statusF } : {};
      const [pr, dr, br] = await Promise.all([
        proposalAPI.list(params),
        donorAPI.list(),
        branchAPI.list(),
      ]);
      setProposals(pr.data||[]);
      setDonors(dr.data||[]);
      setBranches(br.data||[]);
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [statusF]);

  const handleSubmit = async (id) => {
    try { await proposalAPI.submit(id); setSuccess('Proposal submitted for review'); load(); }
    catch(e) { setError(e.message); }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div><h1 className="page-title">Fund Proposals</h1><p className="page-sub">{proposals.length} proposals</p></div>
        {canManage() && <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ New Proposal</button>}
      </div>
      {error   && <Alert type="error"   onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert type="success" onClose={() => setSuccess('')}>{success}</Alert>}

      <div className="filters">
        <select className="filter-sel" value={statusF} onChange={e => setStatusF(e.target.value)}>
          <option value="">All Statuses</option>
          {['draft','submitted','under_review','approved','rejected','partially_approved'].map(s=><option key={s} value={s}>{s.replace('_',' ')}</option>)}
        </select>
      </div>

      {loading ? <Loader /> : proposals.length === 0 ? (
        <EmptyState icon="📋" title="No proposals yet" desc="Create a fund proposal to start the CSR process."
          action={canManage() && <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ New Proposal</button>} />
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Title</th><th>Donor</th><th>Requested</th><th>Approved</th><th>Status</th><th>FY</th><th>Created</th><th>Actions</th></tr></thead>
              <tbody>
                {proposals.map(p => (
                  <tr key={p._id} style={{cursor:'pointer'}} onClick={() => navigate('proposal-detail', p._id)}>
                    <td className="bold-col">{p.title}</td>
                    <td>{p.donorId?.companyName||'—'}</td>
                    <td className="mono">{fmtINR(p.requestedAmount)}</td>
                    <td className="mono">{p.approvedAmount ? fmtINR(p.approvedAmount) : '—'}</td>
                    <td><StatusBadge status={p.status} /></td>
                    <td style={{fontSize:'.78rem',color:'var(--ink3)'}}>{p.fiscalYear||'—'}</td>
                    <td style={{fontSize:'.78rem',color:'var(--ink3)'}}>{fmtDate(p.createdAt)}</td>
                    <td onClick={e=>e.stopPropagation()}>
                      <div style={{display:'flex',gap:4}}>
                        {canManage() && p.status==='draft' && <button className="btn btn-blue btn-xs" onClick={()=>handleSubmit(p._id)}>Submit</button>}
                        {isAdmin() && p.status==='submitted' && <button className="btn btn-success btn-xs" onClick={()=>setApproveP(p)}>Approve</button>}
                        {isAdmin() && p.status==='submitted' && <button className="btn btn-danger btn-xs" onClick={()=>setRejectP(p)}>Reject</button>}
                        {canManage() && p.status==='draft' && <button className="btn btn-ghost btn-xs" onClick={()=>setEditP(p)}>Edit</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(showForm||editP) && (
        <ProposalForm proposal={editP} donors={donors} branches={branches}
          onClose={() => { setShowForm(false); setEditP(null); }}
          onSave={async (data) => {
            editP ? await proposalAPI.update(editP._id, data) : await proposalAPI.create(data);
            setShowForm(false); setEditP(null);
            setSuccess(editP ? 'Proposal updated' : 'Proposal created');
            load();
          }} onError={setError} />
      )}

      {approveP && <ApproveModal proposal={approveP} onClose={() => setApproveP(null)}
        onApprove={async (d) => { await proposalAPI.approve(approveP._id, d); setApproveP(null); setSuccess('Proposal approved — donor notified'); load(); }}
        onError={setError} />}

      {rejectP && <RejectModal proposal={rejectP} onClose={() => setRejectP(null)}
        onReject={async (reason) => { await proposalAPI.reject(rejectP._id, { reason }); setRejectP(null); setSuccess('Proposal rejected'); load(); }}
        onError={setError} />}
    </div>
  );
}

function ProposalForm({ proposal, donors, branches, onClose, onSave, onError }) {
  const [form, setForm] = useState(proposal ? { ...proposal, donorId: proposal.donorId?._id||proposal.donorId, targetBranches: (proposal.targetBranches||[]).map(b=>b._id||b) } : { title:'', description:'', donorId:'', requestedAmount:'', purpose:'', targetBranches:[], fiscalYear:new Date().getFullYear()+'-'+(new Date().getFullYear()+1), notes:'' });
  const [busy, setBusy] = useState(false);
  const setF = k => e => setForm(f=>({...f,[k]:e.target.value}));
  const toggleBranch = id => setForm(f => ({ ...f, targetBranches: f.targetBranches.includes(id) ? f.targetBranches.filter(b=>b!==id) : [...f.targetBranches, id] }));

  return (
    <Modal title={proposal ? 'Edit Proposal' : 'New Fund Proposal'} onClose={onClose} large footer={
      <><button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={busy} onClick={async()=>{ setBusy(true); try{await onSave(form);}catch(e){onError(e.message);}finally{setBusy(false);} }}>{busy?'Saving…':proposal?'Save':'Create Proposal'}</button></>
    }>
      <div className="form-group"><label className="form-label">Proposal Title *</label><input className="form-input" value={form.title} onChange={setF('title')} placeholder="Computer Lab Equipment for 3 Branches" autoFocus /></div>
      <div className="form-group"><label className="form-label">Description *</label><textarea className="form-textarea" rows={3} value={form.description} onChange={setF('description')} placeholder="Detailed description of the proposal…" /></div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">CSR Donor *</label><select className="form-select" value={form.donorId} onChange={setF('donorId')}><option value="">Select donor…</option>{donors.map(d=><option key={d._id} value={d._id}>{d.companyName}</option>)}</select></div>
        <div className="form-group"><label className="form-label">Requested Amount (₹) *</label><input className="form-input" type="number" value={form.requestedAmount} onChange={setF('requestedAmount')} /></div>
      </div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Purpose *</label><input className="form-input" value={form.purpose} onChange={setF('purpose')} placeholder="Infrastructure, Books, Uniforms…" /></div>
        <div className="form-group"><label className="form-label">Fiscal Year</label><input className="form-input" value={form.fiscalYear} onChange={setF('fiscalYear')} placeholder="2024-2025" /></div>
      </div>
      <div className="form-group">
        <label className="form-label">Target Branches</label>
        <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:4}}>
          {branches.map(b => (
            <label key={b._id} style={{display:'flex',alignItems:'center',gap:5,padding:'4px 10px',background:form.targetBranches.includes(b._id)?'var(--accent-lt)':'var(--bg2)',border:`1px solid ${form.targetBranches.includes(b._id)?'var(--accent)':'var(--border)'}`,borderRadius:20,cursor:'pointer',fontSize:'.82rem',fontWeight:500}}>
              <input type="checkbox" checked={form.targetBranches.includes(b._id)} onChange={()=>toggleBranch(b._id)} style={{display:'none'}} />
              {b.name}
            </label>
          ))}
        </div>
      </div>
      <div className="form-group"><label className="form-label">Notes</label><textarea className="form-textarea" rows={2} value={form.notes} onChange={setF('notes')} /></div>
    </Modal>
  );
}

function ApproveModal({ proposal, onClose, onApprove, onError }) {
  const [amt, setAmt]   = useState(proposal.requestedAmount);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Modal title="Approve Proposal" onClose={onClose} footer={
      <><button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-success" disabled={busy} onClick={async()=>{ setBusy(true); try{await onApprove({approvedAmount:parseFloat(amt),notes:note});}catch(e){onError(e.message);}finally{setBusy(false);} }}>{busy?'Approving…':'Approve'}</button></>
    }>
      <div className="alert alert-info" style={{marginBottom:'1rem'}}>Approving: <strong>{proposal.title}</strong></div>
      <div className="form-group"><label className="form-label">Approved Amount (₹)</label><input className="form-input" type="number" value={amt} onChange={e=>setAmt(e.target.value)} /></div>
      <div style={{fontSize:'.8rem',color:'var(--ink3)',marginBottom:'1rem'}}>Requested: {fmtINR(proposal.requestedAmount)}</div>
      <div className="form-group"><label className="form-label">Notes to Donor</label><textarea className="form-textarea" rows={2} value={note} onChange={e=>setNote(e.target.value)} /></div>
    </Modal>
  );
}

function RejectModal({ proposal, onClose, onReject, onError }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy]     = useState(false);
  return (
    <Modal title="Reject Proposal" onClose={onClose} footer={
      <><button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-danger" disabled={busy||!reason} onClick={async()=>{ setBusy(true); try{await onReject(reason);}catch(e){onError(e.message);}finally{setBusy(false);} }}>{busy?'Rejecting…':'Reject Proposal'}</button></>
    }>
      <div className="alert alert-amber" style={{marginBottom:'1rem'}}>You are about to reject: <strong>{proposal.title}</strong></div>
      <div className="form-group"><label className="form-label">Rejection Reason *</label><textarea className="form-textarea" rows={3} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Please provide a clear reason…" autoFocus /></div>
    </Modal>
  );
}
