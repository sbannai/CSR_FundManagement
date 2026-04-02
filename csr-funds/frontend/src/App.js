import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Donors from './pages/Donors';
import Proposals from './pages/Proposals';
import Allocations from './pages/Allocations';
import Utilizations from './pages/Utilizations';
import Reports from './pages/Reports';
import Branches from './pages/Branches';
import Users from './pages/Users';
import './styles.css';

function Shell() {
  const { user, loading, logout, isAdmin, isCoord, isBranch, isDonor, canManage } = useAuth();
  const [page,       setPage]      = useState('dashboard');
  const [detailId,   setDetailId]  = useState(null);

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh'}}><div className="spin" /></div>;
  if (!user)   return <Login />;

  const navigate = (target, id = null) => { setPage(target); if (id) setDetailId(id); };

  const ROLE_COLORS = { admin:'var(--role-admin)', csr_coordinator:'var(--role-csr)', branch_user:'var(--role-branch)', donor:'var(--role-donor)' };

  const navGroups = [
    {
      label: 'Main',
      items: [
        { id:'dashboard',   label:'Dashboard',     icon:'⊞', show: true },
        { id:'reports',     label:'Reports',       icon:'📊', show: true },
      ]
    },
    {
      label: 'CSR Management',
      items: [
        { id:'donors',      label:'Donors',        icon:'🏢', show: canManage() },
        { id:'proposals',   label:'Proposals',     icon:'📋', show: canManage() || isDonor() },
        { id:'allocations', label:'Allocations',   icon:'💰', show: isAdmin() || isBranch() },
        { id:'utilizations',label:'Utilizations',  icon:'📤', show: true },
      ]
    },
    {
      label: 'Administration',
      items: [
        { id:'branches',    label:'Branches',      icon:'🏫', show: isAdmin() || isCoord() },
        { id:'users',       label:'Users',         icon:'👥', show: isAdmin() },
      ]
    },
  ];

  const pageMap = {
    dashboard:    <Dashboard   navigate={navigate} />,
    donors:       <Donors />,
    proposals:    <Proposals   navigate={navigate} />,
    allocations:  <Allocations />,
    utilizations: <Utilizations />,
    reports:      <Reports />,
    branches:     <Branches />,
    users:        <Users />,
  };

  return (
    <div className="app-shell">
      {/* Topbar */}
      <header className="topbar">
        <div className="topbar-brand" onClick={() => navigate('dashboard')}>
          <div className="brand-icon">₹</div>
          <div>
            <div className="brand-text">CSR Fund Management</div>
            <div className="brand-sub">Sevak Digital Technologies</div>
          </div>
        </div>

        <div className="topbar-right">
          <div className="user-pill">
            <div className="role-pip" style={{background: ROLE_COLORS[user.role] || 'var(--accent)'}} />
            <span>{user.name?.split(' ')[0]}</span>
            <span style={{fontSize:'.72rem',color:'var(--ink3)',textTransform:'capitalize'}}>{user.role?.replace('_',' ')}</span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={logout} title="Sign out">↩</button>
        </div>
      </header>

      <div className="app-body">
        {/* Sidebar */}
        <aside className="sidebar">
          {navGroups.map(group => {
            const visible = group.items.filter(i => i.show);
            if (!visible.length) return null;
            return (
              <div key={group.label} className="sidebar-section">
                <div className="sidebar-label">{group.label}</div>
                {visible.map(item => (
                  <button key={item.id} className={`nav-item ${page === item.id ? 'active' : ''}`} onClick={() => navigate(item.id)}>
                    <span className="nav-icon">{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>
            );
          })}

          {/* Bottom user info */}
          <div style={{marginTop:'auto',padding:'1rem',borderTop:'1px solid var(--border)'}}>
            <div style={{fontSize:'.72rem',color:'var(--ink3)',marginBottom:3}}>Signed in as</div>
            <div style={{fontWeight:700,fontSize:'.83rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user.name}</div>
            {user.branchId && <div style={{fontSize:'.72rem',color:'var(--ink3)',marginTop:1}}>🏫 {user.branchId?.name}</div>}
            {user.donorId  && <div style={{fontSize:'.72rem',color:'var(--ink3)',marginTop:1}}>🏢 {user.donorId?.companyName}</div>}
            <div style={{marginTop:5,display:'flex',alignItems:'center',gap:5}}>
              <div style={{width:7,height:7,borderRadius:'50%',background:ROLE_COLORS[user.role]}} />
              <span style={{fontSize:'.7rem',color:ROLE_COLORS[user.role],fontWeight:700,textTransform:'capitalize'}}>{user.role?.replace('_',' ')}</span>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="main-panel">
          {pageMap[page] || pageMap['dashboard']}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return <AuthProvider><Shell /></AuthProvider>;
}
