import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const [form, setForm]   = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy]   = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try { await login(form.email, form.password); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const demos = [
    { label: 'Admin',        email: 'admin@school.edu',       color: 'var(--accent)' },
    { label: 'CSR Coord.',   email: 'coord@school.edu',       color: 'var(--blue)' },
    { label: 'Branch User',  email: 'branch@school.edu',      color: 'var(--green)' },
    { label: 'Donor',        email: 'donor@company.com',      color: 'var(--purple)' },
  ];

  return (
    <div className="login-wrap">
      <div style={{width:'100%',maxWidth:400}}>
        <div className="login-box">
          <div className="login-brand-row">
            <div className="login-brand-icon">₹</div>
            <div>
              <div className="login-title">CSR Fund Management</div>
              <div className="login-org">Sevak Digital Technologies Pvt.Ltd</div>
            </div>
          </div>

          {error && (
            <div className="alert alert-error" style={{marginBottom:'1rem'}}>
              ⚠ {error}
            </div>
          )}

          <form onSubmit={handle}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" autoFocus
                value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))}
                placeholder="your@email.com" />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password"
                value={form.password} onChange={e => setForm(f=>({...f,password:e.target.value}))}
                placeholder="••••••••" />
            </div>
            <button className="btn btn-primary" type="submit" disabled={busy} style={{width:'100%',marginTop:4}}>
              {busy ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div style={{marginTop:'1.5rem',padding:'1rem',background:'var(--bg2)',borderRadius:'var(--radius)',fontSize:'.75rem',color:'var(--ink3)'}}>
            <div style={{fontWeight:700,color:'var(--ink2)',marginBottom:6}}>Demo accounts (password: Admin@123)</div>
            {demos.map(d => (
              <div key={d.email} style={{display:'flex',justifyContent:'space-between',marginBottom:4,cursor:'pointer'}}
                onClick={() => setForm({ email: d.email, password: 'Admin@123' })}>
                <span style={{fontWeight:600,color:d.color}}>{d.label}</span>
                <span style={{fontFamily:'var(--mono)',fontSize:'.72rem'}}>{d.email}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
