import React, { useEffect, useState } from 'react';
import { branchAPI } from '../api';
import { Loader, Alert, Modal, Confirm, EmptyState, fmtDate } from '../components/UI';

export default function Branches() {
  const [branches, setBranches] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editB,    setEditB]    = useState(null);
  const [delB,     setDelB]     = useState(null);

  const load = async () => { setLoading(true); try { const r = await branchAPI.list(); setBranches(r.data||[]); } catch(e) { setError(e.message); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);

  return (
    <div className="page">
      <div className="page-header">
        <div><h1 className="page-title">School Branches</h1><p className="page-sub">{branches.length} branches registered</p></div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Add Branch</button>
      </div>
      {error   && <Alert type="error"   onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert type="success" onClose={() => setSuccess('')}>{success}</Alert>}

      {loading ? <Loader /> : branches.length === 0 ? (
        <EmptyState icon="🏫" title="No branches yet" desc="Add school branches to enable fund allocation."
          action={<button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Add Branch</button>} />
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:'1rem'}}>
          {branches.map(b => (
            <div key={b._id} className="card card-pad fund-card blue">
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                <div>
                  <div style={{fontWeight:800,fontSize:'1rem'}}>{b.name}</div>
                  <div style={{fontFamily:'var(--mono)',fontSize:'.72rem',color:'var(--ink3)',marginTop:1}}>{b.code}</div>
                </div>
                <div style={{display:'flex',gap:4}}>
                  <button className="btn btn-ghost btn-xs" onClick={() => setEditB(b)}>Edit</button>
                  <button className="btn btn-danger btn-xs" onClick={() => setDelB(b)}>✕</button>
                </div>
              </div>
              {b.city && <div style={{fontSize:'.82rem',color:'var(--ink2)',marginBottom:4}}>📍 {b.city}{b.state?`, ${b.state}`:''}</div>}
              {b.principalName && <div style={{fontSize:'.82rem',color:'var(--ink2)',marginBottom:4}}>👤 {b.principalName}</div>}
              {b.phone && <div style={{fontSize:'.82rem',color:'var(--ink2)',marginBottom:4}}>📞 {b.phone}</div>}
              {b.email && <div style={{fontSize:'.82rem',color:'var(--ink2)'}}>{b.email}</div>}
            </div>
          ))}
        </div>
      )}

      {(showForm||editB) && (
        <BranchForm branch={editB} onClose={() => { setShowForm(false); setEditB(null); }}
          onSave={async (data) => {
            editB ? await branchAPI.update(editB._id, data) : await branchAPI.create(data);
            setShowForm(false); setEditB(null);
            setSuccess(editB ? 'Branch updated' : 'Branch created');
            load();
          }} onError={setError} />
      )}

      {delB && <Confirm title="Delete Branch" message="Remove this branch?" name={delB.name}
        onConfirm={async () => { await branchAPI.delete(delB._id); setDelB(null); setSuccess('Branch deleted'); load(); }}
        onClose={() => setDelB(null)} />}
    </div>
  );
}

function BranchForm({ branch, onClose, onSave, onError }) {
  const [form, setForm] = useState(branch||{ name:'',code:'',address:'',city:'',state:'',principalName:'',phone:'',email:'' });
  const [busy, setBusy] = useState(false);
  const setF = k => e => setForm(f=>({...f,[k]:e.target.value}));
  return (
    <Modal title={branch?'Edit Branch':'Add School Branch'} onClose={onClose} footer={
      <><button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={busy} onClick={async()=>{ setBusy(true); try{await onSave(form);}catch(e){onError(e.message);}finally{setBusy(false);} }}>{busy?'Saving…':branch?'Save':'Add Branch'}</button></>
    }>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Branch Name *</label><input className="form-input" value={form.name} onChange={setF('name')} placeholder="Gachibowli Campus" autoFocus /></div>
        <div className="form-group"><label className="form-label">Branch Code *</label><input className="form-input" value={form.code} onChange={setF('code')} placeholder="GCB-001" /></div>
      </div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">City</label><input className="form-input" value={form.city} onChange={setF('city')} /></div>
        <div className="form-group"><label className="form-label">State</label><input className="form-input" value={form.state} onChange={setF('state')} /></div>
      </div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Principal Name</label><input className="form-input" value={form.principalName} onChange={setF('principalName')} /></div>
        <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={form.phone} onChange={setF('phone')} /></div>
      </div>
      <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={form.email} onChange={setF('email')} /></div>
      <div className="form-group"><label className="form-label">Address</label><textarea className="form-textarea" rows={2} value={form.address} onChange={setF('address')} /></div>
    </Modal>
  );
}
