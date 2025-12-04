import React, { useEffect, useState } from 'react';
import './styles/form-styles.css';

// Minimal Sentiment form component
export default function SentimentForm({ token, employeeId = null }) {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(3);
  const [showTimeError, setShowTimeError] = useState(false);
  const [visitedQuestions, setVisitedQuestions] = useState(new Set([0])); // Track which questions have been visited
  const [hasSubmitted, setHasSubmitted] = useState(false); // Track if form has been submitted

  // Storage key for form data
  const storageKey = `sentiment_form_data_${employeeId || 'default'}`;
  const progressStorageKey = `sentiment_form_progress_${employeeId || 'default'}`;
  const visitedStorageKey = `sentiment_form_visited_${employeeId || 'default'}`;

  // Determine form id based on current month rotation 1..4 (each month rotates)
  // monthIndex is 0..11; formId cycles 1..4
  const monthIndex = new Date().getMonth(); // 0..11
  const formId = (monthIndex % 4) + 1;
  console.log(`SentimentForm: month=${monthIndex + 1}, formId=${formId}`);

  // Submission storage key depends on formId
  const submissionStorageKey = `sentiment_form_submitted_${employeeId || 'default'}_${formId}`;

  // Load saved answers and progress; also enforce reset when backend is_filled flag is false
  useEffect(() => {
    // Query backend for authoritative submission status.
    (async () => {
      if (!token) return;
      try {
        // If an employeeId prop is provided, use the generic employee status endpoint
        const url = employeeId ? `${import.meta.env.VITE_API_BASE_URL}/employees/${encodeURIComponent(employeeId)}/status` : `${import.meta.env.VITE_API_BASE_URL}/employees/me/status`;
        const resp = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        if (resp.ok) {
          const data = await resp.json();
          if (data && data.success && data.isFilled) {
            // mark submitted both in state and localStorage
            setHasSubmitted(true);
            localStorage.setItem(submissionStorageKey, 'true');
            return; // if submitted, skip loading saved answers
          } else {
            // Ensure any previously stored submitted flag is removed
            localStorage.removeItem(submissionStorageKey);
            setHasSubmitted(false);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch submission status from backend', err);
        // fall back to local storage if backend is unreachable
      }

      // Check if form has already been submitted in local storage (fallback)
      const submissionStatus = localStorage.getItem(submissionStorageKey);
      if (submissionStatus === 'true') {
        setHasSubmitted(true);
        return; // Don't load other data if already submitted
      }
    })();

    const savedAnswers = localStorage.getItem(storageKey);
    const savedProgress = localStorage.getItem(progressStorageKey);
    const savedVisited = localStorage.getItem(visitedStorageKey);

    if (savedAnswers) {
      try {
        setAnswers(JSON.parse(savedAnswers));
      } catch (_e) {
        console.warn('Invalid saved form data, clearing it');
        localStorage.removeItem(storageKey);
      }
    }

    if (savedProgress) {
      try {
        const progress = parseInt(savedProgress, 10);
        if (progress >= 0) {
          setCurrentQuestionIndex(progress);
        }
      } catch (_e) {
        localStorage.removeItem(progressStorageKey);
      }
    }

    if (savedVisited) {
      try {
        const visited = JSON.parse(savedVisited);
        setVisitedQuestions(new Set(visited));
      } catch (_e) {
        localStorage.removeItem(visitedStorageKey);
      }
    }
  }, [storageKey, progressStorageKey, visitedStorageKey, submissionStorageKey]);

  // Countdown timer for question reading time - only for first-time visits
  useEffect(() => {
    // Check if this question was already visited
    const isFirstTimeVisit = !visitedQuestions.has(currentQuestionIndex);

    if (isFirstTimeVisit) {
      // Mark as visited immediately
      const newVisited = new Set(visitedQuestions);
      newVisited.add(currentQuestionIndex);
      setVisitedQuestions(newVisited);
      localStorage.setItem(visitedStorageKey, JSON.stringify([...newVisited]));

      // Start 3-second timer
      setTimeRemaining(3);
      setShowTimeError(false);

      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    } else {
      // Already visited - no timer
      setTimeRemaining(0);
      setShowTimeError(false);
    }
  }, [currentQuestionIndex, visitedStorageKey]); // Remove visitedQuestions from dependency

  useEffect(() => {
    if (!formId || !token) return;
    setLoading(true);
    setMsg(null); // Clear previous messages

    console.log('Fetching form data for form_id:', formId); // Debug log
    const url = `${import.meta.env.VITE_API_BASE_URL}/sentiment/form/${formId}?t=${Date.now()}`; // cache-busting
    fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => {
        console.log('Response status:', r.status); // Debug log
        if (!r.ok) {
          throw new Error(`HTTP ${r.status}`);
        }
        return r.json();
      })
      .then(data => {
        console.log('API response:', data); // Debug log
        if (data.success) {
          setQuestions(data.questions);
          if (data.questions.length === 0) {
            setMsg('No questions found for this form');
          }
        } else {
          setMsg(data.message || 'Failed to load questions');
        }
      })
      .catch(err => {
        console.error('Fetch error:', err); // Debug log
        setMsg(`Network error: ${err.message}`);
      })
      .finally(() => setLoading(false));
  }, [formId, token]);

  const handleChange = (qid, value) => {
    const newAnswers = { ...answers, [qid]: value };
    setAnswers(newAnswers);
    // Save to localStorage immediately when user types/selects
    localStorage.setItem(storageKey, JSON.stringify(newAnswers));
  };

  // Navigation functions with animation
  const goToNextQuestion = () => {
    // Only check timer if current question has never been visited before
    if (!visitedQuestions.has(currentQuestionIndex) && timeRemaining > 0) {
      setShowTimeError(true);
      setMsg('Please take a moment to read the question carefully before proceeding.');
      setTimeout(() => {
        setShowTimeError(false);
        setMsg(null);
      }, 3000);
      return;
    }

    // Check if current question is answered
    const currentAnswer = answers[currentQuestion?.form_question_id];
    if (!currentAnswer || (typeof currentAnswer === 'string' && currentAnswer.trim() === '')) {
      setMsg('Please provide an answer before proceeding to the next question.');
      setTimeout(() => setMsg(null), 3000);
      return;
    }

    if (currentQuestionIndex < questions.length - 1) {
      setIsAnimating(true);
      setTimeout(() => {
        const nextIndex = currentQuestionIndex + 1;
        setCurrentQuestionIndex(nextIndex);
        localStorage.setItem(progressStorageKey, String(nextIndex));
        setIsAnimating(false);
      }, 150);
    }
  };

  const goToPreviousQuestion = () => {
    // No timer check needed for going back
    if (currentQuestionIndex > 0) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentQuestionIndex(currentQuestionIndex - 1);
        localStorage.setItem(progressStorageKey, String(currentQuestionIndex - 1));
        setIsAnimating(false);
      }, 150);
    }
  };

  const goToQuestion = (index) => {
    // Only check timer if current question has never been visited before
    if (!visitedQuestions.has(currentQuestionIndex) && timeRemaining > 0) {
      setShowTimeError(true);
      setMsg('Please take a moment to read the question carefully before proceeding.');
      setTimeout(() => {
        setShowTimeError(false);
        setMsg(null);
      }, 3000);
      return;
    }

    if (index >= 0 && index < questions.length && index !== currentQuestionIndex) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentQuestionIndex(index);
        localStorage.setItem(progressStorageKey, String(index));
        setIsAnimating(false);
      }, 150);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check timer if current question is being visited for first time
    if (!visitedQuestions.has(currentQuestionIndex) && timeRemaining > 0) {
      setShowTimeError(true);
      setMsg('Please take a moment to read the question carefully before submitting.');
      setTimeout(() => {
        setShowTimeError(false);
        setMsg(null);
      }, 3000);
      return;
    }

    // Check if current question is answered before submitting
    const currentAnswer = answers[currentQuestion?.form_question_id];
    if (!currentAnswer || (typeof currentAnswer === 'string' && currentAnswer.trim() === '')) {
      setMsg('Please provide an answer to the current question before submitting.');
      setTimeout(() => setMsg(null), 3000);
      return;
    }

    // Check if all 25 questions are answered
    const totalAnswered = Object.keys(answers).filter(key => {
      const answer = answers[key];
      return answer && (typeof answer !== 'string' || answer.trim() !== '');
    }).length;

    if (totalAnswered < 25) {
      setShowTimeError(true);
      setMsg(`Please answer all 25 questions before submitting. You have answered ${totalAnswered}/25 questions.`);
      setTimeout(() => {
        setShowTimeError(false);
        setMsg(null);
      }, 4000);
      return;
    }

    setLoading(true);
    // build answers array
    const payload = Object.keys(answers).map(key => {
      const q = questions.find(x => x.form_question_id === parseInt(key, 10));
      if (!q) return null;
      if (q.question_type === 'text') {
        return { form_question_id: key, answer_text: answers[key] };
      }
      return { form_question_id: key, answer_choice: answers[key] };
    }).filter(Boolean);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/sentiment/response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
    body: JSON.stringify({ employee_id: employeeId, employeesID: employeeId, form_id: formId, answers: payload })
      });
      const data = await res.json();
      if (data.success) {
        // Mark form as submitted permanently
        localStorage.setItem(submissionStorageKey, 'true');
        setHasSubmitted(true);

        // Clear saved data from localStorage after successful submission
        localStorage.removeItem(storageKey);
        localStorage.removeItem(progressStorageKey);
        localStorage.removeItem(visitedStorageKey);

        // Show completion animation
        setIsCompleted(true);
        setShowSuccessAnimation(true);

        // Keep the success message permanently (don't reset)
        setTimeout(() => {
          setMsg('Responses saved successfully!');
        }, 3000);
      } else {
        setMsg(data.message || 'Save failed');
      }
    } catch (error) {
      console.error('Network error:', error);
      setMsg('Network error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ color: '#fff' }}>Loading...</div>;

  // Show "already submitted" message if user has already completed the form
  if (hasSubmitted) {
    return (
      <div className="sentiment-form-container">
        <div className="sentiment-form-content">
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '70vh',
            textAlign: 'center',
            padding: 40,
            position: 'relative',
            overflow: 'hidden',
            width: '100%',
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            {/* Animated icon: cycles between a filled green circle and a check-badge */}
            <div style={{
              width: 140,
              height: 140,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
              position: 'relative'
            }}>
              <div className="anim-icon" style={{ position: 'relative', width: 140, height: 140 }}>
                <svg className="icon-wrap" viewBox="0 0 120 120" width="140" height="140" style={{ position: 'absolute', left: 0, top: 0 }}>
                  <defs>
                    <linearGradient id="g1" x1="0" x2="1">
                      <stop offset="0%" stopColor="#34d399" />
                      <stop offset="100%" stopColor="#059669" />
                    </linearGradient>
                    <linearGradient id="g2" x1="0" x2="1">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#059669" />
                    </linearGradient>
                  </defs>

                  {/* outer green circle and ripple removed - keep only inner badge + check */}

                  {/* badge group: inner circle + check (scallop dots removed) */}
                  <g className="badge-group" transform="translate(0,0)">
                      <circle className="badge-inner" cx="60" cy="60" r="36" fill="url(#g2)" />
                      <path className="check" d="M46 62l8 8 20-22" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                      {/* scallop dots removed */}
                  </g>
                </svg>
              </div>
            </div>

            <h2 style={{
              color: '#fff',
              fontSize: 34,
              fontWeight: 600,
              marginBottom: 8
            }}>
              Thank you for your time!
            </h2>

            <p style={{
              color: '#a1a1aa',
              fontSize: 18,
              lineHeight: 1.6,
              maxWidth: 400,
              marginBottom: 20,
              textAlign: 'center'
            }}>
              You have completed this sentiment survey. Your responses have been recorded and are being processed.
            </p>

            <div style={{
              display: 'flex',
              gap: 12
            }}>
              <div style={{
                padding: '12px 20px',
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.1))',
                borderRadius: 12,
                color: '#10b981',
                fontSize: 14,
                fontWeight: 600,
                border: '2px solid rgba(16, 185, 129, 0.3)'
              }}>
                ✓ Survey Completed
              </div>
              <div style={{
                padding: '12px 20px',
                background: 'linear-gradient(135deg, rgba(138, 66, 238, 0.2), rgba(111, 58, 241, 0.1))',
                borderRadius: 12,
                color: '#8a42ee',
                fontSize: 14,
                fontWeight: 600,
                border: '2px solid rgba(138, 66, 238, 0.3)'
              }}>
                ✓ Data Recorded
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;

  // Calculate progress based on answered questions, not current question index
  const answeredCount = questions.filter(q => {
    const answer = answers[q.form_question_id];
    return answer && (typeof answer !== 'string' || answer.trim() !== '');
  }).length;
  const progressPercentage = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

  return (
    <div>
      {/* Main Content */}
      <div style={{ flex: 1, maxWidth: isCompleted ? 820 : 720 }}>
        {/* Completion Screen */}
        {isCompleted ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '70vh',
            textAlign: 'center',
            padding: 40,
            position: 'relative',
            overflow: 'hidden',
            width: '100%',
            maxWidth: '600px',
            margin: '0 auto'
          }}>
          {/* Confetti Animation */}
          {confetti.map(piece => (
            <div
              key={piece.id}
              style={{
                position: 'absolute',
                left: `${piece.x}%`,
                top: `${piece.y}%`,
                width: `${piece.size}px`,
                height: `${piece.size}px`,
                backgroundColor: piece.color,
                transform: `rotate(${piece.rotation}deg)`,
                borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                pointerEvents: 'none',
                zIndex: 1000,
                boxShadow: `0 4px 8px rgba(0,0,0,0.1)`
              }}
            />
          ))}

          {/* Success Animation */}
          <div style={{
            width: 120,
            height: 120,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 32,
            transform: showSuccessAnimation ? 'scale(1.1)' : 'scale(1)',
            transition: 'transform 0.5s ease',
            boxShadow: '0 20px 40px rgba(16, 185, 129, 0.3)',
            position: 'relative',
            zIndex: 1
          }}>
            <svg
              width="60"
              height="60"
              viewBox="0 0 24 24"
              fill="none"
              style={{
                color: 'white',
                animation: showSuccessAnimation ? 'checkmark 0.6s ease-in-out' : 'none'
              }}
            >
              <path
                d="M9 12l2 2 4-4"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <h2 style={{
            color: '#fff',
            fontSize: 32,
            fontWeight: 600,
            marginBottom: 16,
            opacity: showSuccessAnimation ? 1 : 0.8,
            transition: 'opacity 0.5s ease',
            animation: showSuccessAnimation ? 'fadeInUp 0.8s ease 0.3s both' : 'none'
          }}>
            🎉 Survey Completed! 🎉
          </h2>

          <p style={{
            color: '#a1a1aa',
            fontSize: 18,
            lineHeight: 1.6,
            maxWidth: 400,
            marginBottom: 32,
            animation: showSuccessAnimation ? 'fadeInUp 0.8s ease 0.5s both' : 'none'
          }}>
            Thank you for your valuable feedback! Your responses have been saved successfully and will help improve our workplace environment.
          </p>

          <div style={{
            display: 'flex',
            gap: 12,
            opacity: showSuccessAnimation ? 1 : 0.8,
            transition: 'opacity 0.5s ease 0.3s',
            animation: showSuccessAnimation ? 'fadeInUp 0.8s ease 0.7s both' : 'none'
          }}>
            <div style={{
              padding: '12px 20px',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.1))',
              borderRadius: 12,
              color: '#10b981',
              fontSize: 14,
              fontWeight: 600,
              border: '2px solid rgba(16, 185, 129, 0.3)',
              animation: showSuccessAnimation ? 'bounce 1s ease 1s both' : 'none'
            }}>
              ✓ Responses Saved
            </div>
            <div style={{
              padding: '12px 20px',
              background: 'linear-gradient(135deg, rgba(138, 66, 238, 0.2), rgba(111, 58, 241, 0.1))',
              borderRadius: 12,
              color: '#8a42ee',
              fontSize: 14,
              fontWeight: 600,
              border: '2px solid rgba(138, 66, 238, 0.3)',
              animation: showSuccessAnimation ? 'bounce 1s ease 1.2s both' : 'none'
            }}>
              ✓ Analysis Complete
            </div>
          </div>
        </div>
      ) : (
        <>
      {/* Header with progress */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ color: '#1f2937', marginBottom: 8 }}>Sentiment Survey</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <span style={{ color: '#6b7280', fontSize: 14 }}>
            Question {currentQuestionIndex + 1} of {totalQuestions} | {answeredCount} answered
          </span>
          <div style={{ flex: 1, height: 6, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
                width: `${progressPercentage}%`,
                transition: 'width 0.3s ease'
              }}
            />
          </div>
          <span style={{ color: '#6b7280', fontSize: 14 }}>{Math.round(progressPercentage)}%</span>
        </div>
      </div>

      {msg && <div style={{ color: '#dc2626', marginBottom: 16, padding: 12, backgroundColor: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca' }}>{msg}</div>}

      {questions.length === 0 && !loading && !msg && (
        <div style={{ color: '#dc2626' }}>No questions loaded. Please check your connection or contact support.</div>
      )}

      {currentQuestion && (
        <div style={{ minHeight: 400 }}>
          {/* Question Card with Animation */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: 16,
              padding: 32,
              marginBottom: 24,
              border: '1px solid #e5e7eb',
              transform: isAnimating ? 'scale(0.98) translateY(10px)' : 'scale(1) translateY(0)',
              opacity: isAnimating ? 0.7 : 1,
              transition: 'all 0.15s ease',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
            }}
          >
            <div style={{ marginBottom: 24 }}>
              <span style={{
                color: '#4f46e5',
                fontSize: 16,
                fontWeight: 600,
                marginBottom: 8,
                display: 'block'
              }}>
                {currentQuestion.question_number || (currentQuestionIndex + 1)}.
              </span>
              <h3 className="question-text" style={{
                color: '#1f2937',
                fontSize: 20,
                fontWeight: 500,
                lineHeight: 1.4,
                margin: 0
              }}>
                {currentQuestion.question_text}
              </h3>

              {/* Error Message */}
              {showTimeError && (
                <div style={{
                  marginTop: 12,
                  padding: '8px 12px',
                  backgroundColor: '#fef2f2',
                  borderRadius: 8,
                  fontSize: 14,
                  color: '#dc2626',
                  textAlign: 'center',
                  border: '1px solid #fecaca'
                }}>
                  Please read the question carefully for at least 3 seconds before proceeding
                </div>
              )}
            </div>

            {/* Answer Input */}
            {currentQuestion.question_type === 'text' ? (
              <textarea
                placeholder={currentQuestion.helper_text || 'Type your response here...'}
                value={answers[currentQuestion.form_question_id] || ''}
                onChange={e => handleChange(currentQuestion.form_question_id, e.target.value)}
                style={{
                  width: '100%',
                  minHeight: 120,
                  padding: 16,
                  borderRadius: 12,
                  background: '#ffffff',
                  color: '#1f2937',
                  border: '1px solid #d1d5db',
                  fontSize: 16,
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  outline: 'none',
                  transition: 'border-color 0.2s ease'
                }}
                onFocus={e => e.target.style.borderColor = '#4f46e5'}
                onBlur={e => e.target.style.borderColor = '#d1d5db'}
              />
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {(() => {
                  let opts = [];
                  try {
                    if (!currentQuestion.options_questions) opts = [];
                    else if (typeof currentQuestion.options_questions === 'string') opts = JSON.parse(currentQuestion.options_questions);
                    else opts = currentQuestion.options_questions;
                  } catch (e) {
                    console.error('Failed to parse options for question', currentQuestion.form_question_id, e);
                    opts = [];
                  }

                  if (!opts || opts.length === 0) {
                    return <div style={{ color: '#dc2626' }}>No choices available</div>;
                  }

                  return opts.map((opt) => {
                    const val = String(opt.value);
                    const checked = answers[currentQuestion.form_question_id] === val || answers[currentQuestion.form_question_id] === opt.value;
                    return (
                      <label
                        key={val}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: 16,
                          background: checked ? '#eff6ff' : '#ffffff',
                          borderRadius: 12,
                          border: `1px solid ${checked ? '#3b82f6' : '#e5e7eb'}`,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          transform: 'scale(1)',
                          color: '#1f2937'
                        }}
                        onMouseEnter={e => {
                          if (!checked) {
                            e.target.style.background = '#f9fafb';
                            e.target.style.transform = 'scale(1.01)';
                            e.target.style.borderColor = '#d1d5db';
                          }
                        }}
                        onMouseLeave={e => {
                          if (!checked) {
                            e.target.style.background = '#ffffff';
                            e.target.style.transform = 'scale(1)';
                            e.target.style.borderColor = '#e5e7eb';
                          }
                        }}
                      >
                        <input
                          type="radio"
                          name={`q_${currentQuestion.form_question_id}`}
                          value={val}
                          checked={checked}
                          onChange={e => handleChange(currentQuestion.form_question_id, e.target.value)}
                          style={{
                            marginRight: 12,
                            accentColor: '#8a42ee',
                            transform: 'scale(1.2)'
                          }}
                        />
                        <span style={{ color: '#1f2937', fontSize: 16 }}>{opt.label}</span>
                      </label>
                    );
                  });
                })()}
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="mobile-nav-buttons" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <button
              onClick={goToPreviousQuestion}
              disabled={currentQuestionIndex === 0}
              style={{
                background: currentQuestionIndex === 0 ? '#f3f4f6' : 'linear-gradient(135deg,#4f46e5,#7c3aed)',
                color: currentQuestionIndex === 0 ? '#9ca3af' : '#ffffff',
                border: 'none',
                padding: '12px 24px',
                borderRadius: 8,
                cursor: currentQuestionIndex === 0 ? 'not-allowed' : 'pointer',
                fontSize: 14,
                fontWeight: 500,
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={e => {
                if (currentQuestionIndex !== 0) {
                  e.target.style.transform = 'scale(1.05)';
                }
              }}
              onMouseLeave={e => {
                if (currentQuestionIndex !== 0) {
                  e.target.style.transform = 'scale(1)';
                }
              }}
            >
              ← Previous
            </button>

            {/* Question dots navigation */}
            <div style={{
              display: 'flex',
              gap: 4,
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1
            }}>
              {questions.slice(0, Math.min(questions.length, 10)).map((_, index) => {
                const isActive = index === currentQuestionIndex;
                const isAnswered = answers[questions[index]?.form_question_id];
                return (
                  <button
                    key={index}
                    onClick={() => goToQuestion(index)}
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      border: 'none',
                      background: isActive ? '#4f46e5' : isAnswered ? 'rgba(79, 70, 229, 0.5)' : 'rgba(156, 163, 175, 0.4)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      transform: isActive ? 'scale(1.3)' : 'scale(1)',
                      padding: 0,
                      minWidth: 6,
                      minHeight: 6
                    }}
                  />
                );
              })}
              {questions.length > 10 && (
                <span style={{ color: '#6b7280', fontSize: 12, marginLeft: 8 }}>
                  +{totalQuestions - answeredCount} unanswered
                </span>
              )}
            </div>

            {currentQuestionIndex === questions.length - 1 ? (
              <button
                onClick={handleSubmit}
                disabled={!answers[currentQuestion?.form_question_id] || (typeof answers[currentQuestion?.form_question_id] === 'string' && answers[currentQuestion?.form_question_id].trim() === '') || timeRemaining > 0}
                style={{
                  background: (!answers[currentQuestion?.form_question_id] || (typeof answers[currentQuestion?.form_question_id] === 'string' && answers[currentQuestion?.form_question_id].trim() === '') || timeRemaining > 0)
                    ? '#f3f4f6'
                    : 'linear-gradient(135deg,#4f46e5,#7c3aed)',
                  color: (!answers[currentQuestion?.form_question_id] || (typeof answers[currentQuestion?.form_question_id] === 'string' && answers[currentQuestion?.form_question_id].trim() === '') || timeRemaining > 0)
                    ? '#9ca3af'
                    : '#ffffff',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: 8,
                  cursor: (!answers[currentQuestion?.form_question_id] || (typeof answers[currentQuestion?.form_question_id] === 'string' && answers[currentQuestion?.form_question_id].trim() === '') || timeRemaining > 0)
                    ? 'not-allowed'
                    : 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={e => {
                  if (answers[currentQuestion?.form_question_id] && !(typeof answers[currentQuestion?.form_question_id] === 'string' && answers[currentQuestion?.form_question_id].trim() === '') && timeRemaining === 0) {
                    e.target.style.transform = 'scale(1.05)';
                  }
                }}
                onMouseLeave={e => {
                  if (answers[currentQuestion?.form_question_id] && !(typeof answers[currentQuestion?.form_question_id] === 'string' && answers[currentQuestion?.form_question_id].trim() === '') && timeRemaining === 0) {
                    e.target.style.transform = 'scale(1)';
                  }
                }}
              >
                {timeRemaining > 0 ? `Wait ${timeRemaining}s` : 'Submit Survey'}
              </button>
            ) : (
              <button
                onClick={goToNextQuestion}
                disabled={!answers[currentQuestion?.form_question_id] || (typeof answers[currentQuestion?.form_question_id] === 'string' && answers[currentQuestion?.form_question_id].trim() === '') || timeRemaining > 0}
                style={{
                  background: (!answers[currentQuestion?.form_question_id] || (typeof answers[currentQuestion?.form_question_id] === 'string' && answers[currentQuestion?.form_question_id].trim() === '') || timeRemaining > 0)
                    ? '#f3f4f6'
                    : 'linear-gradient(135deg,#4f46e5,#7c3aed)',
                  color: (!answers[currentQuestion?.form_question_id] || (typeof answers[currentQuestion?.form_question_id] === 'string' && answers[currentQuestion?.form_question_id].trim() === '') || timeRemaining > 0)
                    ? '#9ca3af'
                    : '#ffffff',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: 8,
                  cursor: (!answers[currentQuestion?.form_question_id] || (typeof answers[currentQuestion?.form_question_id] === 'string' && answers[currentQuestion?.form_question_id].trim() === '') || timeRemaining > 0)
                    ? 'not-allowed'
                    : 'pointer',
                  fontSize: 14,
                  fontWeight: 500,
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={e => {
                  if (answers[currentQuestion?.form_question_id] && !(typeof answers[currentQuestion?.form_question_id] === 'string' && answers[currentQuestion?.form_question_id].trim() === '') && timeRemaining === 0) {
                    e.target.style.transform = 'scale(1.05)';
                  }
                }}
                onMouseLeave={e => {
                  if (answers[currentQuestion?.form_question_id] && !(typeof answers[currentQuestion?.form_question_id] === 'string' && answers[currentQuestion?.form_question_id].trim() === '') && timeRemaining === 0) {
                    e.target.style.transform = 'scale(1)';
                  }
                }}
              >
                {timeRemaining > 0 ? `Wait ${timeRemaining}s` : 'Next →'}
              </button>
            )}
          </div>
        </div>
      )}
      </>
      )}

      {/* Add keyframe animation for success checkmark and celebration */}
      <style>{`
        @keyframes checkmark {
          0% { transform: scale(0) rotate(45deg); }
          50% { transform: scale(1.2) rotate(45deg); }
          100% { transform: scale(1) rotate(45deg); }
        }

        @keyframes celebration {
          0% { transform: scale(1) rotate(0deg); }
          25% { transform: scale(1.05) rotate(-5deg); }
          50% { transform: scale(1.1) rotate(5deg); }
          75% { transform: scale(1.05) rotate(-3deg); }
          100% { transform: scale(1) rotate(0deg); }
        }

        @keyframes fadeInUp {
          0% {
            opacity: 0;
            transform: translateY(30px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes bounce {
          0%, 20%, 53%, 80%, 100% {
            transform: translate3d(0,0,0);
          }
          40%, 43% {
            transform: translate3d(0,-15px,0);
          }
          70% {
            transform: translate3d(0,-7px,0);
          }
          90% {
            transform: translate3d(0,-2px,0);
          }
        }
        /* Payment-style continuous loop: ripple -> badge -> check draw -> pause -> loop */
        .anim-icon .base-circle { transform-origin: 60px 60px; }
  .anim-icon .ripple { opacity: 0; transform-origin: 60px 60px; stroke-opacity: 0.9; animation: rippleAnim 2.8s ease-in-out infinite; transform-box: fill-box; }
  .anim-icon .badge-group { opacity: 0; transform-origin: 60px 60px; transform: scale(0.9); animation: badgeAnim 2.8s ease-in-out infinite; }
  .anim-icon .scallops { transform-origin: 60px 60px; animation: scallopRotate 4.5s linear infinite; transform-box: fill-box; }
  .anim-icon .badge-inner { transform-origin: 60px 60px; }
  /* approximate path length ~64; tune if necessary */
  .anim-icon .check { stroke-dasharray: 64; stroke-dashoffset: 64; opacity: 0; animation: checkDraw 2.8s linear infinite; }

        @keyframes rippleAnim {
          0% { stroke-width: 6; opacity: 0; transform: scale(1); }
          10% { opacity: 0.55; transform: scale(1.02); }
          35% { opacity: 0.22; transform: scale(1.08); }
          55% { opacity: 0; transform: scale(1.12); }
          100% { opacity: 0; transform: scale(1.12); }
        }

        @keyframes badgeAnim {
          0% { opacity: 0; transform: scale(0.9); }
          45% { opacity: 0; transform: scale(0.95); }
          55% { opacity: 1; transform: scale(1.04); }
          70% { opacity: 1; transform: scale(1); }
          100% { opacity: 1; transform: scale(1); }
        }

        @keyframes scallopRotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes checkDraw {
          0% { stroke-dashoffset: 100; opacity: 0; }
          50% { stroke-dashoffset: 100; opacity: 0; }
          60% { opacity: 1; }
          75% { stroke-dashoffset: 20; }
          90% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: 0; opacity: 1; }
        }
      `}</style>
      </div>
    </div>
  );
}
