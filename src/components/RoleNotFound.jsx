import './Dashboard.css'

const RoleNotFound = ({ user, onLogout }) => {
  const role = user?.role || 'Unknown'
  return (
    <div className="dashboard-container">
      <div className="dashboard-background">
        <div className="dashboard-sphere"></div>
      </div>

      <header className="dashboard-header">
        <div className="header-content">
          <h1 className="dashboard-title">FORTEAI</h1>
          <div className="user-info">
            <span className="welcome-text">Welcome, {user?.name || user?.employeesID || 'User'}</span>
            <button onClick={onLogout} className="logout-button">Logout</button>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-card">
          <div className="role-header">
            <span className="role-icon">🗂️</span>
            <h2 className="role-title">Role not supported yet</h2>
            <p className="role-description">Your current role "{role}" doesn’t have a dashboard configured.</p>
          </div>

          <div className="dashboard-content">
            <div className="feature-grid">
              <div className="feature-card">
                <h3>What next?</h3>
                <p>
                  Please contact the admin/developer to enable this role’s dashboard.
                  In the meantime, you can safely log out using the button above.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default RoleNotFound
