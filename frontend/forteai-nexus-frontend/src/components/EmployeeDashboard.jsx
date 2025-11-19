import './Dashboard.css'
import { useState, useEffect } from 'react'
import SentimentForm from './SentimentForm'
import Sidebar from './Sidebar'

const EmployeeDashboard = ({ user, onLogout, token }) => {
  const [active, setActive] = useState(null) // 'performance' | 'potential' | 'sentiment'
  const [showChangePwd, setShowChangePwd] = useState(false)
  const [pwd, setPwd] = useState({ current: '', newPassword: '' })
  const [pwdResult, setPwdResult] = useState(null)
  const [passwordChanged, setPasswordChanged] = useState(!(user && user.mustChangePassword))

  // Load active section from localStorage on component mount
  useEffect(() => {
    const savedActive = localStorage.getItem('employee_dashboard_active_section');
    if (savedActive) {
      setActive(savedActive);
    }
    // If server indicates the employee must change initial password, force the modal open
    if (user && user.mustChangePassword) {
      setShowChangePwd(true)
    }
  }, []);

  // Save active section to localStorage whenever it changes
  const handleSetActive = (section) => {
    setActive(section);
    localStorage.setItem('employee_dashboard_active_section', section);
  };

  return (
    <div className="dashboard-layout">
      <Sidebar 
        user={user} 
        token={token}
        onLogout={onLogout}
        activeSection={active}
        onSectionChange={handleSetActive}
      />
      
      <div className="dashboard-container">
        <div className="dashboard-background">
          <div className="dashboard-sphere"></div>
        </div>

        <main className="dashboard-main">
          <div className="dashboard-card">
            <div className="role-header">
              <h2 className="role-title">Employee Dashboard</h2>
              <p className="role-description">Track your development and provide feedback</p>
            </div>

            <div className="dashboard-content">
              
            <div style={{ marginTop: 24 }}>
              {passwordChanged ? (
                <>
                  {active === 'sentiment' && <SentimentForm token={token} employeeId={user.employeesID} />}
                  {active === 'performance' && <div style={{color:'#374151'}}>Performance panel (placeholder)</div>}
                  {active === 'potential' && <div style={{color:'#374151'}}>Potential panel (placeholder)</div>}
                  {!active && <div style={{color:'#6b7280'}}>Select an option from the sidebar to continue.</div>}
                </>
              ) : (
                <div style={{padding:20, border:'1px dashed #e6e6ef', borderRadius:8, background:'#fff'}}>
                  <strong style={{display:'block', marginBottom:8}}>Action required</strong>
                  <div style={{color:'#374151', marginBottom:12}}>You must change your initial password before accessing dashboard features.</div>
                  <div style={{display:'flex', gap:8}}>
                    <button className="action-button" onClick={() => setShowChangePwd(true)}>Change Password</button>
                  </div>
                </div>
              )}
            </div>
            {showChangePwd && (
              <div className="modal-overlay">
                <div className="modal-card">
                  <h3>Change Password</h3>
                  <input type="password" placeholder="Current password" value={pwd.current} onChange={(e)=>setPwd({...pwd,current:e.target.value})} />
                  <input type="password" placeholder="New password" value={pwd.newPassword} onChange={(e)=>setPwd({...pwd,newPassword:e.target.value})} />
                  <div style={{marginTop:12}}>
                    <button onClick={async ()=>{
                      try {
                        const resp = await fetch(`${import.meta.env.VITE_API_BASE_URL}/change-password`,{
                          method:'POST',
                          headers: {'Content-Type':'application/json', Authorization: token?`Bearer ${token}`:undefined},
                          body: JSON.stringify({ current: pwd.current, newPassword: pwd.newPassword })
                        })
                        const data = await resp.json()
                        setPwdResult(data.message || JSON.stringify(data))
                        if (resp.ok) {
                          // mark password as changed so employee can continue
                          setPasswordChanged(true)
                          setShowChangePwd(false)
                          setPwd({current:'', newPassword:''})
                        }
                      } catch(err){ setPwdResult('Error: '+err.message) }
                    }} className="action-button">Change</button>
                    <button onClick={()=>{ setShowChangePwd(false); setPwd({current:'',newPassword:''}); setPwdResult(null); }} className="action-button">Cancel</button>
                  </div>
                  {pwdResult && <div style={{marginTop:12}}>{pwdResult}</div>}
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

export default EmployeeDashboard
