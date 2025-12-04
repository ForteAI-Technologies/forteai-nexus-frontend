import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './components/Login';
import HRDashboard from './components/HRDashboard';
import ManagerDashboard from './components/ManagerDashboard';
import EmployeeDashboard from './components/EmployeeDashboard';
import AdminDashboard from './components/AdminDashboard';
import ChangePassword from './components/ChangePassword';
import UserAgreement from './components/UserAgreement';
import RoleNotFound from './components/RoleNotFound';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    // Load user from localStorage safely (avoid crashes on invalid JSON)
    let parsed = null;
    let savedToken = null;
    try {
      const saved = localStorage.getItem('user');
      if (saved) parsed = JSON.parse(saved);
      
      // Also load the token from localStorage
      savedToken = localStorage.getItem('token');
    } catch (err) {
      console.warn('Ignoring invalid user in localStorage', err);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    }

    if (parsed && parsed.role && savedToken) {
      setUser(parsed);
      setToken(savedToken); // Set the token from localStorage
      
      // Verify token validity with backend on load
      (async () => {
        try {
          const res = await fetch('/api/employees/me/status', {
            headers: { 'Authorization': `Bearer ${savedToken}` }
          });
          if (res.status === 401 || res.status === 403) {
            // Token expired or invalid
            setSessionExpired(true);
          }
          // If 200, token is valid; if 404 or other, we still let user proceed (could be a different role endpoint)
        } catch (err) {
          console.warn('Session check failed:', err);
          // Network error - allow user to proceed; they'll hit errors on actual API calls
        }
      })();
    } else {
      // Ensure we don't get stuck on /dashboard when storage is stale
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    }

    setLoading(false);
  }, []);

  // Helper to clear session and show message
  const handleForceLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    // reload to ensure protected routes redirect
    window.location.href = '/login';
  };

  const handleLogin = (userData, token) => {
    setUser(userData);
    setToken(token || null);
    localStorage.setItem('user', JSON.stringify(userData));
    if (token) localStorage.setItem('token', token);
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null); // Clear the token state
    localStorage.removeItem('user');
    localStorage.removeItem('token'); // Clear the token from localStorage
    setSessionExpired(false);
  };

  const handlePasswordChanged = () => {
    // Update user state to reflect that password has been changed
    const updatedUser = { ...user, mustChangePassword: false };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const handleAgreementAccepted = (updatedUser) => {
    // Update user state to reflect that agreement has been accepted
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  // Check if user needs to change password (only for Employee role)
  const needsPasswordChange = user && user.role === 'Employee' && user.mustChangePassword;
  
  // Check if user needs to accept agreement
  const needsAgreement = user && (user.isagreed === false || user.isagreed === 0 || user.isagreed === null || user.isagreed === undefined);
  
  // Debug logging for agreement status
  console.log('User agreement debug:', {
    user: user ? { employeesID: user.employeesID, role: user.role, isagreed: user.isagreed } : null,
    needsAgreement,
    needsPasswordChange
  });

  const renderDashboard = () => {
    switch (user?.role) {
      case 'HR':
  return <HRDashboard user={user} onLogout={handleLogout} token={token} />;
      case 'Manager':
  return <ManagerDashboard user={user} onLogout={handleLogout} token={token} />;
    case 'Admin':
  return <AdminDashboard user={user} onLogout={handleLogout} token={token} />;
      case 'Employee':
  return <EmployeeDashboard user={user} onLogout={handleLogout} token={token} />;
      default:
        return <RoleNotFound user={user} onLogout={handleLogout} />;
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <Router>
      <div className="app">
        {sessionExpired && (
          <div style={{ background: '#fef2f2', border: '2px solid #ef4444', color: '#991b1b', padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 500 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>⚠️</span>
              <span><strong>Session Expired:</strong> Your previous session has expired. Please log out and log in again to continue.</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="action-button secondary" onClick={() => { setSessionExpired(false); }} style={{ background: 'transparent', border: '1px solid #ef4444', color: '#991b1b', padding: '8px 16px', fontSize: 14 }}>Dismiss</button>
              <button className="action-button primary" onClick={handleForceLogout} style={{ background: '#ef4444', border: 'none', color: 'white', padding: '8px 16px', fontSize: 14, fontWeight: 600 }}>Logout & Login Again</button>
            </div>
          </div>
        )}
        <Routes>
          <Route
            path="/login"
            element={!user ? <Login onLogin={handleLogin} /> : <Navigate to="/dashboard" />}
          />
          <Route
            path="/change-password"
            element={
              user && needsPasswordChange ? (
                <ChangePassword 
                  user={user} 
                  token={token} 
                  onPasswordChanged={handlePasswordChanged} 
                />
              ) : (
                <Navigate to={user ? (needsAgreement ? "/agreement" : "/dashboard") : "/login"} />
              )
            }
          />
          <Route
            path="/agreement"
            element={
              user && needsAgreement ? (
                <UserAgreement 
                  employee={user} 
                  onAgreementAccepted={handleAgreementAccepted} 
                />
              ) : (
                <Navigate to={user ? "/dashboard" : "/login"} />
              )
            }
          />
          <Route
            path="/dashboard"
            element={
              user ? (
                needsPasswordChange ? (
                  <Navigate to="/change-password" />
                ) : needsAgreement ? (
                  <Navigate to="/agreement" />
                ) : (
                  renderDashboard()
                )
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route 
            path="/" 
            element={
              <Navigate to={
                user ? (
                  needsPasswordChange ? "/change-password" : 
                  needsAgreement ? "/agreement" : "/dashboard"
                ) : "/login"
              } />
            } 
          />
          <Route 
            path="*" 
            element={
              <Navigate to={
                user ? (
                  needsPasswordChange ? "/change-password" : 
                  needsAgreement ? "/agreement" : "/dashboard"
                ) : "/login"
              } />
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
