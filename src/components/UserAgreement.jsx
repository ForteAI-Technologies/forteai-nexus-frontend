import { useState } from 'react'
import axios from 'axios'
import './UserAgreement.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

const UserAgreement = ({ employee, onAgreementAccepted }) => {
  const [isChecked, setIsChecked] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCheckboxChange = (e) => {
    setIsChecked(e.target.checked)
    setError('')
  }

  const handleConfirm = async () => {
    if (!isChecked) {
      setError('You must agree to the terms before proceeding.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const token = localStorage.getItem('token')
      console.log('API_BASE_URL:', API_BASE_URL);
      console.log('Full URL:', `${API_BASE_URL}/accept-agreement`);
      console.log('Token:', token);
      
      // First test the simple endpoint
      console.log('Testing simple endpoint...');
      const testResponse = await axios.post(`${API_BASE_URL}/test-agreement`, {});
      console.log('Test response:', testResponse.data);
      
      const response = await axios.post(
        `${API_BASE_URL}/accept-agreement`,
        { employeesID: employee.employeesID },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (response.data.success) {
        // Update the employee object to reflect agreement acceptance
        const updatedEmployee = { ...employee, isagreed: true }
        onAgreementAccepted(updatedEmployee)
      } else {
        setError(response.data.message || 'Failed to save agreement.')
      }
    } catch (error) {
      console.error('Agreement acceptance error:', error)
      console.error('Full error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: `${API_BASE_URL}/accept-agreement`,
        employee: employee
      })
      
      if (error.response && error.response.data) {
        const errorMessage = error.response.data.message || 'Error saving agreement. Please try again.'
        setError(`${errorMessage} (Status: ${error.response.status})`)
      } else if (error.request) {
        setError('Unable to connect to server. Please check your connection and try again.')
      } else {
        setError(`Network error: ${error.message}`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="agreement-container">
      <div className="agreement-background"></div>
      <div className="agreement-sphere" aria-hidden="true"></div>
      
      <div className="agreement-layout">
        <div className="agreement-card">
          <div className="agreement-header">
            <h1 className="agreement-title">
              ForteAI <span style={{ color: "#0A3D91" }}>Nexus</span>
            </h1>
            <p className="agreement-subtitle">User Agreement</p>
          </div>

          <div className="agreement-content">
            <div className="agreement-text">
              <h3>Data Processing and Privacy Agreement</h3>
              <p>Before you proceed, please read and agree to the following terms:</p>
              
              <ul className="agreement-list">
                <li>
                  <strong>Data Processing:</strong> The collected data is processed and analyzed by AI to provide insights and improve workplace experience.
                </li>
                <li>
                  <strong>HR Visibility:</strong> The analyzed data is visible to HR to take proactive decisions for organizational improvement.
                </li>
                <li>
                  <strong>Data Security:</strong> The data is stored securely with strict confidentiality measures to protect your information.
                </li>
                <li>
                  <strong>Privacy Protection:</strong> The extracted labels and characteristics are used to enhance AI performance while ensuring user privacy through anonymous data processing. No employee names are stored in the analysis.
                </li>
              </ul>

              <div className="agreement-checkbox">
                <label className="checkbox-container">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={handleCheckboxChange}
                    className="checkbox-input"
                  />
                  <span className="checkbox-checkmark"></span>
                  <span className="checkbox-text">
                    I have read and agree to the terms stated above. I understand that my data will be processed according to these conditions.
                  </span>
                </label>
              </div>

              {error && <div className="error-message">{error}</div>}

              <div className="agreement-buttons">
                <button
                  onClick={handleConfirm}
                  disabled={!isChecked || loading}
                  className={`confirm-button ${!isChecked ? 'disabled' : ''}`}
                >
                  {loading ? 'Processing...' : 'Mark and Confirm'}
                </button>
              </div>
            </div>
          </div>

          <div className="agreement-footer">
            <p>ForteAI Technologies Private Limited</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UserAgreement
