import { useState, useEffect, useMemo } from 'react';
import './ViewReports.css';
import CompanyReports from './CompanyReports';

const ViewReports = ({ token, onOpenAdd, onOpenImport, user }) => {
  const [employees, setEmployees] = useState([]);
  const [company, setCompany] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Company report state
  const [companyStatus, setCompanyStatus] = useState(null); // {companyId, companyName, total, filled, notFilled}
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [companyReport, setCompanyReport] = useState(null);
  const [showCompanyReport, setShowCompanyReport] = useState(true); // Changed to true as default
  const [showEmployeesList, setShowEmployeesList] = useState(false); // New state for showing employees list

  // Fetch employees when component mounts
  useEffect(() => {
    fetchEmployees();
    fetchCompanyStatus();
    // Automatically try to fetch company report on mount
    fetchCompanyReport();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/reports/employees`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error Response:', errorText);
        throw new Error(`Failed to fetch employees: ${response.status}`);
      }

      const data = await response.json();
      setEmployees(data.employees || []);
      setCompany(data.company || '');
    } catch (err) {
      console.error('💥 Error fetching employees:', err);
      setError(`Failed to load employees: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanyStatus = async () => {
    try {
      const resp = await fetch(`${import.meta.env.VITE_API_BASE_URL}/company/report/status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!resp.ok) throw new Error(`Status ${resp.status}`);
      const data = await resp.json();
      setCompanyStatus(data);
    } catch (e) {
      console.error('Failed to fetch company status', e);
    }
  };

  const fetchCompanyReport = async () => {
    try {
      setLoading(true);
      const resp = await fetch(`${import.meta.env.VITE_API_BASE_URL}/company/report`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!resp.ok) {
        if (resp.status === 404) {
          // No data yet: still show the styled report container with a friendly message
          setCompanyReport({ companyName: companyStatus?.companyName || company, report: null });
          return;
        }
        // other errors
        throw new Error(`Status ${resp.status}`);
      }
      const data = await resp.json();
      setCompanyReport(data);
    } catch (e) {
      console.error('Failed to fetch company report', e);
      // On error, show report not available
      setCompanyReport({ companyName: company, report: null });
    } finally {
      setLoading(false);
    }
  };

  const onClickCompanyReport = async () => {
    await fetchCompanyReport();
  };
  // Trigger company analysis
  const analyzeCompany = async () => {
    try {
      setLoading(true);
      const resp = await fetch(`${import.meta.env.VITE_API_BASE_URL}/company/analyze`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || `Status ${resp.status}`);
      }
      await fetchCompanyReport();
    } catch (e) {
      console.error('Company analyze error:', e);
      setError('Failed to generate company report.');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeeReport = async (employeeId, employeeName) => {
    try {
      setLoading(true);
      setSelectedEmployee({ id: employeeId, name: employeeName });

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/reports/sentiment/${employeeId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch report');
      }

      const data = await response.json();
      setReportData(data);
    } catch (err) {
      setError('Failed to load employee report');
      console.error('Error fetching report:', err);
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    setSelectedEmployee(null);
    setReportData(null);
    setError('');
  };

  const [showFabMenu, setShowFabMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetEmployee, setResetEmployee] = useState(null);
  // sortMode: 'none' | 'submitted-first' | 'not-submitted-first'
  const [sortMode, setSortMode] = useState('none');

  const triggerDownload = (url, filename) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || '';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const filteredEmployees = useMemo(() => {
    const term = (searchTerm || '').trim().toLowerCase();
    let list = employees.slice();
    if (term) {
      list = list.filter(e => {
        const name = (e.name || '').toString().toLowerCase();
        const role = (e.role || '').toString().toLowerCase();
        return name.includes(term) || role.includes(term) || (e.employeesID && String(e.employeesID).toLowerCase().includes(term));
      });
    }
    if (sortMode === 'submitted-first') {
      // Priority: yellow (filled, awaiting report), then green (hasReport), then red (not filled)
      list.sort((a, b) => {
        // Yellow: hasFilledForm && !hasReport
        const aYellow = a.hasFilledForm && !a.hasReport;
        const bYellow = b.hasFilledForm && !b.hasReport;
        if (aYellow && !bYellow) return -1;
        if (!aYellow && bYellow) return 1;
        // Green: hasReport
        if (a.hasReport && !b.hasReport) return -1;
        if (!a.hasReport && b.hasReport) return 1;
        // Otherwise, keep order
        return 0;
      });
    } else if (sortMode === 'not-submitted-first') {
      list.sort((a, b) => (a.hasReport === true) - (b.hasReport === true));
      list.sort((a, b) => (a.hasReport === true) - (b.hasReport === true));
    }
    return list;
  }, [employees, searchTerm, sortMode]);

  // number of employees who have submitted reports
  const filledCount = useMemo(() => {
    return (employees || []).filter(e => !!e.hasReport).length;
  }, [employees]);

  // when a search/filter is active, show counts for the filtered list instead
  const filteredFilledCount = useMemo(() => {
    return (filteredEmployees || []).filter(e => !!e.hasReport).length;
  }, [filteredEmployees]);

  const isFiltering = (searchTerm || '').trim().length > 0;
  const displayFilled = isFiltering ? filteredFilledCount : filledCount;
  const displayTotal = isFiltering ? (filteredEmployees || []).length : (employees || []).length;

  if (loading) {
    return (
      <div className="reports-container">
        <div className="loading-center">
          <div className="loader">
            <div className="loader-ring" aria-hidden="true"></div>
            <div className="loader-dot" aria-hidden="true"></div>
          </div>
          <div className="loading-text">Loading reports…</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="reports-container">
        {selectedEmployee ? (
          // Individual Employee Report View
          <div className="report-detail">
            <div className="report-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <button className="back-button" onClick={goBack}>
                  ← Back to Employees
                </button>
                <h3 style={{ margin: 0, marginLeft: 16 }}>Sentiment Report - {selectedEmployee.name}</h3>
              </div>
              {/* Action buttons: regenerate and reset with gap */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {reportData && !reportData.hasReport && reportData.hasFilledForm && (
                  <button
                    className="primary-button"
                    onClick={async () => {
                      try {
                        setLoading(true);
                        setError('');
                        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/reports/regenerate/${selectedEmployee.id}`, {
				method: 'POST',
                          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
                        });
                        const result = await response.json();
                        if (response.ok && result.success) {
                          alert(`Report successfully regenerated for ${result.employeeName}!`);
                          await fetchEmployeeReport(selectedEmployee.id, selectedEmployee.name);
                        } else {
                          setError(result.error || 'Failed to regenerate report');
                        }
                      } catch (error) {
                        console.error('Regenerate error:', error);
                        setError('Failed to regenerate report. Please try again.');
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                  >
                    {loading ? 'Regenerating...' : 'Re-generate'}
                  </button>
                )}
              </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            {reportData && !reportData.hasReport && (
              <div className="no-report">
                <div className="no-report-icon">📝</div>
                {reportData.hasFilledForm ? (
                  <>
                    <h4>Report Not Generated</h4>
                    <p>This employee has submitted the form but due to some technical issues the report is not generated.</p>
                    <p>Please click on the button re-generate above.</p>
                  </>
                ) : (
                  <>
                    <h4>No Sentiment Report Available</h4>
                    <p>This employee hasn't submitted the sentiment survey yet.</p>
                  </>
                )}
              </div>
            )}

            {reportData && reportData.hasReport && (
              <div className="report-content">
                <div className="report-overview">
                  <h4>Sentiment Overview</h4>
                  <div className="sentiment-scores">
                    <div className="sentiment-item positive">
                      <span className="sentiment-label">Positive</span>
                      <span className="sentiment-value">{reportData.report.positive_sentiment}%</span>
                    </div>
                    <div className="sentiment-item neutral">
                      <span className="sentiment-label">Neutral</span>
                      <span className="sentiment-value">{reportData.report.neutral_sentiment}%</span>
                    </div>
                    <div className="sentiment-item negative">
                      <span className="sentiment-label">Negative</span>
                      <span className="sentiment-value">{reportData.report.negative_sentiment}%</span>
                    </div>
                  </div>
                </div>

                <div className="report-section">
                  <h4>Summary Opinion</h4>
                  <p className="summary-text">{reportData.report.summary_opinion}</p>
                </div>

                <div className="report-section">
                  <h4>Key Positive Aspects</h4>
                  <div className="positive-aspects">
                    <div className="aspect-item">
                      <span className="aspect-number">1.</span>
                      <p>{reportData.report.key_positive_1}</p>
                    </div>
                    <div className="aspect-item">
                      <span className="aspect-number">2.</span>
                      <p>{reportData.report.key_positive_2}</p>
                    </div>
                    <div className="aspect-item">
                      <span className="aspect-number">3.</span>
                      <p>{reportData.report.key_positive_3}</p>
                    </div>
                  </div>
                </div>

                <div className="report-section">
                  <h4>Attrition Analysis & Retention Strategies</h4>
                  <div className="attrition-analysis">
                    {[1, 2, 3].map((num) => (
                      <div key={num} className="attrition-item">
                        <h5>Factor {num}</h5>
                        <div className="attrition-details">
                          <div className="attrition-factor">
                            <strong>Factor:</strong> {reportData.report[`attrition_factor_${num}`]}
                          </div>
                          <div className="attrition-problem">
                            <strong>Problem:</strong> {reportData.report[`attrition_problem_${num}`]}
                          </div>
                          <div className="retention-strategy">
                            <strong>Retention Strategy:</strong> {reportData.report[`retention_strategy_${num}`]}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="report-footer">
                  <p className="report-date">
                    Report Generated: {new Date(reportData.report.created_at).toLocaleDateString()}
                    at {new Date(reportData.report.created_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            )}
            {/* Reset confirmation modal */}
            {showResetConfirm && (
              <div className="modal-overlay">
                <div className="modal-card">
                  <h3>Confirm Reset</h3>
                  <p>Are you sure you want to clear responses for {selectedEmployee.name}? They will need to complete the survey again.</p>
                  <div className="modal-actions">
                    <button className="action-button secondary" onClick={() => { setShowResetConfirm(false); setResetEmployee(null); }}>Cancel</button>
                    <button className="action-button primary" onClick={async () => {
                      setResetEmployee(null);
                      try {
                        const resp = await fetch(`${import.meta.env.VITE_API_BASE_URL}/hr/employee/${selectedEmployee.id}/responses`, {
                          method: 'DELETE',
                          headers: { 'Authorization': `Bearer ${token}` }
                        });
                        const text = await resp.json().then(data => data.message || data.detail || JSON.stringify(data)).catch(() => resp.statusText || '');
                        setResetResult({ text, status: resp.status });
                        if (resp.ok) {
                          // update local state: mark this employee as not filled
                          setEmployees(prev => prev.map(emp =>
                            emp.employeesID === selectedEmployee.id
                              ? { ...emp, hasFilledForm: false }
                              : emp
                          ));
                          setShowResetConfirm(false);
                          goBack();
                          return;
                        }
                      } catch (e) {
                        setResetResult({ text: e.message, status: 500 });
                      }
                    }}>Confirm</button>
                  </div>
                  {resetResult && (
                    <div className={`message ${resetResult.status >= 400 ? 'error-message' : 'success-message'}`} style={{ marginTop: 8 }}>
                      {resetResult.text}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : !showEmployeesList ? (
          // Company Report View (Default)
          showCompanyReport && companyReport ? (
            companyReport.report ? (
              <CompanyReports
                companyReport={companyReport}
                onBack={() => { setShowCompanyReport(false); setCompanyReport(null); }}
                onViewEmployees={() => setShowEmployeesList(true)}
              />
            ) : (
              // Company Report Not Available
              <div className="report-detail">
                <div className="report-header" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h3 style={{ margin: 0 }}>Company Sentiment Report{company ? ` - ${company}` : ''}</h3>
                  <div style={{ marginLeft: 'auto' }}>
                    <button className="primary-button" onClick={() => setShowEmployeesList(true)}>
                      View Employees
                    </button>
                  </div>
                </div>
                <div className="no-report">
                  <div className="no-report-icon">📝</div>
                  <h4>No Company Report Available</h4>
                  {companyStatus && companyStatus.filled === companyStatus.total ? (
                    <p>All responses are in. Click the “Generate Report” button below to create the company report.</p>
                  ) : (
                    <p>The company report is not ready yet. Please ensure all employees have filled their sentiment forms.</p>
                  )}
                </div>
                {companyStatus && companyStatus.filled === companyStatus.total && (
                  <div style={{ marginTop: 16 }}>
                    <button className="primary-button" onClick={analyzeCompany} disabled={loading}>
                      {loading ? 'Generating...' : 'Generate Report'}
                    </button>
                  </div>
                )}
              </div>
            )
          ) : (
            // Initial loading state or no company set up
            <div className="report-detail">
              <div className="report-header">
                <h3>Company Sentiment Report{company ? ` - ${company}` : ''}</h3>
              </div>
              <div className="no-report">
                <div className="no-report-icon">📝</div>
                <h4>No Company Report Available</h4>
                {companyStatus && companyStatus.filled === companyStatus.total ? (
                  <p>All responses are in. Click the “Generate Report” button below to create the company report.</p>
                ) : (
                  <p>The company report is not ready yet. Please ensure all employees have filled their sentiment forms.</p>
                )}
              </div>
              {companyStatus && companyStatus.filled === companyStatus.total && (
                <div style={{ marginTop: 16 }}>
                  <button className="primary-button" onClick={analyzeCompany} disabled={loading}>
                    {loading ? 'Generating...' : 'Generate Report'}
                  </button>
                </div>
              )}
              <div style={{ marginTop: 16, textAlign: 'left' }}>
                <button
                  className="primary-button"
                  onClick={() => setShowEmployeesList(true)}
                  style={{
                    padding: '8px 16px',
                    fontSize: '14px',
                    backgroundColor: '#8b5cf6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  View Employees
                </button>
              </div>
            </div>
          )
        ) : !selectedEmployee ? (
          // Employee List View
          <div className="employees-list">
            <div className="back-button-row" style={{ marginBottom: 16 }}>
              <button
                className="primary-button"
                onClick={() => setShowEmployeesList(false)}
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  backgroundColor: '#8b5cf6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                ← Back to Company Report
              </button>
            </div>

            <div className="reports-header reports-header--swapped">
              <div className="left-col">
                <div className="search-row">
                  <input className="search-input" placeholder="Search by name, role or ID" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                  <button className="sort-button" aria-label="Toggle sort" title="Toggle sort: none → submitted-first → not-submitted-first" onClick={() => {
                    setSortMode(m => m === 'none' ? 'submitted-first' : (m === 'submitted-first' ? 'not-submitted-first' : 'none'))
                  }}>{sortMode === 'submitted-first' ? '⇧' : (sortMode === 'not-submitted-first' ? '⇩' : '≡')}</button>
                </div>
                <div className="progress-row">
                  <div className="progress-fraction">{displayFilled}/{displayTotal} filled
                    <span className="progress-percent"> {displayTotal ? Math.round((displayFilled / displayTotal) * 100) : 0}%</span>
                  </div>
                  <div className="progress-bar" aria-hidden>
                    <div className="progress-bar-filled" style={{ width: `${displayTotal ? Math.max(6, Math.round((displayFilled / displayTotal) * 100)) : 0}%` }} />
                  </div>
                </div>
              </div>

              <div className="header-right">
                <div className="title-block">
                  <h3 className="reports-title">Employee Sentiment Reports</h3>
                  <p className="company-name">Company: {company}</p>
                  <div className="reports-legend">
                    <span className="legend-item submitted" /> <span className="legend-label">Report Generated</span>
                    <span className="legend-item filled" /> <span className="legend-label">Filled, Awaiting Report</span>
                    <span className="legend-item not-submitted" /> <span className="legend-label">Not Filled</span>
                  </div>
                </div>
              </div>
            </div>            {error && <div className="error-message">{error}</div>}

            <div className="employees-grid">
              {filteredEmployees.map((employee) => {
                const idKey = employee.employeesID != null ? String(employee.employeesID).trim() : '';
                let cardStatus = 'not-submitted';
                if (employee.hasReport) {
                  cardStatus = 'submitted';
                } else if (employee.hasFilledForm) {
                  cardStatus = 'filled';
                }
                return (
                  <div
                    key={idKey}
                    className={`employee-card ${cardStatus}`}
                  >
                    {/* Clickable area to view report */}
                    <div
                      className="employee-content"
                      style={{ display: 'flex', cursor: 'pointer', alignItems: 'center', justifyContent: 'space-between' }}
                      onClick={() => fetchEmployeeReport(employee.employeesID, employee.name)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div className="employee-avatar">
                          {employee.name ? employee.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div className="employee-info">
                          <h4>{employee.name || employee.employeesID}</h4>
                          <p className="employee-role">{employee.role}</p>
                          <p className="employee-email">{employee.email}</p>
                          {/* Move Reset below the email so it appears under the mail */}
                          {user?.role && ['HR','Manager'].includes(user.role) && (employee.hasFilledForm || employee.hasReport) && (
                            <div style={{ marginTop: 6 }}>
                              <button
                                className="reset-card-button"
                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }}
                                onClick={async e => {
                                  e.stopPropagation();
                                  setResetEmployee(employee);
                                  setShowResetConfirm(true);
                                }}
                              >
                                Reset
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="view-arrow">→</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredEmployees.length === 0 && !error && (
              <div className="no-employees">No employees found in your company.</div>
            )}
            {/* Reset Confirmation Modal for inline reset */}
            {showResetConfirm && resetEmployee && (
              <div className="modal-overlay">
                <div className="modal-card">
                  <h3>Confirm Reset</h3>
                  <p>Are you sure you want to clear responses for {resetEmployee.name}? They will need to complete the survey again.</p>
                  <div className="modal-actions">
                    <button className="action-button secondary" onClick={() => { setShowResetConfirm(false); setResetEmployee(null); }}>Cancel</button>
                    <button className="action-button primary" onClick={async () => {
                      try {
                        const resp = await fetch(`${import.meta.env.VITE_API_BASE_URL}/hr/employee/${resetEmployee.employeesID}/responses`, {
                          method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
                        });
                        if (resp.ok) {
                          await fetchEmployees();
                          setShowResetConfirm(false);
                          setResetEmployee(null);
                        } else {
                          const err = await resp.json().catch(() => ({}));
                          alert(err.message || `Reset failed: ${resp.status}`);
                        }
                      } catch (e) {
                        alert(e.message);
                      }
                    }}>Confirm</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : !showCompanyReport ? (
          // Report Detail View
          <div className="report-detail">
            <div className="report-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <button className="back-button" onClick={goBack}>
                  ← Back to Employees
                </button>
                <h3 style={{ margin: 0, marginLeft: 16 }}>Sentiment Report - {selectedEmployee.name}</h3>
              </div>
              {reportData && !reportData.hasReport && reportData.hasFilledForm && (
                <button
                  className="primary-button"
                  onClick={async () => {
                    try {
                      setLoading(true);
                      setError('');

                      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/reports/regenerate/${selectedEmployee.id}`, {

                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${token}`
                        }
                      });

                      const result = await response.json();

                      if (response.ok && result.success) {
                        alert(`Report successfully regenerated for ${result.employeeName}!`);
                        // Refresh the report data
                        await fetchEmployeeReport(selectedEmployee.id, selectedEmployee.name);
                      } else {
                        setError(result.error || 'Failed to regenerate report');
                      }
                    } catch (error) {
                      console.error('Regenerate error:', error);
                      setError('Failed to regenerate report. Please try again.');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                >
                  {loading ? 'Regenerating...' : 'Re-generate'}
                </button>
              )}
            </div>

            {error && <div className="error-message">{error}</div>}

            {reportData && !reportData.hasReport && (
              <div className="no-report">
                <div className="no-report-icon">📝</div>
                {reportData.hasFilledForm ? (
                  <>
                    <h4>Report Not Generated</h4>
                    <p>This employee has submitted the form but due to some technical issues the report is not generated.</p>
                    <p>Please click on the button re-generate above.</p>
                  </>
                ) : (
                  <>
                    <h4>No Report Available</h4>
                    <p>{reportData.message}</p>
                  </>
                )}
              </div>
            )}

            {reportData && reportData.hasReport && (
              <div className="report-content">
                <div className="report-overview">
                  <h4>Sentiment Overview</h4>
                  <div className="sentiment-scores">
                    <div className="sentiment-item positive">
                      <span className="sentiment-label">Positive</span>
                      <span className="sentiment-value">{reportData.report.positive_sentiment}%</span>
                    </div>
                    <div className="sentiment-item neutral">
                      <span className="sentiment-label">Neutral</span>
                      <span className="sentiment-value">{reportData.report.neutral_sentiment}%</span>
                    </div>
                    <div className="sentiment-item negative">
                      <span className="sentiment-label">Negative</span>
                      <span className="sentiment-value">{reportData.report.negative_sentiment}%</span>
                    </div>
                  </div>
                </div>

                <div className="report-section">
                  <h4>Summary Opinion</h4>
                  <p className="summary-text">{reportData.report.summary_opinion}</p>
                </div>

                <div className="report-section">
                  <h4>Key Positive Aspects</h4>
                  <div className="positive-aspects">
                    <div className="aspect-item">
                      <span className="aspect-number">1.</span>
                      <p>{reportData.report.key_positive_1}</p>
                    </div>
                    <div className="aspect-item">
                      <span className="aspect-number">2.</span>
                      <p>{reportData.report.key_positive_2}</p>
                    </div>
                    <div className="aspect-item">
                      <span className="aspect-number">3.</span>
                      <p>{reportData.report.key_positive_3}</p>
                    </div>
                  </div>
                </div>

                <div className="report-section">
                  <h4>Attrition Analysis & Retention Strategies</h4>
                  <div className="attrition-analysis">
                    {[1, 2, 3].map((num) => (
                      <div key={num} className="attrition-item">
                        <h5>Factor {num}</h5>
                        <div className="attrition-details">
                          <div className="attrition-factor">
                            <strong>Factor:</strong> {reportData.report[`attrition_factor_${num}`]}
                          </div>
                          <div className="attrition-problem">
                            <strong>Problem:</strong> {reportData.report[`attrition_problem_${num}`]}
                          </div>
                          <div className="retention-strategy">
                            <strong>Retention Strategy:</strong> {reportData.report[`retention_strategy_${num}`]}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="report-footer">
                  <p className="report-date">
                    Report Generated: {new Date(reportData.report.created_at).toLocaleDateString()}
                    at {new Date(reportData.report.created_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <CompanyReports companyReport={companyReport} onBack={() => { setShowCompanyReport(false); setCompanyReport(null); }} onViewEmployees={() => setShowEmployeesList(true)} />
        )}
      </div>
      {/* Incomplete Status Modal */}
      {showStatusModal && companyStatus && (
        <div className="modal-backdrop" onClick={() => setShowStatusModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h4>Company Report Not Ready</h4>
              <button className="close-button" onClick={() => setShowStatusModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p>
                {companyStatus.filled}/{companyStatus.total} filled. The following employees haven’t submitted yet:
              </p>
              <ul className="pending-list">
                {companyStatus.notFilled && companyStatus.notFilled.map(nf => (
                  <li key={nf.employeesID}>{nf.name || nf.employeesID} — {nf.role} {nf.email ? `(${nf.email})` : ''}</li>
                ))}
              </ul>
            </div>
            <div className="modal-footer">
              <button className="primary-button" onClick={() => setShowStatusModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
      {/* Floating Action Button (FAB) */}
      <div className="fab-root">
        {showFabMenu && <div className="fab-backdrop" onClick={() => setShowFabMenu(false)} />}
        <div className="fab-container">
          <button className="fab" onClick={() => setShowFabMenu(s => !s)} aria-label="Create">
            +
          </button>
          {showFabMenu && (
            <div className="fab-menu" role="menu">
              <button className="fab-menu-item" onClick={() => { if (typeof onOpenAdd === 'function') onOpenAdd(); setShowFabMenu(false); }}>Add New Employee</button>
              <button className="fab-menu-item" onClick={() => { if (typeof onOpenImport === 'function') onOpenImport(); setShowFabMenu(false); }}>Import Employees</button>
              <div className="fab-menu-sep" />
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ViewReports;
