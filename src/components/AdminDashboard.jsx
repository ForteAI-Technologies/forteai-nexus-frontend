import './Dashboard.css';
import './AdminDashboard.css';
import { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
// Admin report export is handled within CompanyReports component
import CompanyReports from './CompanyReports';
import Sidebar from './Sidebar';
import BulkDownloadReports from './BulkDownloadReports';

const AdminDashboard = ({ user, onLogout, token }) => {
  const [active, setActive] = useState(null);
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [companySelected, setCompanySelected] = useState(false);
  const [newCompany, setNewCompany] = useState({ company: '' });
  const [newCompanyHR, setNewCompanyHR] = useState({ employeesID: '', password: '', name: '', email: '' });
  const [addCompanyResult, setAddCompanyResult] = useState(null);

  useEffect(() => {
    const savedActive = localStorage.getItem('admin_dashboard_active_section');
    if (savedActive) setActive(savedActive);
  }, []);

  const handleSetActive = (section) => {
    setActive(section);
    localStorage.setItem('admin_dashboard_active_section', section);
  };

  const submitAddCompany = async () => {
    if (!newCompany.company) {
      return setAddCompanyResult({ text: 'Company name required', status: 400 });
    }

    try {
      const resp = await fetch(`${import.meta.env.VITE_API_BASE_URL}/admin/companies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' },
        body: JSON.stringify(newCompany),
      });

      let message;
      const ct = resp.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        const data = await resp.json();
        message = data.detail || data.message || JSON.stringify(data);
      } else {
        message = await resp.text();
      }

      setAddCompanyResult({ text: message, status: resp.status });

      if (resp.ok) {
        // If HR info provided, create HR
        let hrMessage = null;
        if (newCompanyHR?.employeesID) {
          try {
            const hrResp = await fetch(`${import.meta.env.VITE_API_BASE_URL}/admin/company/${encodeURIComponent(newCompany.company)}/hr`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' },
              body: JSON.stringify({ ...newCompanyHR, role: 'HR' }),
            });

            if (hrResp.ok) hrMessage = ' and HR created';
            else {
              const ctHr = hrResp.headers.get('content-type') || '';
              const txt = ctHr.includes('application/json')
                ? (await hrResp.json()).message || JSON.stringify(await hrResp.json())
                : await hrResp.text();
              hrMessage = `; but HR creation failed: ${txt}`;
            }
          } catch (e) {
            hrMessage = '; but HR creation failed: ' + e.message;
          }
        }

        setAddCompanyResult({ text: 'Company added' + (hrMessage || ''), status: resp.status });

        // Clear form and close modal
        setNewCompany({ company: '' });
        setNewCompanyHR({ employeesID: '', password: '', name: '', email: '' });

        setTimeout(() => {
          setShowAddCompany(false);
          setAddCompanyResult(null);
          window.location.reload(); // refresh companies list
        }, 1100);
      }
    } catch (err) {
      setAddCompanyResult({ text: 'Add company failed: ' + err.message, status: 500 });
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar user={user} token={token} onLogout={onLogout} activeSection={active} onSectionChange={handleSetActive} />

      <div className="dashboard-container">
        <div className="dashboard-background">
          <div className="dashboard-sphere"></div>
        </div>

        <main className="dashboard-main">
          <div className="dashboard-card">
            <div className="role-header">
              <h2 className="role-title">Admin Dashboard</h2>
              <p className="role-description">Administrator control panel</p>
            </div>

            <div className="dashboard-content">
              <div className="admin-dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="admin-companies-title">Companies</h3>
                  {!companySelected && (
                        // group add and bulk download buttons
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          <button
                        onClick={() => setShowAddCompany(true)}
                        style={{
                          background: '#8b5cf6',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '10px 16px',
                          fontSize: '14px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: '0.2s ease'
                        }}
                        onMouseOver={e => e.target.style.background = '#7c3aed'}
                        onMouseOut={e => e.target.style.background = '#8b5cf6'}
                      >
                        Add Company
                      </button>
                          <BulkDownloadReports token={token} />
                        </div>
                      )}
              </div>

              <CompanyList
                token={token}
                onSelect={() => setCompanySelected(true)}
                onDeselect={() => setCompanySelected(false)}
              />

              {showAddCompany && (
                <div className="modal-overlay">
                  <div className="modal-card">
                    <button
                      className="modal-close-circle"
                      onClick={() => {
                        setShowAddCompany(false);
                        setNewCompany({ company: '' });
                        setNewCompanyHR({ employeesID: '', password: '', name: '', email: '' });
                        setAddCompanyResult(null);
                      }}
                      aria-label="Close"
                    >
                      ✕
                    </button>

                    <h3>Add New Employee</h3>

                    <div className="field-grid">
                      <input
                        className="full"
                        placeholder="employeesID"
                        value={newCompanyHR.employeesID}
                        onChange={(e) => setNewCompanyHR({ ...newCompanyHR, employeesID: e.target.value })}
                      />
                      <input
                        placeholder="Password"
                        type="password"
                        value={newCompanyHR.password}
                        onChange={(e) => setNewCompanyHR({ ...newCompanyHR, password: e.target.value })}
                      />
                      <input placeholder="name" value={newCompanyHR.name} onChange={(e) => setNewCompanyHR({ ...newCompanyHR, name: e.target.value })} />
                      <input placeholder="email" value={newCompanyHR.email} onChange={(e) => setNewCompanyHR({ ...newCompanyHR, email: e.target.value })} />
                      <input placeholder="role" value="HR" disabled style={{ background: '#f3f4f6' }} />
                      <input className="full" placeholder="Company name" value={newCompany.company} onChange={(e) => setNewCompany({ company: e.target.value })} />
                    </div>

                    <div className="action-row">
                      <button
                        className="action-button secondary"
                        onClick={() => {
                          setShowAddCompany(false);
                          setNewCompany({ company: '' });
                          setNewCompanyHR({ employeesID: '', password: '', name: '', email: '' });
                          setAddCompanyResult(null);
                        }}
                      >
                        Cancel
                      </button>
                      <button className="action-button primary" onClick={submitAddCompany}>
                        Add
                      </button>
                    </div>

                    {addCompanyResult && (
                      <div
                        style={{ marginTop: 10 }}
                        className={`message ${addCompanyResult.status >= 400 ? 'error-message' : 'success-message'}`}
                      >
                        {addCompanyResult.text}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;

// ------------------- CompanyList -------------------

function CompanyList({ token, onSelect, onDeselect }) {
  const [companies, setCompanies] = useState([]);
  const [companiesToShow, setCompaniesToShow] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [employeesByCompany, setEmployeesByCompany] = useState({});
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [showCompanyReport, setShowCompanyReport] = useState(false);
  const [autoDownloadReport, setAutoDownloadReport] = useState(false);
  const [reportStatus, setReportStatus] = useState({ total: 0, filled: 0 });
  const [companyReport, setCompanyReport] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [companyHasFeedback, setCompanyHasFeedback] = useState({});
  // track per-company feedback counts: { [company]: { total, filled } }
  const [feedbackStats, setFeedbackStats] = useState({});
  const [reportReady, setReportReady] = useState({});
  const [feedbackList, setFeedbackList] = useState(null);
  const [filledFeedback, setFilledFeedback] = useState([]);
  const [feedbackIndex, setFeedbackIndex] = useState(0);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState(null);
  const [missingHRs, setMissingHRs] = useState([]);
  const [companySearch, setCompanySearch] = useState('');
  const [sortOrder, setSortOrder] = useState(null); // 'asc' or 'desc'
  const [showMissingWarning, setShowMissingWarning] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchCompanies = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/admin/companies`, { headers: { Authorization: token ? `Bearer ${token}` : '' } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          setCompanies(data.companies || []);
          setCompaniesToShow(data.companies || []); // init
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchCompanies();
    return () => { cancelled = true };
  }, [token]);

  useEffect(() => {
    if (companies.length > 0) {
      const filterCompanies = async () => {
        const valid = [];
        await Promise.all(
          companies.map(async (c) => {
            const name = c.company || c;
            try {
              const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/admin/company/${encodeURIComponent(name)}/employees`, { headers: { Authorization: token ? `Bearer ${token}` : '' } });
              if (res.ok) {
                const data = await res.json();
                if (data.success && data.employees.every(emp => emp.role !== 'Admin')) {
                  valid.push(c);
                }
              }
            } catch {}
          })
        );
        setCompaniesToShow(valid);
      };
      filterCompanies();
    }
  }, [companies, token]);

  useEffect(() => {
    if (companies.length > 0) {
      companies.forEach((c) => {
        const name = c.company || c;
        fetch(`${import.meta.env.VITE_API_BASE_URL}/admin/company/${encodeURIComponent(name)}/feedback`, { headers: { Authorization: token ? `Bearer ${token}` : '' } })
          .then(res => res.json())
          .then(data => {
            if (data.success && Array.isArray(data.feedbackList)) {
              const total = data.feedbackList.length;
              const filled = data.feedbackList.reduce((count, fl) => (
                Array.isArray(fl.feedback) && fl.feedback.some(item => item.answer && item.answer.trim() !== '')
                  ? count + 1 : count
              ), 0);
              // update stats and boolean flag
              setFeedbackStats(prev => ({ ...prev, [name]: { total, filled } }));
              setCompanyHasFeedback(prev => ({ ...prev, [name]: filled > 0 }));
            }
          })
          .catch(() => {});
      });
    }
  }, [companies, token]);
  // fetch report readiness for each company (all sections filled)
  useEffect(() => {
    companiesToShow.forEach(async (c) => {
      const name = c.company || c;
      try {
 const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/admin/company/${encodeURIComponent(name)}/report/status`, { headers: { Authorization: token ? `Bearer ${token}` : '' } });
        const data = res.ok ? await res.json() : null;
        setReportReady(prev => ({
          ...prev,
          [name]: res.ok && data.filled === data.total
        }));
      } catch {
        setReportReady(prev => ({ ...prev, [name]: false }));
      }
    });
  }, [companiesToShow, token]);

  // Function to fetch detailed HR feedback for a company
  const fetchFeedback = async (company) => {
    setFeedbackLoading(true);
    setFeedbackError(null);
    try {
  const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/admin/company/${encodeURIComponent(company)}/feedback`, { headers: { Authorization: token ? `Bearer ${token}` : '' } });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to load feedback');
      const allList = data.feedbackList || [];
      setFeedbackList(allList);
      // separate filled and missing
      const filled = allList.filter(fl => fl.feedback.some(item => item.answer && item.answer.trim() !== ''));
      const missing = allList.filter(fl => !fl.feedback.some(item => item.answer && item.answer.trim() !== ''));
      setFilledFeedback(filled);
      setMissingHRs(missing.map(fl => fl.employeesID));
      setShowMissingWarning(false);
      setFeedbackIndex(0);
    } catch (err) {
      setFeedbackError(err.message || 'Failed to load feedback');
    } finally {
      setFeedbackLoading(false);
    }
  };

  // Function to download PDF of all feedback forms or alert missing ones
  const downloadPDF = () => {
    // do nothing if no feedback available
    if (!filledFeedback.length) return;
    // show warning if any missing submissions, but still download available feedback
    if (missingHRs.length) {
      setShowMissingWarning(true);
    }
    // generate PDF for filled feedback entries
    const doc = new jsPDF();
    filledFeedback.forEach((fl, idx) => {
      if (idx > 0) doc.addPage();
      doc.setFontSize(16);
      doc.text(`${selectedCompany}'s ${fl.employeesID} Feedback`, 10, 10);
      doc.setFontSize(12);
      let y = 20;
      fl.feedback.forEach(q => {
        doc.text(q.question_text, 10, y);
        y += 7;
        doc.text(q.answer.toString(), 10, y);
        y += 10;
        if (y > 280) { doc.addPage(); y = 10; }
      });
    });
    doc.save(`${selectedCompany}_feedback.pdf`);
  };

  const openCompany = async (company) => {
    if (!employeesByCompany[company]) {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/admin/company/${encodeURIComponent(company)}/employees`, {
          headers: { Authorization: token ? `Bearer ${token}` : '' },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data?.success) setEmployeesByCompany(prev => ({ ...prev, [company]: data.employees || [] }));
      } catch {}
    }
    setSelectedCompany(company);
    // fetch report status then report
    try {
      const statusRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/admin/company/${encodeURIComponent(company)}/report/status`, {
        headers: { Authorization: token ? `Bearer ${token}` : '' }
      });
      const statusData = await statusRes.json();
      if (statusRes.ok) setReportStatus({ total: statusData.total, filled: statusData.filled });
      else setReportStatus({ total: 0, filled: 0 });
      if (statusRes.ok && statusData.filled > 0) {
        // fetch report even if only some HRs have submitted
          const repRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/admin/company/${encodeURIComponent(company)}/report`, {
	      headers: { Authorization: token ? `Bearer ${token}` : '' }
        });
        const repData = await repRes.json();
        if (repRes.ok) setCompanyReport(repData);
        else setCompanyReport(null);
      } else {
        setCompanyReport(null);
      }
    } catch {
      setReportStatus({ total: 0, filled: 0 });
      setCompanyReport(null);
    }
  if (onSelect) onSelect();
  setShowCompanyReport(false);
  };


  const closeCompany = () => {
  setSelectedCompany(null);
  if (onDeselect) onDeselect();
    setSearchQuery('');
    setRoleFilter('All');
    setFeedbackList(null);
    setFeedbackLoading(false);
    setFeedbackError(null);
  };

  if (loading) return <div style={{ color: '#6b7280' }}>Loading companies…</div>;
  if (error) return <div style={{ color: '#dc2626' }}>Error: {error}</div>;
  if (!companies.length) return <div style={{ color: '#6b7280' }}>No companies found.</div>;

  if (selectedCompany) {
    // show inline report view if requested
    if (showCompanyReport) {
      return (
        <CompanyReports
          companyReport={companyReport}
          onBack={() => { setShowCompanyReport(false); setAutoDownloadReport(false); }}
          onViewEmployees={() => { setShowCompanyReport(false); setAutoDownloadReport(false); }}
          hideActions={true}
          autoDownload={autoDownloadReport}
        />
      );
    }
    const emps = employeesByCompany[selectedCompany] || [];
    const roles = Array.from(new Set(emps.map(e => e.role).filter(Boolean))).sort();
    const filteredEmps = emps.filter(emp => {
      if (roleFilter !== 'All' && emp.role !== roleFilter) return false;
      const q = searchQuery.toLowerCase();
      return !q || emp.employeesID.toLowerCase().includes(q) || emp.name.toLowerCase().includes(q) || emp.role.toLowerCase().includes(q);
    });

    return (
      <div>
        {/* Header: company name and optional View Feedback button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <div>
            <h4 style={{ margin: 0, color: '#111827' }}>{selectedCompany}</h4>
            <div style={{ fontSize: 13, color: '#6b7280' }}>{emps.length} employee{emps.length !== 1 ? 's' : ''}</div>
          </div>
          <div>
            { reportReady[selectedCompany] ? (
              // Green: report ready
              <>
                <button
                  className="action-button secondary"
                  style={{ padding: '4px 8px', fontSize: 12, borderRadius: 6 }}
                  onClick={() => fetchFeedback(selectedCompany)}
                >View Feedback</button>
                <button
                  className="action-button secondary"
                  style={{ marginLeft: 8, padding: '4px 8px', fontSize: 12, borderRadius: 6 }}
                  onClick={() => { setAutoDownloadReport(true); setShowCompanyReport(true); }}
                >Download Company Report</button>
              </>
            ) : companyHasFeedback[selectedCompany] ? (
              // Orange: feedback exists but report not ready
              <>
                <div style={{ color: '#6b7280', fontStyle: 'italic', display: 'inline-block', marginRight: 8 }}>
                  HRs have not filled the feedback survey yet.
                </div>
                <button
                  className="action-button secondary"
                  style={{ padding: '4px 8px', fontSize: 12, borderRadius: 6 }}
                  onClick={async () => { await fetchFeedback(selectedCompany); downloadPDF(); }}
                >Download Company Report</button>
              </>
            ) : (
              // Red: no feedback
              <div style={{ color: '#6b7280', fontStyle: 'italic', marginLeft: 8 }}>
                No company report available.
              </div>
            )}
          </div>
        </div>
        {/* Back button under the company name */}
        <div style={{ marginBottom: 12 }}>
          <button className="action-button primary" style={{ padding: '4px 8px', fontSize: 12, borderRadius: 6 }} onClick={closeCompany}>
            Back to Companies
          </button>
        </div>

        {/* Employee table container */}
        <div style={{ padding: 12, background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb' }}>
          {emps.length === 0 ? (
            <div style={{ color: '#6b7280' }}>No employees found.</div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'center' }}>
                <input
                  placeholder="Search by ID, name or role"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#111827' }}
                />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#111827' }}
                >
                  <option value="All">All roles</option>
                  {roles.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', color: '#111827' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>
                    <th style={{ padding: '8px' }}>ID</th>
                    <th style={{ padding: '8px' }}>Name</th>
                    <th style={{ padding: '8px' }}>Email</th>
                    <th style={{ padding: '8px' }}>Role</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmps.map(emp => (
                    <tr key={emp.employeesID}>
                      <td style={{ padding: '8px', borderTop: '1px solid #f1f5f9' }}>{emp.employeesID}</td>
                      <td style={{ padding: '8px', borderTop: '1px solid #f1f5f9' }}>{emp.name}</td>
                      <td style={{ padding: '8px', borderTop: '1px solid #f1f5f9' }}>{emp.email}</td>
                      <td style={{ padding: '8px', borderTop: '1px solid #f1f5f9' }}>{emp.role}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>

        {/* Feedback modal for HR surveys: only show if there are filled feedback entries */}
        {filledFeedback.length > 0 && (
          <div className="modal-overlay">
            <div className="modal-card">
              <button
                className="modal-close-circle"
                onClick={() => {
                  // Close modal and reset feedback state
                  setFilledFeedback([]);
                  setFeedbackList([]);
                  setMissingHRs([]);
                  setFeedbackIndex(0);
                  setShowMissingWarning(false);
                }}
                aria-label="Close"
              >
                ✕
              </button>
              <h3 className="modal-title">{`${selectedCompany}'s ${filledFeedback[feedbackIndex].employeesID} Feedback Form`}</h3>
                            <button className="action-button primary" style={{ marginLeft: 8, fontSize: 12 }} onClick={downloadPDF}>
                              Download PDF
              </button>
              {/* Show warning only when download attempted */}
              {showMissingWarning && missingHRs.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', marginTop: 8, padding: '8px', border: '1px solid #dc2626', borderRadius: 6, background: '#ffe4e6', color: '#b91c1c' }}>
                  <span style={{ flex: 1 }}>{`${missingHRs.join(', ')} have not filled the survey yet.`}</span>
                  <button onClick={() => setShowMissingWarning(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c', fontSize: 18, marginLeft: 6 }} aria-label="Dismiss">
                    ❌
                  </button>
                </div>
              )}
              {filledFeedback.length ? (
                <div className="feedback-container" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                  {filledFeedback[feedbackIndex].feedback.map(item => (
                    <div key={item.question_id} className="feedback-container">
                      <div className="feedback-question">{item.question_text}</div>
                      <div className="feedback-answer">{item.answer}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: '#6b7280', textAlign: 'center', padding: '20px' }}>
                  No feedback available for this HR.
                </div>
              )}
              <div className="action-row">
                {feedbackIndex > 0 && (
                  <button
                    className="action-button secondary"
                    onClick={() => setFeedbackIndex(i => i - 1)}
                    style={{ marginRight: 8 }}
                  >
                    Previous
                  </button>
                )}
                {feedbackIndex < filledFeedback.length - 1 && (
                  <button
                    className="action-button secondary"
                    onClick={() => setFeedbackIndex(i => i + 1)}
                  >
                    Next
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );

  }

  // Filter companies by search
  const filteredCompanies = companiesToShow.filter(c => (c.company || c).toLowerCase().includes(companySearch.toLowerCase()));
  // Sort by feedback status: asc = feedback-first, desc = no-feedback-first, null = neutral
  let sortedCompanies = [...filteredCompanies];
  if (sortOrder === 'asc') {
    sortedCompanies.sort((a, b) => {
      const aHas = companyHasFeedback[a.company || a] ? 1 : 0;
      const bHas = companyHasFeedback[b.company || b] ? 1 : 0;
      return bHas - aHas; // filled first
    });
  } else if (sortOrder === 'desc') {
    sortedCompanies.sort((a, b) => {
      const aHas = companyHasFeedback[a.company || a] ? 1 : 0;
      const bHas = companyHasFeedback[b.company || b] ? 1 : 0;
      return aHas - bHas; // no-feedback first
    });
  }

  return (
    <>
  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <input
          placeholder="Search companies"
          value={companySearch}
          onChange={e => setCompanySearch(e.target.value)}
          style={{
            width: '200px', padding: '4px 8px', borderRadius: 6,
            border: '1px solid #4f46e5', background: '#ffffff', color: '#111827'
          }}
        />
        <div style={{ marginLeft: 8, cursor: 'pointer', userSelect: 'none' }}
             onClick={() => setSortOrder(prev => prev === null ? 'asc' : prev === 'asc' ? 'desc' : null)}
             title="Toggle feedback sort">
          <span style={{
            fontSize: 16,
            color: sortOrder !== null ? '#10B981' : '#6b7280'
          }}>
            {sortOrder === 'asc' ? '▲' : sortOrder === 'desc' ? '▼' : '='}
          </span>
        </div>
      </div>
      <div className="feature-grid companies-grid">
        {sortedCompanies.map(c => {
          const companyName = c.company || c;
          const count = c.count ?? '';
          // HR feedback stats
          const stats = feedbackStats[companyName] || { total: 0, filled: 0 };
          const filled = stats.filled;
          const total = stats.total;
          // Theme report readiness
          const reportAvailable = reportReady[companyName];
          // Conditional coloring
          let borderColor;
          if (reportAvailable && total > 0 && filled === total) {
            // all HRs filled and report available
            borderColor = '#10B981';
          } else if (reportAvailable) {
            // report available but some HRs not filled
            borderColor = '#F59E0B';
          } else {
            // report not available
            borderColor = '#EF4444';
          }
          return (
            <div
              key={companyName}
              className="feature-card company-card"
              onClick={() => openCompany(companyName)}
              style={{ border: `2px solid ${borderColor}`, cursor: 'pointer' }}
            >
              <div className="company-card-content">
                <div>
                  <h4 style={{ margin: 0, color: '#111827' }}>{companyName}</h4>
                  <div style={{ fontSize: 13, color: '#6b7280', marginTop: 6 }}>{count} employee{count !== 1 ? 's' : ''}</div>
                </div>
                <div style={{ color: '#4f46e5', fontSize: 18, fontWeight: 700, pointerEvents: 'none' }}>▸</div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
