import React, { useEffect, useState } from 'react';
import './styles/form-styles.css';

const HRFeedback = ({ token, onComplete }) => {
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      // Attempt to check if HR already submitted, but don't block on errors
      let already = false;
      try {
        const respStatus = await fetch(`${import.meta.env.VITE_API_BASE_URL}/hr/feedback/responses`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (respStatus.ok) {
          const statusData = await respStatus.json();
          if (statusData.hasSubmitted) {
            already = true;
          }
        } else {
          console.warn('Feedback status fetch returned', respStatus.status);
        }
      } catch (err) {
        console.warn('Error fetching feedback status', err);
      }
      if (already) {
        setHasSubmitted(true);
        setLoading(false);
        return;
      }
      // Fetch questions
      try {
        const resp = await fetch(`${import.meta.env.VITE_API_BASE_URL}/hr/feedback/questions`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (resp.ok) {
          const data = await resp.json();
          setQuestions(data.questions || []);
        } else {
          console.error('Questions fetch failed status', resp.status);
          // show status code in UI
          setError(`Failed to load feedback form (status ${resp.status})`);
        }
      } catch (err) {
        console.error('Error fetching questions', err);
        setError(`Failed to load feedback form: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [token]);

  const handleChange = (questionId, value) => {
    setResponses(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { responses: [] };
    for (const q of questions) {
      const respVal = responses[q.question_id];
      if (q.question_type === 'text' || q.question_type === 'amount') {
        payload.responses.push({ question_id: q.question_id, option_id: null, response_text: String(respVal || '') });
      } else {
        // rating or choice
        payload.responses.push({ question_id: q.question_id, option_id: respVal || null, response_text: null });
      }
    }
    try {
      const resp = await fetch(`${import.meta.env.VITE_API_BASE_URL}/hr/feedback/responses`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const data = await resp.json();
      if (resp.ok) {
        setSubmitResult({ success: true, message: data.message || 'Submitted' });
        if (onComplete) onComplete();
      } else {
        setSubmitResult({ success: false, message: data.message || 'Submission failed' });
      }
    } catch (e) {
      console.error('Submit error', e);
      setSubmitResult({ success: false, message: 'Submission error' });
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (hasSubmitted) return (
    <div className="sentiment-form-container">
      <p>You have already submitted feedback. Thank you!</p>
    </div>
  );

  // Determine if all questions are answered
  const total = questions.length;
  const current = questions[currentIndex] || {};
  const progress = total ? Math.round(((currentIndex + 1) / total) * 100) : 0;
  const allAnswered = questions.length > 0 && questions.every(q => {
    const val = responses[q.question_id];
    if (q.question_type === 'text' || q.question_type === 'amount') {
      return val && String(val).trim() !== '';
    }
    // rating or choice
    return val !== undefined && val !== '';
  });

  return (
    <div className="sentiment-form-container">
      <h3>HR Feedback Survey</h3>
      <div className="progress-header">
        <span>Question {currentIndex + 1} of {total}</span>
        <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
      </div>
      <form className="sentiment-form-content" onSubmit={handleSubmit}>
        <div className="question-card">
          <label className="question-text">{current.question_text}</label>
          {current.question_type === 'text' && (
            <textarea
              value={responses[current.question_id] || ''}
              onChange={e => handleChange(current.question_id, e.target.value)}
              required
            />
          )}
          {current.question_type === 'amount' && (
            <div className="slider-container">
              {(() => {
                const min = 30, max = 100;
                const val = Number(responses[current.question_id] ?? min);
                const percent = ((val - min) / (max - min)) * 100;
                return (
                  <input
                    type="range"
                    min={min}
                    max={max}
                    step={1}
                    value={val}
                    onChange={e => handleChange(current.question_id, e.target.value)}
                    className="slider"
                    required
                    style={{ background: `linear-gradient(to right, #6366F1 ${percent}%, #E5E7EB ${percent}%)` }}
                  />
                );
              })()}
              <div className="slider-bubble" style={{ left: `${((Number(responses[current.question_id] ?? 30) - 30) / 70) * 100}%` }}>
                {responses[current.question_id] || 30} ₹
              </div>
              <div className="slider-values">
                <span>30</span>
                <span>100</span>
              </div>
            </div>
          )}
          {(current.question_type === 'rating' || current.question_type === 'choice') && (
            <div className="option-list">
              {current.options.map(opt => (
                <label key={opt.option_id} className="option-item">
                  <input
                    type="radio"
                    name={`q${current.question_id}`}
                    value={opt.option_id}
                    checked={responses[current.question_id] === String(opt.option_id)}
                    onChange={e => handleChange(current.question_id, e.target.value)}
                    required
                  />
                  <span>{opt.option_text}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        <div className="form-actions mobile-nav-buttons">
          {currentIndex > 0 && <button type="button" className="action-button" onClick={() => setCurrentIndex(i => i - 1)}>Previous</button>}
          {currentIndex < total - 1 && <button type="button" className="action-button primary" onClick={() => setCurrentIndex(i => i + 1)}>Next</button>}
          {currentIndex === total - 1 && (
            <button
              type="submit"
              className="action-button primary"
              disabled={!allAnswered}
            >
              Submit Feedback
            </button>
          )}
        </div>
        {submitResult && (
          <div className={submitResult.success ? 'success-message' : 'error-message'} style={{ marginTop: '16px' }}>
            {submitResult.message}
          </div>
        )}
      </form>
      {!allAnswered && currentIndex === total - 1 && (
        <div className="error-message" style={{ marginTop: '16px' }}>
          Please answer all questions before submitting.
        </div>
      )}
    </div>
  );
}  

export default HRFeedback;
