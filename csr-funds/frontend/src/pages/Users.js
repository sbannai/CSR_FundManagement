import React, { useEffect, useState } from 'react';
import { authAPI, branchAPI, donorAPI } from '../api';
import { Loader, Alert, Modal, RoleBadge, fmtDateTime } from '../components/UI';

const ROLES = ['admin','csr_coordinator','branch_user','donor'];

export default function Users() {
  const [users,    setUsers]    = useState([]);
  const [branches, setBranches] = useState([]);
  const [donors,   setDonors]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editU,    setEditU]    = useState(null);
  const [roleF,    setRoleF]    = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [ur, br, dr] = await Promise.all([ authAPI.users(), branchAPI.list(), donorAPI.list() ]);
      setUsers(ur.data||[]); setBranches(br.data||[]); setDonors(dr.data||[]);
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = roleF ? users.filter(u => u.role === roleF) : users;

  return (
    <div className="page">
      <div className="page-header">
        <div><h1 className="page-title">User Management</h1><p className="page-sub">{users.length} users</p></div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Add User</button>
      </div>
      {error   && <Alert type="error"   onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert type="success" onClose={() => setSuccess('')}>{success}</Alert>}

      <div className="filters">
        <select className="filter-sel" value={roleF} onChange={e => setRoleF(e.target.value)}>
          <option value="">All Roles</option>
          {ROLES.map(r => <option key={r} value={r}>{r.replace('_',' ')}</option>)}
        </select>
      </div>

      {/* Role counts */}
      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:'1rem'}}>
        {ROLES.map(r => { const c = users.filter(u=>u.role===r).length; return c>0 && (
          <div key={r} style={{display:'flex',alignItems:'center',gap:6,background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'4px 10px'}}>
            <RoleBadge role={r} /><span style={{fontFamily:'var(--mono)',fontSize:'.75rem',color:'var(--ink3)'}}>{c}</span>
          </div>
        ); })}
      </div>

      {loading ? <Loader /> : (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Branch/Donor</th><th>Status</th><th>Last Login</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u._id}>
                    <td className="bold-col">{u.name}</td>
                    <td style={{fontSize:'.82rem'}}>{u.email}</td>
                    <td><RoleBadge role={u.role} /></td>
                    <td style={{fontSize:'.82rem',color:'var(--ink3)'}}>{u.branchId?.name||u.donorId?.companyName||'—'}</td>
                    <td><span className={`badge ${u.isActive?'badge-green':'badge-red'}`}>{u.isActive?'Active':'Disabled'}</span></td>
                    <td style={{fontSize:'.72rem',color:'var(--ink3)',fontFamily:'var(--mono)'}}>{fmtDateTime(u.lastLogin)||'Never'}</td>
                    <td><button className="btn btn-ghost btn-xs" onClick={() => setEditU(u)}>Edit</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && <UserForm branches={branches} donors={donors} onClose={() => setShowForm(false)}
        onSave={async (d) => { await authAPI.createUser(d); setShowForm(false); setSuccess('User created'); load(); }}
        onError={setError} />}

      {editU && <UserForm user={editU} branches={branches} donors={donors} onClose={() => setEditU(null)}
        onSave={async (d) => { await authAPI.updateUser(editU._id, d); setEditU(null); setSuccess('User updated'); load(); }}
        onError={setError} />}
    </div>
  );
}

function UserForm({ user, branches, donors, onClose, onSave, onError }) {
  const [form, setForm] = useState(user ? { name:user.name, role:user.role, branchId:user.branchId?._id||'', donorId:user.donorId?._id||'', isActive:user.isActive } : { name:'', email:'', password:'', role:'branch_user', branchId:'', donorId:'' });
  const [busy, setBusy] = useState(false);
  const setF = k => e => setForm(f=>({...f,[k]:e.target.type==='checkbox'?e.target.checked:e.target.value}));
  return (
    <Modal title={user?`Edit — ${user.name}`:'Add New User'} onClose={onClose} footer={
      <><button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={busy} onClick={async()=>{ setBusy(true); try{await onSave(form);}catch(e){onError(e.message);}finally{setBusy(false);} }}>{busy?'Saving…':user?'Save':'Create User'}</button></>
    }>
      <div className="form-group"><label className="form-label">Full Name *</label><input className="form-input" value={form.name} onChange={setF('name')} autoFocus /></div>
      {!user && <>
        <div className="form-group"><label className="form-label">Email *</label><input className="form-input" type="email" value={form.email} onChange={setF('email')} /></div>
        <div className="form-group"><label className="form-label">Password *</label><input className="form-input" type="password" value={form.password} onChange={setF('password')} /></div>
      </>}
      <div className="form-row">
        <div className="form-group"><label className="form-label">Role *</label>
          <select className="form-select" value={form.role} onChange={setF('role')}>
            {ROLES.map(r => <option key={r} value={r}>{r.replace('_',' ')}</option>)}
          </select>
        </div>
        {form.role==='branch_user' && (
          <div className="form-group"><label className="form-label">Branch</label>
            <select className="form-select" value={form.branchId} onChange={setF('branchId')}>
              <option value="">Select branch…</option>
              {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
            </select>
          </div>
        )}
        {form.role==='donor' && (
          <div className="form-group"><label className="form-label">Donor Company</label>
            <select className="form-select" value={form.donorId} onChange={setF('donorId')}>
              <option value="">Select donor…</option>
              {donors.map(d => <option key={d._id} value={d._id}>{d.companyName}</option>)}
            </select>
          </div>
        )}
      </div>
      {user && <label style={{display:'flex',alignItems:'center',gap:8,fontSize:'.875rem',cursor:'pointer',marginTop:4}}><input type="checkbox" checked={!!form.isActive} onChange={setF('isActive')} /> Account Active</label>}
    </Modal>
  );
}
