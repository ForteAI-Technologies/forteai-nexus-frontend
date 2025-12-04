import './Dashboard.css'
import { useState, useEffect, useRef } from 'react'
import ViewReports from './ViewReports'
import Sidebar from './Sidebar'
import HRFeedback from './HRFeedback'


const HRDashboard = ({ user, onLogout, token }) => {
  const [active, setActive] = useState(null)
  const [showImport, setShowImport] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [importFile, setImportFile] = useState(null)
  const [importResult, setImportResult] = useState(null)
  const [_importPreview, setImportPreview] = useState(null)
  const _fileInputRef = useRef(null)
  const [newEmp, setNewEmp] = useState({ employeesID: '', name: '', email: '', role: 'Employee', company: '' })
  const [addResult, setAddResult] = useState(null)

  // Handle CSV file input (open file dialog triggers this)
  const handleFile = async (e) => {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    setImportFile(file)
    setImportResult(null)
    // generate a small preview of first 3 non-empty rows using encoding detection
    try {
      const ab = await file.arrayBuffer()
      const bytes = new Uint8Array(ab)
      let encoding = 'utf-8'
      // detect BOMs
      if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) {
        encoding = 'utf-16le'
      } else if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) {
        encoding = 'utf-16be'
      } else if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
        encoding = 'utf-8'
      }
      let decoder
      try { decoder = new TextDecoder(encoding) } catch (e) { decoder = new TextDecoder('utf-8') }
      let text = decoder.decode(ab)
      // If utf-16be, convert by swapping bytes into little-endian then decode
      if (encoding === 'utf-16be') {
        const swapped = new Uint8Array(bytes.length)
        for (let i = 0; i + 1 < bytes.length; i += 2) { swapped[i] = bytes[i + 1]; swapped[i + 1] = bytes[i] }
        text = new TextDecoder('utf-16le').decode(swapped)
      }
      // normalize line endings and strip any leading BOM char
      text = text.replace(/^\uFEFF/, '')
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
      const preview = lines.slice(0, 3).map((r, idx) => ({ line: idx + 1, row: r }))
      setImportPreview(preview)
    } catch (err) {
      console.error('Preview decode failed', err)
      setImportPreview(null)
    }
  }

  const submitImport = async (fileParam) => {
    const fileToUse = fileParam || importFile
    if (!fileToUse) return setImportResult('Please choose a CSV file')
    const formData = new FormData()
    formData.append('file', fileToUse)

    try {
      const resp = await fetch(`${import.meta.env.VITE_API_BASE_URL}/hr/import`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      })
      const data = await resp.json()
      setImportResult(data)
      // keep modal open so HR can inspect results
      // optionally clear preview/file on success
      // setShowImport(false)
    } catch (err) {
      setImportResult({ message: 'Import failed: ' + err.message })
    }
  }

  const triggerDownload = (url, filename) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || '';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  const submitAdd = async () => {
    if (!newEmp.employeesID) return setAddResult('employeesID required')
    try {
      const resp = await fetch(`${import.meta.env.VITE_API_BASE_URL}/hr/employees`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : undefined,
        },
        body: JSON.stringify(newEmp),
      })
      const data = await resp.json()
      // store both message and status for UI
      const message = data.detail || data.message || JSON.stringify(data)
      setAddResult({ text: message, status: resp.status })
      if (resp.ok) {
        // show a clear success message to HR, reset form, then auto-close the modal shortly
        setAddResult({ text: 'Employee added successfully', status: resp.status })
        setNewEmp({ employeesID: '', name: '', email: '', role: 'Employee', company: '' })
        // keep the modal open briefly so HR can read the confirmation
        setTimeout(() => {
          setShowAdd(false)
          setAddResult(null)
        }, 1600)
      }
    } catch (err) {
      setAddResult({ text: 'Add failed: ' + err.message, status: 500 })
    }
  }

  // Load active section from localStorage on component mount
  useEffect(() => {
    const savedActive = localStorage.getItem('hr_dashboard_active_section');
    if (savedActive) {
      setActive(savedActive);
    }
  }, []);

  // Save active section to localStorage whenever it changes
  const handleSetActive = (section) => {
    setActive(section);
    localStorage.setItem('hr_dashboard_active_section', section);
  };

  return (
    <div className="dashboard-layout">
      <Sidebar
        user={user}
        token={token}
        onLogout={onLogout}
        activeSection={active}
        onSectionChange={handleSetActive}
        onOpenImport={() => setShowImport(true)}
        onOpenAdd={() => { setShowAdd(true); setNewEmp(ne => ({ ...ne, role: 'Employee', company: user?.company || '' })); }}
        showHrQuickActions={false}
      />

      <div className="dashboard-container">
        <div className="dashboard-background">
          <div className="dashboard-sphere"></div>
        </div>

        <main className="dashboard-main">
          <div className="dashboard-card">
            <div className="role-header">
              <h2 className="role-title">HR Dashboard</h2>
              <p className="role-description">Manage and monitor employee performance and engagement</p>
            </div>

            <div className="dashboard-content">
              <div style={{ marginTop: 24 }}>
                {active === 'viewReports' && (
                  <ViewReports
                    token={token}
                    user={user}
                    onOpenAdd={() => { setShowAdd(true); setNewEmp(ne => ({ ...ne, role: 'Employee', company: user?.company || '' })); }}
                    onOpenImport={() => setShowImport(true)}
                  />
                )}
                {active === 'submitFeedback' && (
                  <HRFeedback
                    token={token}
                    onComplete={() => setActive('viewReports')}
                  />
                )}
                {!active && <div style={{ color: '#6b7280' }}>Select an option from the sidebar to continue.</div>}
              </div>

              {/* Import Modal */}
              {showImport && (
                <div className="modal-overlay">
                  <div className="modal-card">
                    <button className="modal-close-circle" onClick={() => { setShowImport(false); setImportFile(null); setImportResult(null); setImportPreview(null); }} aria-label="Close">✕</button>
                    <h3>Import Employees</h3>
                    <input type="file" accept=".csv,.tsv,.txt,.xl" onChange={(e) => handleFile(e)} />
                    <div style={{ marginTop: 8 }}>
                      <button className="action-button" onClick={() => triggerDownload('/sample_import.csv', 'sample_import.csv')}>Download Sample XL</button>
                    </div>
                    <div style={{ marginTop: 12 }}>
                      <div style={{ marginBottom: 8 }}><strong className="selected-label">Selected file:</strong> <span className="selected-file">{importFile ? importFile.name : 'None'}</span></div>
                      {/* preview intentionally hidden to simplify the modal */}
                      <div className="modal-actions">
                        <button onClick={() => submitImport()} className="action-button">Upload</button>
                        <button onClick={() => { setShowImport(false); setImportFile(null); setImportResult(null); setImportPreview(null); }} className="action-button">Cancel</button>
                      </div>
                    </div>
                    {importResult && (
                      <div style={{ marginTop: 12 }}>
                        {/* Summary with colored counts */}
                        <div className="import-summary">
                          <strong className="summary-message">{importResult.message}</strong>
                          {importResult.results && (
                            <div style={{ marginTop: 8 }}>
                              <span className="summary-pill inserted">Inserted: {importResult.results.inserted || 0}</span>
                              <span className="summary-pill skipped">Skipped: {importResult.results.skipped || 0}</span>
                              <span className="summary-pill info">Errors: {importResult.results.errors ? importResult.results.errors.length : 0}</span>
                            </div>
                          )}
                        </div>

                        {importResult.results && importResult.results.errors && importResult.results.errors.length > 0 && (
                          <div style={{ marginTop: 8 }}>
                            <strong>Row errors:</strong>
                            <ul className="import-errors" style={{ marginTop: 6 }}>
                              {importResult.results.errors.map((err, idx) => (
                                <li key={idx} className="error-item">{`Line ${err.line || '?'}: ${err.reason || err}`}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Add Employee Modal */}
              {showAdd && (
                <div className="modal-overlay">
                  <div className="modal-card">
                    <button className="modal-close-circle" onClick={() => { setShowAdd(false); setNewEmp({ employeesID: '', name: '', email: '', role: 'Employee', company: '' }); }} aria-label="Close">✕</button>
                    <h3>Add New Employee</h3>
                    <div className="field-grid">
                      <input className="full" placeholder="Employee ID *" value={newEmp.employeesID} onChange={(e) => setNewEmp({ ...newEmp, employeesID: e.target.value })} />
                      <input placeholder="Name" value={newEmp.name} onChange={(e) => setNewEmp({ ...newEmp, name: e.target.value })} />
                      <input placeholder="Email" value={newEmp.email} onChange={(e) => setNewEmp({ ...newEmp, email: e.target.value })} />
                      <select value={newEmp.role} onChange={(e) => setNewEmp({ ...newEmp, role: e.target.value })} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}>
                        <option value="Employee">Employee</option>
                        <option value="HR">HR</option>
                        <option value="Manager">Manager</option>
                      </select>
                    </div>
                    <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px', marginBottom: '12px' }}>
                      Default password will be set to: <strong>Welcome@123</strong>
                    </p>
                    <div className="action-row">
                      <button onClick={() => { setShowAdd(false); setNewEmp({ employeesID: '', name: '', email: '', role: 'Employee', company: '' }); }} className="action-button secondary">Cancel</button>
                      <button onClick={() => submitAdd()} className="action-button primary">Add</button>
                    </div>
                    {addResult && (
                      <div className={`message ${addResult.status && addResult.status >= 400 ? 'error-message' : 'success-message'}`}>
                        {addResult.text}
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
  )
}

export default HRDashboard
