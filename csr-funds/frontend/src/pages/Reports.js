import React, { useEffect, useState } from 'react';
import { reportAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { Loader, Alert, StatusBadge, fmtINR, fmtDate, UtilBar } from '../components/UI';

export default function Reports() {
  const { isAdmin, isCoord, isDonor, user } = useAuth();
  const [tab,        setTab]        = useState('fund-flow');
  const [fundFlow,   setFundFlow]   = useState([]);
  const [branchSum,  setBranchSum]  = useState([]);
  const [comms,      setComms]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');

  useEffect(() => {
    const loads = [
      reportAPI.fundFlow().then(r => setFundFlow(r.data||[])),
    ];
    if (isAdmin()||isCoord()) {
      loads.push(reportAPI.branchSummary().then(r => setBranchSum(r.data||[])));
      loads.push(reportAPI.communications().then(r => setComms(r.data||[])));
    }
    if (isDonor() && user?.donorId) {
      loads.push(reportAPI.donorReport(user.donorId?._id||user.donorId).then(r => setFundFlow(r.data?.proposals||[])));
    }
    Promise.all(loads).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  const tabs = [
    { id:'fund-flow',   label:'Fund Flow',        show: true },
    { id:'branch',      label:'Branch Summary',   show: isAdmin()||isCoord() },
    { id:'comms',       label:'Communications',   show: isAdmin() },
  ].filter(t => t.show);

  return (
    <div className="page">
      <div className="page-header">
        <div><h1 className="page-title">Reports & Transparency</h1><p className="page-sub">End-to-end CSR fund tracking</p></div>
      </div>
      {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}

      {/* Tab nav */}
      <div style={{display:'flex',gap:0,borderBottom:'2px solid var(--border)',marginBottom:'1.5rem'}}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{padding:'8px 18px',background:'none',border:'none',fontFamily:'var(--font)',fontSize:'.875rem',fontWeight:tab===t.id?700:500,color:tab===t.id?'var(--accent)':'var(--ink3)',borderBottom:tab===t.id?'2px solid var(--accent)':'2px solid transparent',marginBottom:-2,cursor:'pointer',textTransform:'capitalize'}}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? <Loader /> : (
        <>
          {/* Fund Flow */}
          {tab==='fund-flow' && (
            <div>
              {fundFlow.length === 0 ? (
                <div style={{color:'var(--ink3)',padding:'3rem',textAlign:'center'}}>No fund flow data available.</div>
              ) : fundFlow.map(p => (
                <div key={p._id} className="card" style={{marginBottom:'1rem'}}>
                  <div className="card-header">
                    <div>
                      <div style={{fontWeight:700}}>{p.title}</div>
                      <div style={{fontSize:'.78rem',color:'var(--ink3)',marginTop:2}}>
                        {p.donorId?.companyName} · FY {p.fiscalYear||'—'} · <StatusBadge status={p.status} />
                      </div>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <div style={{fontFamily:'var(--mono)',fontWeight:800,fontSize:'1.1rem'}}>{fmtINR(p.approvedAmount||p.requestedAmount)}</div>
                      <div style={{fontSize:'.72rem',color:'var(--ink3)'}}>Approved</div>
                    </div>
                  </div>
                  <div className="card-pad">
                    {/* Top-level utilization bar */}
                    <UtilBar allocated={p.totalAllocated||0} utilized={p.totalUtilized||0} />

                    {/* Branch allocations */}
                    {(p.allocations||[]).length > 0 && (
                      <div style={{marginTop:'1rem'}}>
                        <div style={{fontSize:'.72rem',fontWeight:800,textTransform:'uppercase',letterSpacing:'.07em',color:'var(--ink3)',marginBottom:8}}>Branch Allocations</div>
                        <div style={{display:'flex',flexDirection:'column',gap:8}}>
                          {p.allocations.map(a => (
                            <div key={a._id} style={{padding:'10px 12px',background:'var(--bg2)',borderRadius:'var(--radius)',display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
                              <div style={{minWidth:140}}>
                                <div style={{fontWeight:700,fontSize:'.83rem'}}>{a.branchId?.name||'—'}</div>
                                <div style={{fontSize:'.72rem',color:'var(--ink3)'}}>{a.branchId?.code}</div>
                              </div>
                              <div style={{flex:1,minWidth:160}}>
                                <UtilBar allocated={a.amount} utilized={a.utilized||0} />
                              </div>
                              <div style={{textAlign:'right',minWidth:120}}>
                                <StatusBadge status={a.status} />
                                <div style={{fontSize:'.72rem',color:'var(--ink3)',marginTop:3}}>Deadline: {fmtDate(a.deadline)}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Branch Summary */}
          {tab==='branch' && (
            <div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:'1rem'}}>
                {branchSum.map(b => (
                  <div key={b._id} className="card card-pad">
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
                      <div>
                        <div style={{fontWeight:800}}>{b.name}</div>
                        <div style={{fontSize:'.72rem',color:'var(--ink3)',fontFamily:'var(--mono)'}}>{b.code}</div>
                      </div>
                      <div style={{textAlign:'right'}}>
                        <div style={{fontSize:'1.1rem',fontWeight:800,fontFamily:'var(--mono)'}}>{b.utilizationRate}%</div>
                        <div style={{fontSize:'.68rem',color:'var(--ink3)'}}>utilized</div>
                      </div>
                    </div>
                    <UtilBar allocated={b.totalAllocated} utilized={b.totalUtilized} />
                    <div style={{display:'flex',justifyContent:'space-between',marginTop:8,fontSize:'.75rem',color:'var(--ink3)'}}>
                      <span>Allocated: {fmtINR(b.totalAllocated)}</span>
                      <span>Remaining: {fmtINR(b.remaining)}</span>
                    </div>
                    {b.pendingBills > 0 && <div style={{marginTop:6,padding:'4px 8px',background:'var(--amber-lt)',borderRadius:4,fontSize:'.72rem',color:'var(--amber)',fontWeight:700}}>⏳ {b.pendingBills} pending verification</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Communications */}
          {tab==='comms' && (
            <div className="card">
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Type</th><th>Subject</th><th>To</th><th>Donor</th><th>Sent By</th><th>Status</th><th>Date</th></tr></thead>
                  <tbody>
                    {comms.map(c => (
                      <tr key={c._id}>
                        <td><span className="badge badge-blue" style={{textTransform:'capitalize'}}>{c.type}</span></td>
                        <td style={{maxWidth:220,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontWeight:600}}>{c.subject}</td>
                        <td style={{fontSize:'.78rem',color:'var(--ink3)'}}>{(c.recipients||[]).join(', ')}</td>
                        <td style={{fontSize:'.82rem'}}>{c.donorId?.companyName||'—'}</td>
                        <td style={{fontSize:'.82rem'}}>{c.sentBy?.name||'System'}</td>
                        <td><span className={`badge ${c.status==='sent'?'badge-green':c.status==='mock'?'badge-amber':'badge-red'}`}>{c.status}</span></td>
                        <td style={{fontSize:'.75rem',color:'var(--ink3)'}}>{fmtDate(c.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
