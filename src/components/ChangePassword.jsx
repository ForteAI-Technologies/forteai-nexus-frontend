import { useState } from 'react';
import './ChangePassword.css';

const ChangePassword = ({ user, token, onPasswordChanged }) => {
  const [passwords, setPasswords] = useState({
    current: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPasswords(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear messages when user types
    setError('');
    setSuccess('');
  };

  const validatePasswords = () => {
    if (!passwords.current) {
      setError('Current password is required');
      return false;
    }
    if (!passwords.newPassword) {
      setError('New password is required');
      return false;
    }
    if (passwords.newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      return false;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      setError('New passwords do not match');
      return false;
    }
    if (passwords.current === passwords.newPassword) {
      setError('New password must be different from current password');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validatePasswords()) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          current: passwords.current,
          newPassword: passwords.newPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Password changed successfully! Redirecting...');
        // Clear form
        setPasswords({
          current: '',
          newPassword: '',
          confirmPassword: ''
        });
        // Notify parent component that password was changed
        setTimeout(() => {
          onPasswordChanged();
        }, 1500);
      } else {
        setError(data.message || 'Failed to change password');
      }
    } catch (err) {
      console.error('Password change error:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="change-password-container">
      <div className="change-password-background">
        <div className="change-password-sphere"></div>
      </div>
      
      <div className="change-password-layout">
        <div className="change-password-card">
          <div className="change-password-header">
            <h1 className="change-password-title">Change Password</h1>
            <p className="change-password-subtitle">
              Welcome {user.name}! For security reasons, you must change your initial password.
            </p>
            <p className="change-password-note">
              This is required for first-time login.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="change-password-form">
            <div className="form-group">
              <label htmlFor="current">Current Password</label>
              <input
                type="password"
                id="current"
                name="current"
                value={passwords.current}
                onChange={handleChange}
                required
                placeholder="Enter your current password"
                className="form-input"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="newPassword">New Password</label>
              <input
                type="password"
                id="newPassword"
                name="newPassword"
                value={passwords.newPassword}
                onChange={handleChange}
                required
                placeholder="Enter your new password"
                className="form-input"
                disabled={loading}
                minLength="6"
              />
              <small className="password-hint">
                Password must be at least 6 characters long
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm New Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={passwords.confirmPassword}
                onChange={handleChange}
                required
                placeholder="Confirm your new password"
                className="form-input"
                disabled={loading}
                minLength="6"
              />
            </div>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <button 
              type="submit" 
              className="change-password-button"
              disabled={loading}
            >
              {loading ? 'Changing Password...' : 'Change Password'}
            </button>
          </form>

          <div className="security-notice">
            <p>
              <strong>Security Notice:</strong> Make sure to choose a strong password that you haven't used elsewhere.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;
