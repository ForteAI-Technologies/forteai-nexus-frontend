import React, { useState } from "react";

const BulkDownloadReports = ({ token }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const downloadAndReset = async () => {
    if (isProcessing) return;
    
    const confirmed = window.confirm(
      "This will download a MASTER ZIP file containing:\n" +
      "• Individual ZIP files for each company (with responses & AI analysis)\n" +
      "• Combined company reports CSV\n" +
      "• Combined HR feedback CSV\n\n" +
      "Then RESET all employee data for companies with complete reports.\n\n" +
      "⚠️ WARNING: This will clear:\n" +
      "- All employee sentiment responses\n" +
      "- All AI-generated employee reports\n" +
      "- All company reports\n" +
      "- Employee 'is_filled' status\n\n" +
      "Are you sure you want to continue?"
    );

    if (!confirmed) return;

    setIsProcessing(true);

    try {
      // Download master ZIP file with all companies
      console.log('Downloading master ZIP file...');
      const downloadRes = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/admin/download/all-reports`,
        { headers: { Authorization: token ? `Bearer ${token}` : "" } }
      );

      if (!downloadRes.ok) {
        const errorData = await downloadRes.json().catch(() => ({ message: 'Download failed' }));
        throw new Error(errorData.message || 'Failed to download master reports');
      }

      // Download the master ZIP file
      const blob = await downloadRes.blob();
      const url = window.URL.createObjectURL(blob);
      const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const a = document.createElement('a');
      a.href = url;
      a.download = `master_reports_${timestamp}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      console.log('Master ZIP downloaded successfully');

      // Wait a moment for download to start
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Now reset all companies with complete data
      console.log('Starting reset process...');
      
      const companiesRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/admin/companies`, {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      });
      
      if (!companiesRes.ok) throw new Error("Failed to fetch companies for reset");
      
      const companiesData = await companiesRes.json();
      const companies = companiesData.companies || [];

      const resetResults = {
        success: [],
        failed: []
      };

      for (const c of companies) {
        const name = c.company;
        
        try {
          const resetRes = await fetch(
            `${import.meta.env.VITE_API_BASE_URL}/admin/company/${encodeURIComponent(name)}/reset?onlyFilled=true`,
            {
              method: 'POST',
              headers: { Authorization: token ? `Bearer ${token}` : "" }
            }
          );

          if (resetRes.ok) {
            const resetData = await resetRes.json();
            if (resetData.resetEmployees > 0) {
              resetResults.success.push(name);
              console.log(`Reset ${name}:`, resetData);
            }
          } else {
            const resetError = await resetRes.json().catch(() => ({ message: 'Reset failed' }));
            resetResults.failed.push({ name, reason: resetError.message });
          }
        } catch (err) {
          console.error(`Error resetting ${name}:`, err);
          resetResults.failed.push({ name, reason: err.message });
        }

        // Small delay between companies
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      // Show summary
      let message = '✅ Download and Reset Complete!\n\n';
      message += `📦 Master ZIP file downloaded with all company reports.\n\n`;
      
      if (resetResults.success.length > 0) {
        message += `✅ Successfully reset ${resetResults.success.length} companies:\n`;
        message += resetResults.success.join(', ') + '\n\n';
      }
      
      if (resetResults.failed.length > 0) {
        message += `⚠️ ${resetResults.failed.length} companies could not be reset:\n`;
        resetResults.failed.forEach(fc => {
          message += `- ${fc.name}: ${fc.reason}\n`;
        });
      }

      if (resetResults.success.length === 0 && resetResults.failed.length === 0) {
        message += 'ℹ️ No companies needed to be reset (no complete data found).\n';
      }

      alert(message);

    } catch (err) {
      console.error("Bulk download and reset error:", err);
      alert("Error during bulk operation: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <button
      onClick={downloadAndReset}
      disabled={isProcessing}
      style={{
        background: isProcessing ? "#9ca3af" : "#dc2626",
        color: "#fff",
        border: "none",
        borderRadius: "8px",
        padding: "10px 16px",
        fontSize: "14px",
        fontWeight: 600,
        cursor: isProcessing ? "not-allowed" : "pointer",
        transition: "0.2s ease",
        opacity: isProcessing ? 0.7 : 1
      }}
      onMouseOver={(e) => !isProcessing && (e.target.style.background = "#b91c1c")}
      onMouseOut={(e) => !isProcessing && (e.target.style.background = "#dc2626")}
    >
      {isProcessing ? "Processing..." : "Download & Reset All"}
    </button>
  );
};

export default BulkDownloadReports;
