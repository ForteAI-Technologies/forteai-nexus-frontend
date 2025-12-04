import { useState } from 'react'
import axios from 'axios'
import './Login.css'
import show from './show.png';
import hide from './hide.png';
// API base URL from environment variables
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const Login = ({ onLogin }) => {
  const [credentials, setCredentials] = useState({
    userID: '',
    password: ''
  })
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [forgotPassword, setForgotPassword] = useState(false)
  const [forgotPasswordData, setForgotPasswordData] = useState({
    employeesID: '',
    email: ''
  })
  const [resetSent, setResetSent] = useState(false)
  const togglePasswordVisibility = () => {
    setPasswordVisible(!passwordVisible);
  };
  const handleChange = (e) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value,
    });
    setError(""); // Clear error when user starts typing
  };
  console.log("at the login.jsx,",API_BASE_URL );
  // console.log("It's Working");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Backend expects employeesID
      const payload = { employeesID: credentials.userID, password: credentials.password }
      const response = await axios.post(`${API_BASE_URL}/login`, payload)

      if (response.data.success) {
        // Optionally persist token for future protected API calls
        const token = response.data.token || null;
        if (token) {
          localStorage.setItem('token', token)
          // Set the default Authorization header for all future axios requests
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
        // Pass both employee and token to parent
        onLogin(response.data.employee, token);
      } else {
        setError(response.data.message || "Login failed");
      }
    } catch (error) {
      console.error('Login error:', error)
      if (error.response && error.response.data) {
        // Handle specific error cases from the backend
        if (error.response.status === 403 && error.response.data.passwordNotSet) {
          setError('Your password has not been set. Please check your email or use "Forgot Password"')
        } else {
          setError(error.response.data.message || 'Invalid credentials or server error')
        }
      } else {
        setError('Unable to connect to the server. Please try again later.')
      }
    } finally {
      setLoading(false);
    }
  }

  const handleForgotPasswordChange = (e) => {
    setForgotPasswordData({
      ...forgotPasswordData,
      [e.target.name]: e.target.value
    })
    setError('') // Clear error when user starts typing
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Send forgot password request with both employeesID and email
      await axios.post(`${API_BASE_URL}/forgot-password`, {
        employeesID: forgotPasswordData.employeesID,
        email: forgotPasswordData.email
      });
      setResetSent(true);
    } catch (error) {
      console.error('Forgot password error:', error);
      if (error.response && error.response.data) {
        setError(error.response.data.message || 'Error sending password reset request.');
      } else {
        setError('Error sending password reset request. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Render the forgot password form
  if (forgotPassword) {
    return (
      <div className="login-container">
        <div className="login-background"></div>
        <div className="login-sphere" aria-hidden="true"></div>
        
        <div className="login-layout">
          <div className="login-left">
            <div className="login-card">
              <div className="login-header">
                <h1 className="login-title">ForteAI <span style={{ color: "#0A3D91" }}>Nexus</span></h1>
                <p className="login-subtitle">Password Recovery</p>
              </div>

              {resetSent ? (
                <div className="success-message">
                  <p>If your employee ID and email match our records, a password reset link has been sent.</p>
                  <p>Please check your email for further instructions.</p>
                  <button 
                    onClick={() => {
                      setForgotPassword(false);
                      setResetSent(false);
                      setForgotPasswordData({ employeesID: '', email: '' });
                    }}
                    className="login-button"
                  >
                    Return to Login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="login-form">
                  <div className="form-group">
                    <label htmlFor="employeesID">Employee ID</label>
                    <input
                      type="text"
                      id="employeesID"
                      name="employeesID"
                      value={forgotPasswordData.employeesID}
                      onChange={handleForgotPasswordChange}
                      required
                      placeholder="Enter your Employee ID"
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="email">Email Address</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={forgotPasswordData.email}
                      onChange={handleForgotPasswordChange}
                      required
                      placeholder="Enter your email address"
                      className="form-input"
                    />
                  </div>

                  {error && <div className="error-message">{error}</div>}

                  <button 
                    type="submit" 
                    className="login-button"
                    disabled={loading}
                  >
                    {loading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                  
                  <button 
                    type="button"
                    onClick={() => setForgotPassword(false)}
                    className="login-button secondary"
                  >
                    Back to Login
                  </button>
                </form>
              )}

              <div className="login-footer">
                <p>ForteAI Technologies Private Limited</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Regular login form
  return (
    <div className="login-container">
      {/* Background elements for bouncing spheres */}
      <div className="login-background"></div>

      {/* Main background sphere with enhanced animations */}
      <div className="login-sphere" aria-hidden="true"></div>

      <div className="login-layout">
        {/* Login card */}
        <div className="login-left">
          <div className="login-card">
            <div className="login-header">
              <h1 className="login-title">
                ForteAI <span style={{ color: "#0A3D91" }}>Nexus</span>
              </h1>
              <p className="login-subtitle">Connecting Talent and Insight.</p>
            </div>

            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-group">
                <label htmlFor="userID">Employee ID</label>
                <input
                  type="text"
                  id="userID"
                  name="userID"
                  value={credentials.userID}
                  onChange={handleChange}
                  required
                  placeholder="Enter your Employee ID"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <div className="password-container">
                  <input
                    type={passwordVisible ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={credentials.password}
                    onChange={handleChange}
                    required
                    placeholder="Enter your password"
                    className="form-input"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="eye-icon"
                    onClick={togglePasswordVisibility}
                    tabIndex={-1}
                    aria-label={passwordVisible ? 'Hide password' : 'Show password'}
                  >
                    <img
                      src={passwordVisible ? hide : show}
                      alt={passwordVisible ? 'Hide password' : 'Show password'}
                      width="21"
                      height="21"
                    />
                  </button>
                </div>
              </div>

              {error && <div className="error-message">{error}</div>}

              <button type="submit" className="login-button" disabled={loading}>
                {loading ? "Signing In..." : "Sign In"}
              </button>
              
              <div className="forgot-password">
                <button 
                  type="button" 
                  onClick={() => setForgotPassword(true)}
                  className="forgot-password-link"
                >
                  Forgot Password?
                </button>
              </div>
            </form>

            <div className="login-footer">
              <p>ForteAI Technologies Private Limited</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
