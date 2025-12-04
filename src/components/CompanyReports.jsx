import React, { useRef, useEffect, useState } from 'react';
import './CompanyReports.css';
import html2pdf from 'html2pdf.js';
const CompanyReports = ({ companyReport, onBack, onViewEmployees, hideActions = false, autoDownload = false }) => {
  const reportRef = useRef();
  const [isDownloading, setIsDownloading] = useState(false);
  const downloadingRef = useRef(false);
  // generate PDF of the report
  const downloadReport = () => {
  // guard to prevent double download on rapid clicks
  if (downloadingRef.current) return;
  downloadingRef.current = true;
  setIsDownloading(true);
  const element = reportRef.current;
    // hide action buttons to exclude from PDF
    const headerBtns = element.querySelectorAll('.report-header .action-button');
    headerBtns.forEach(btn => btn.style.display = 'none');
    const opt = {
      margin:       0.5,
      filename:     `company-report-${companyReport.companyName || 'report'}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save()
      .finally(() => {
        // restore buttons' visibility
        headerBtns.forEach(btn => btn.style.display = '');
        setIsDownloading(false);
        downloadingRef.current = false;
      });
  };

  // auto-trigger download if requested
  useEffect(() => {
    if (autoDownload && companyReport?.report) {
      downloadReport();
    }
  }, [autoDownload, companyReport]);

  return (
    <div className="report-detail" ref={reportRef}>
      <div className="report-header">
        <h3>Company Sentiment Report{companyReport?.companyName ? ` - ${companyReport.companyName}` : ''}</h3>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          {!hideActions ? (
            <>
              <button className="action-button" onClick={onViewEmployees}>
                View Employees
              </button>
              {companyReport?.report && (
                <button
                  className="action-button"
                  onClick={downloadReport}
                  disabled={isDownloading}
                >
                  {isDownloading ? 'Downloading…' : 'Download Report'}
                </button>
              )}
            </>
          ) : (
            <button className="action-button" onClick={onBack}>
              Back to Company
            </button>
          )}
        </div>
      </div>
      {companyReport?.report ? (
        <div className="report-content">
          <div className="report-overview">
            <h4>Sentiment Overview</h4>
            <div className="sentiment-scores">
              <div className="sentiment-item positive">
                <span className="sentiment-label">Positive</span>
                <span className="sentiment-value">{companyReport.report.positive_sentiment}%</span>
              </div>
              <div className="sentiment-item neutral">
                <span className="sentiment-label">Neutral</span>
                <span className="sentiment-value">{companyReport.report.neutral_sentiment}%</span>
              </div>
              <div className="sentiment-item negative">
                <span className="sentiment-label">Negative</span>
                <span className="sentiment-value">{companyReport.report.negative_sentiment}%</span>
              </div>
            </div>
          </div>

          <div className="report-section">
            <h4>Summary Opinion</h4>
            <p className="summary-text">{companyReport.report.summary_opinion}</p>
          </div>

          <div className="report-section">
            <h4>Key Positive Aspects</h4>
            <div className="positive-aspects">
              <div className="aspect-item">
                <span className="aspect-number">1.</span>
                <p>{companyReport.report.key_positive_1}</p>
              </div>
              <div className="aspect-item">
                <span className="aspect-number">2.</span>
                <p>{companyReport.report.key_positive_2}</p>
              </div>
              <div className="aspect-item">
                <span className="aspect-number">3.</span>
                <p>{companyReport.report.key_positive_3}</p>
              </div>
            </div>
          </div>

          <div className="report-section">
            <h4>Attrition Analysis & Retention Strategies</h4>
            <div className="attrition-analysis">
              {[1, 2, 3].map((num) => (
                <div key={num} className="attrition-item">
                  <h5>Factor {num}</h5>
                  <div className="attrition-details">
                    <div className="attrition-factor">
                      <strong>Factor:</strong> {companyReport.report[`attrition_factor_${num}`]}
                    </div>
                    <div className="attrition-problem">
                      <strong>Problem:</strong> {companyReport.report[`attrition_problem_${num}`]}
                    </div>
                    <div className="retention-strategy">
                      <strong>Retention Strategy:</strong> {companyReport.report[`retention_strategy_${num}`]}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="report-footer">
            <p className="report-date">
              Report Generated: {companyReport.report.created_at ? new Date(companyReport.report.created_at).toLocaleDateString() : '-'}
              {companyReport.report.created_at ? ` at ${new Date(companyReport.report.created_at).toLocaleTimeString()}` : ''}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default CompanyReports;
