import React, { useEffect, useState } from 'react';
import { allocationAPI, proposalAPI, branchAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { Loader, Alert, Modal, EmptyState, StatusBadge, fmtINR, fmtDate } from '../components/UI';

export default function Allocations() {
  const { isAdmin, isBranch } = useAuth();
  const [allocs,    setAllocs]    = useState([]);
  const [proposals, setProposals] = useState([]);
  const [branches,  setBranches]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState('');
  const [statusF,   setStatusF]   = useState('');
  const [showForm,  setShowForm]  = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = statusF ? { status: statusF } : {};
      const [al, pr, br] = await Promise.all([
        allocationAPI.list(params),
        proposalAPI.list({ status: 'approved' }),
        branchAPI.list(),
      ]);
      setAllocs(al.data||[]);
      setProposals((pr.data||[]).concat((proposalAPI.list({ status:'partially_approved' }) || [])));
      setBranches(br.data||[]);
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [statusF]);

  return (
    <div className="page">
      <div className="page-header">
        <div><h1 className="page-title">Fund Allocations</h1><p className="page-sub">{allocs.length} allocations</p></div>
        {isAdmin() && <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Allocate Funds</button>}
      </div>
      {error   && <Alert type="error"   onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert type="success" onClose={() => setSuccess('')}>{success}</Alert>}

      <div className="filters">
        <select className="filter-sel" value={statusF} onChange={e => setStatusF(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="allocated">Allocated</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      {loading ? <Loader /> : allocs.length === 0 ? (
        <EmptyState icon="💰" title="No allocations yet" desc={isAdmin() ? "Allocate approved proposal funds to school branches." : "No funds have been allocated to your branch yet."}
          action={isAdmin() && <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Allocate Funds</button>} />
      ) : (
        <div>
          {/* Summary cards */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:'1rem',marginBottom:'1.5rem'}}>
            {['allocated','in_progress','completed'].map(s => {
              const group = allocs.filter(a => a.status === s);
              const total = group.reduce((sum,a) => sum+a.amount, 0);
              return (
                <div key={s} className={`card card-pad fund-card ${s==='in_progress'?'amber':s==='completed'?'green':''}`}>
                  <div style={{fontSize:'.72rem',fontWeight:800,textTransform:'uppercase',letterSpacing:'.07em',color:'var(--ink3)',marginBottom:4}}>{s.replace('_',' ')}</div>
                  <div style={{fontSize:'1.2rem',fontWeight:800}}>{fmtINR(total)}</div>
                  <div style={{fontSize:'.75rem',color:'var(--ink3)'}}>{group.length} allocation{group.length!==1?'s':''}</div>
                </div>
              );
            })}
          </div>

          <div className="card">
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Proposal</th><th>Donor</th><th>Branch</th><th>Amount</th><th>Purpose</th><th>Deadline</th><th>Status</th><th>Allocated On</th></tr></thead>
                <tbody>
                  {allocs.map(a => (
                    <tr key={a._id}>
                      <td className="bold-col">{a.proposalId?.title||'—'}</td>
                      <td style={{fontSize:'.82rem'}}>{a.donorId?.companyName||'—'}</td>
                      <td><span style={{fontWeight:600}}>{a.branchId?.name||'—'}</span>{a.branchId?.code&&<span style={{fontSize:'.72rem',color:'var(--ink3)',marginLeft:4}}>({a.branchId.code})</span>}</td>
                      <td className="mono">{fmtINR(a.amount)}</td>
                      <td style={{maxWidth:140,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontSize:'.82rem'}}>{a.purpose}</td>
                      <td style={{fontSize:'.78rem',color: new Date(a.deadline)<new Date()?'var(--red)':'var(--ink3)'}}>{fmtDate(a.deadline)}</td>
                      <td><StatusBadge status={a.status} /></td>
                      <td style={{fontSize:'.75rem',color:'var(--ink3)'}}>{fmtDate(a.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <AllocationForm proposals={proposals} branches={branches} onClose={() => setShowForm(false)}
          onSave={async (data) => {
            await allocationAPI.create(data);
            setShowForm(false);
            setSuccess('Funds allocated — branch notified via email');
            load();
          }} onError={setError} />
      )}
    </div>
  );
}

function AllocationForm({ proposals, branches, onClose, onSave, onError }) {
  const [form, setForm] = useState({ proposalId:'', branchId:'', amount:'', purpose:'', deadline:'', notes:'' });
  const [busy, setBusy] = useState(false);
  const setF = k => e => setForm(f=>({...f,[k]:e.target.value}));
  const selProposal = proposals.find(p => p._id === form.proposalId);

  return (
    <Modal title="Allocate Funds to Branch" onClose={onClose} footer={
      <><button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={busy} onClick={async()=>{ setBusy(true); try{await onSave(form);}catch(e){onError(e.message);}finally{setBusy(false);} }}>{busy?'Allocating…':'Allocate Funds'}</button></>
    }>
      <div className="form-group">
        <label className="form-label">Approved Proposal *</label>
        <select className="form-select" value={form.proposalId} onChange={setF('proposalId')}>
          <option value="">Select proposal…</option>
          {proposals.map(p => <option key={p._id} value={p._id}>{p.title} — {p.donorId?.companyName||''} ({fmtINR(p.approvedAmount)})</option>)}
        </select>
      </div>
      {selProposal && <div className="alert alert-info" style={{marginBottom:'1rem'}}>Approved Amount: <strong>{fmtINR(selProposal.approvedAmount)}</strong></div>}
      <div className="form-group">
        <label className="form-label">Branch *</label>
        <select className="form-select" value={form.branchId} onChange={setF('branchId')}>
          <option value="">Select branch…</option>
          {branches.map(b => <option key={b._id} value={b._id}>{b.name} ({b.code})</option>)}
        </select>
      </div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Amount (₹) *</label><input className="form-input" type="number" value={form.amount} onChange={setF('amount')} /></div>
        <div className="form-group"><label className="form-label">Deadline *</label><input className="form-input" type="date" value={form.deadline} onChange={setF('deadline')} /></div>
      </div>
      <div className="form-group"><label className="form-label">Purpose *</label><input className="form-input" value={form.purpose} onChange={setF('purpose')} placeholder="Computer Lab equipment purchase" /></div>
      <div className="form-group"><label className="form-label">Notes</label><textarea className="form-textarea" rows={2} value={form.notes} onChange={setF('notes')} /></div>
    </Modal>
  );
}
