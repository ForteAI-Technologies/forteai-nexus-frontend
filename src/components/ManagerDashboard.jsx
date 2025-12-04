import './Dashboard.css'
import { useState, useEffect } from 'react'
import SentimentForm from './SentimentForm'
import Sidebar from './Sidebar'



const ManagerDashboard = ({ user, onLogout, token }) => {
  const [active, setActive] = useState(null)

  // Load active section from localStorage on component mount
  useEffect(() => {
    const savedActive = localStorage.getItem('manager_dashboard_active_section');
    if (savedActive) {
      setActive(savedActive);
    }
  }, []);

  // Save active section to localStorage whenever it changes
  const handleSetActive = (section) => {
    setActive(section);
    localStorage.setItem('manager_dashboard_active_section', section);
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
              <h2 className="role-title">Manager Dashboard</h2>
              <p className="role-description">Monitor team performance and development</p>
            </div>

            <div className="dashboard-content">
              {!active && (
                <div className="dashboard-actions">
                  <button className="action-button" onClick={() => handleSetActive('performance')}>
                    📊 Team Performance
                  </button>
                  <button className="action-button" onClick={() => handleSetActive('potential')}>
                    🚀 Development Plans
                  </button>
                    {/* Team Sentiment hidden for Manager users */}
                </div>
              )}

            <div style={{ marginTop: 24 }}>
              {/* SentimentForm intentionally not rendered for Manager users */}
              {active === 'performance' && <div style={{color:'#374151'}}>Performance panel (placeholder)</div>}
              {active === 'potential' && <div style={{color:'#374151'}}>Potential panel (placeholder)</div>}
              {!active && <div style={{color:'#6b7280'}}>Select an option from the sidebar or above to continue.</div>}
            </div>
          </div>
        </div>
      </main>
      </div>
    </div>
  )
}

export default ManagerDashboard
