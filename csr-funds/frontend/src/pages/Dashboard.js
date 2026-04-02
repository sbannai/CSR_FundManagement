import React, { useEffect, useState } from 'react';
import { reportAPI, proposalAPI, allocationAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { Loader, fmtINR, fmtDate, StatusBadge, ProgressBar, UtilBar } from '../components/UI';

export default function Dashboard({ navigate }) {
  const { user, isAdmin, isCoord, isBranch, isDonor } = useAuth();
  const [stats,     setStats]     = useState(null);
  const [recent,    setRecent]    = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([
      reportAPI.dashboard().then(r => setStats(r.data)),
      isAdmin() || isCoord()
        ? proposalAPI.list({ limit: 6 }).then(r => setRecent(r.data || []))
        : isBranch()
        ? allocationAPI.list({ limit: 6 }).then(r => setRecent(r.data || []))
        : Promise.resolve(),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome back, {user?.name?.split(' ')[0]}</h1>
          <p className="page-sub">CSR Fund Management Dashboard</p>
        </div>
        {(isAdmin() || isCoord()) && (
          <button className="btn btn-primary" onClick={() => navigate('proposals')}>+ New Proposal</button>
        )}
        {isBranch() && (
          <button className="btn btn-primary" onClick={() => navigate('utilizations')}>+ Update Utilization</button>
        )}
      </div>

      {/* Admin / Coordinator stats */}
      {(isAdmin() || isCoord()) && stats && (
        <>
          <div className="stats-row">
            <StatCard val={stats.donors}     lbl="Total Donors"    icon="🏢" color="var(--accent)" />
            <StatCard val={stats.branches}   lbl="Active Branches" icon="🏫" color="var(--blue)" />
            <StatCard val={stats.proposals?.total || 0} lbl="Proposals" icon="📋" color="var(--purple)" />
            <StatCard val={stats.proposals?.approved || 0} lbl="Approved" icon="✅" color="var(--green)" />
            <StatCard val={fmtINR(stats.allocations?.totalAllocated||0)} lbl="Total Allocated" icon="💰" color="var(--amber)" />
            <StatCard val={`${stats.utilizationRate||0}%`} lbl="Utilization Rate" icon="📊" color="var(--teal)" />
          </div>

          {/* Fund pipeline */}
          <div className="card card-pad" style={{marginBottom:'1.5rem'}}>
            <div className="card-title" style={{marginBottom:'1rem'}}>Fund Flow Pipeline</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
              {[
                { label:'Submitted', val: stats.proposals?.submitted||0, color:'var(--blue)', icon:'📥' },
                { label:'Approved',  val: fmtINR(stats.allocations?.totalAllocated||0), color:'var(--green)', icon:'✅' },
                { label:'Utilized',  val: fmtINR(stats.utilizations?.totalUtilized||0), color:'var(--accent)', icon:'📤' },
                { label:'Pending Verification', val: stats.utilizations?.pending?.count||0, color:'var(--amber)', icon:'⏳' },
              ].map(step => (
                <div key={step.label} className="card card-pad" style={{borderTop:`3px solid ${step.color}`,textAlign:'center'}}>
                  <div style={{fontSize:'1.4rem',marginBottom:4}}>{step.icon}</div>
                  <div style={{fontSize:'1.2rem',fontWeight:800,color:step.color}}>{step.val}</div>
                  <div style={{fontSize:'.72rem',color:'var(--ink3)',fontWeight:700,textTransform:'uppercase',letterSpacing:'.05em',marginTop:3}}>{step.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Proposals */}
          {recent.length > 0 && (
            <div className="card">
              <div className="card-header">
                <span className="card-title">Recent Proposals</span>
                <button className="btn btn-ghost btn-sm" onClick={() => navigate('proposals')}>View All →</button>
              </div>
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Title</th><th>Donor</th><th>Requested</th><th>Status</th><th>Date</th></tr></thead>
                  <tbody>
                    {recent.map(p => (
                      <tr key={p._id} style={{cursor:'pointer'}} onClick={() => navigate('proposal-detail', p._id)}>
                        <td className="bold-col">{p.title}</td>
                        <td>{p.donorId?.companyName||'—'}</td>
                        <td className="mono">{fmtINR(p.requestedAmount)}</td>
                        <td><StatusBadge status={p.status} /></td>
                        <td style={{fontSize:'.78rem',color:'var(--ink3)'}}>{fmtDate(p.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Branch user stats */}
      {isBranch() && stats && (
        <>
          <div className="stats-row">
            <StatCard val={fmtINR(stats.totalAllocated)}   lbl="Total Allocated"  icon="💰" color="var(--blue)" />
            <StatCard val={fmtINR(stats.totalUtilized)}    lbl="Amount Utilized"  icon="📤" color="var(--green)" />
            <StatCard val={fmtINR(stats.remaining)}        lbl="Remaining"        icon="🏦" color="var(--accent)" />
            <StatCard val={`${stats.utilizationRate||0}%`} lbl="Utilization Rate" icon="📊" color="var(--teal)" />
          </div>
          <div className="card card-pad">
            <div className="card-title" style={{marginBottom:12}}>Overall Utilization</div>
            <UtilBar allocated={stats.totalAllocated} utilized={stats.totalUtilized} />
          </div>
          {recent.length > 0 && (
            <div className="card" style={{marginTop:'1rem'}}>
              <div className="card-header">
                <span className="card-title">My Allocations</span>
                <button className="btn btn-ghost btn-sm" onClick={() => navigate('allocations')}>View All →</button>
              </div>
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Proposal</th><th>Amount</th><th>Purpose</th><th>Deadline</th><th>Status</th></tr></thead>
                  <tbody>
                    {recent.map(a => (
                      <tr key={a._id}>
                        <td className="bold-col">{a.proposalId?.title||'—'}</td>
                        <td className="mono">{fmtINR(a.amount)}</td>
                        <td style={{maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.purpose}</td>
                        <td style={{fontSize:'.78rem'}}>{fmtDate(a.deadline)}</td>
                        <td><StatusBadge status={a.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Donor stats */}
      {isDonor() && stats && (
        <div className="stats-row">
          <StatCard val={stats.proposals}    lbl="My Proposals"    icon="📋" color="var(--purple)" />
          <StatCard val={stats.approved}     lbl="Approved"        icon="✅" color="var(--green)" />
          <StatCard val={fmtINR(stats.totalAllocated)} lbl="Funds Allocated" icon="💰" color="var(--blue)" />
          <StatCard val={fmtINR(stats.totalUtilized)}  lbl="Funds Utilized"  icon="📤" color="var(--accent)" />
          <StatCard val={`${stats.utilizationRate||0}%`} lbl="Utilization"   icon="📊" color="var(--teal)" />
        </div>
      )}
    </div>
  );
}

function StatCard({ val, lbl, icon, color }) {
  return (
    <div className="stat-card">
      <div className="stat-val" style={{color}}>{val}</div>
      <div className="stat-lbl">{lbl}</div>
      <div className="stat-icon">{icon}</div>
    </div>
  );
}
