import { useState, useEffect } from "react";
import "./Sidebar.css";

const Sidebar = ({
  user,
  onLogout,
  activeSection,
  onSectionChange,
  token,
  onOpenImport,
  onOpenAdd,
  showHrQuickActions = true,
}) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [companyStatus, setCompanyStatus] = useState(null);
  const [showDownloadConfirm, setShowDownloadConfirm] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [pwdState, setPwdState] = useState({ current: "", newPassword: "" });
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdResult, setPwdResult] = useState(null);
  const [validationMsg, setValidationMsg] = useState(null);
  const [toast, setToast] = useState(null);

  const handleTogglePwd = (e) => {
    if (e) e.stopPropagation();
    // on small screens use modal
    if (typeof window !== "undefined" && window.innerWidth <= 768) {
      setShowPwdModal(true);
    } else {
      setShowPwd(!showPwd);
    }
  };
  const triggerDownload = (url, filename) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  // Fetch company status for HR to know when all have submitted
  useEffect(() => {
    if (user?.role === "HR") {
      fetch(`${import.meta.env.VITE_API_BASE_URL}/company/report/status`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) setCompanyStatus(data);
        })
        .catch((err) => console.error("Error fetching company status", err));
    }
  }, [token, user]);

  // Build menu items per role, adding Submit Feedback for HR when ready
  let userMenuItems = [];
  if (user?.role === "HR") {
    userMenuItems = [{ id: "viewReports", label: "View Company Report" }];
    if (companyStatus && companyStatus.filled === companyStatus.total) {
      userMenuItems.push({ id: "submitFeedback", label: "Submit Feedback" });
    }
  } else if (user?.role === "Employee") {
    userMenuItems = [{ id: "sentiment", label: "Employee Survey" }];
  } else if (user?.role === "Manager") {
    userMenuItems = [];
  }

  const userMenu = userMenuItems.map((item) => (
    <button
      key={item.id}
      className={`nav-link ${
        activeSection === item.id ? "active" : ""
      }`}
      onClick={() => onSectionChange(item.id)}
    >
      <span className="nav-label">{item.label}</span>
    </button>
  ));

  return (
    <>
      {/* Mobile Menu Toggle */}
      <button
        className="mobile-menu-toggle"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        ☰
      </button>

      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="mobile-backdrop"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <div className={`sidebar ${isMobileOpen ? "mobile-open" : ""}`}>
        {/* Header */}
        <div className="sidebar-header">
          <div className="logo">
            <span className="logo-text">
              {user?.company}{" "}
              <span style={{ color: "#0A3D91", fontWeight: "bold" }}>Nexus</span>
            </span>
          </div>
        </div>

        {/* User Info */}
        <div className="sidebar-user">
          <div className="user-avatar">
            {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
          </div>
          <div className="user-details">
            <div className="user-name">{user?.name || user?.employeesID}</div>
            <div className="user-role">{user?.role}</div>
          </div>
          <button
            className="pwd-toggle"
            onClick={(e) => handleTogglePwd(e)}
            aria-label="Change password"
          >
            ⚙
          </button>
          {showPwd && (
            <div className="pwd-dropdown" onClick={(e) => e.stopPropagation()}>
              <button
                className="pwd-close"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPwd(false);
                }}
              >
                ✕
              </button>
              <div className="pwd-row">
                <input
                  type="password"
                  placeholder="Old password"
                  value={pwdState.current}
                  onChange={(e) =>
                    setPwdState({ ...pwdState, current: e.target.value })
                  }
                />
              </div>
              <div className="pwd-row">
                <input
                  type="password"
                  placeholder="New password"
                  value={pwdState.newPassword}
                  onChange={(e) =>
                    setPwdState({ ...pwdState, newPassword: e.target.value })
                  }
                />
              </div>
              <div className="pwd-row">
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                />
              </div>
              {validationMsg && (
                <div className="error-message" style={{ marginTop: 6 }}>
                  {validationMsg}
                </div>
              )}
              <div className="pwd-actions">
                <button
                  className="action-button compact primary"
                  onClick={async () => {
                    setPwdResult(null);
                    setValidationMsg(null);
                    // client-side validation
                    if (!pwdState.current) {
                      setValidationMsg("Please enter your current password");
                      return;
                    }
                    if (
                      !pwdState.newPassword ||
                      pwdState.newPassword.length < 6
                    ) {
                      setValidationMsg(
                        "New password must be at least 6 characters"
                      );
                      return;
                    }
                    if (pwdState.newPassword !== confirmPwd) {
                      setValidationMsg(
                        "New password and confirmation do not match"
                      );
                      return;
                    }
                    try {
                      const resp = await fetch(
                        "/api/change-password",
                        {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: token
                              ? `Bearer ${token}`
                              : undefined,
                          },
                          body: JSON.stringify({
                            current: pwdState.current,
                            newPassword: pwdState.newPassword,
                          }),
                        }
                      );
                      const d = await resp.json();
                      if (resp.ok) {
                        setPwdResult({
                          ok: true,
                          msg: d.message || "Password updated",
                        });
                        setToast({
                          msg: d.message || "Password updated",
                          type: "success",
                        });
                        setTimeout(() => setToast(null), 2500);
                        setPwdState({ current: "", newPassword: "" });
                        setConfirmPwd("");
                        // close dropdown shortly
                        setTimeout(() => {
                          setShowPwd(false);
                        }, 900);
                      } else {
                        setPwdResult({
                          ok: false,
                          msg: d.message || JSON.stringify(d),
                        });
                        setToast({
                          msg: d.message || JSON.stringify(d),
                          type: "error",
                        });
                        setTimeout(() => setToast(null), 3500);
                      }
                    } catch (err) {
                      setPwdResult({ ok: false, msg: err.message });
                    }
                  }}
                >
                  Update
                </button>
              </div>
              {pwdResult && (
                <div
                  className={pwdResult.ok ? "success-message" : "error-message"}
                  style={{ marginTop: 8 }}
                >
                  {pwdResult.msg}
                </div>
              )}
            </div>
          )}
          {showPwdModal && (
            <div
              className="modal-overlay"
              onClick={() => setShowPwdModal(false)}
            >
              <div
                className="modal-card"
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: 360 }}
              >
                <h3>Change Password</h3>
                <div className="pwd-row">
                  <input
                    type="password"
                    placeholder="Old password"
                    value={pwdState.current}
                    onChange={(e) =>
                      setPwdState({ ...pwdState, current: e.target.value })
                    }
                  />
                </div>
                <div className="pwd-row">
                  <input
                    type="password"
                    placeholder="New password"
                    value={pwdState.newPassword}
                    onChange={(e) =>
                      setPwdState({ ...pwdState, newPassword: e.target.value })
                    }
                  />
                </div>
                <div className="pwd-row">
                  <input
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPwd}
                    onChange={(e) => setConfirmPwd(e.target.value)}
                  />
                </div>
                {validationMsg && (
                  <div className="error-message" style={{ marginTop: 6 }}>
                    {validationMsg}
                  </div>
                )}
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    justifyContent: "flex-end",
                    marginTop: 12,
                  }}
                >
                  <button
                    className="action-button secondary"
                    onClick={() => setShowPwdModal(false)}
                  >
                    Close
                  </button>
                  <button
                    className="action-button primary"
                    onClick={async () => {
                      setValidationMsg(null);
                      setPwdResult(null);
                      if (!pwdState.current) {
                        setValidationMsg("Please enter your current password");
                        return;
                      }
                      if (
                        !pwdState.newPassword ||
                        pwdState.newPassword.length < 6
                      ) {
                        setValidationMsg(
                          "New password must be at least 6 characters"
                        );
                        return;
                      }
                      if (pwdState.newPassword !== confirmPwd) {
                        setValidationMsg(
                          "New password and confirmation do not match"
                        );
                        return;
                      }
                      try {
                        const resp = await fetch(
                          "/api/change-password",
                          {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                              Authorization: token
                                ? `Bearer ${token}`
                                : undefined,
                            },
                            body: JSON.stringify({
                              current: pwdState.current,
                              newPassword: pwdState.newPassword,
                            }),
                          }
                        );
                        const d = await resp.json();
                        if (resp.ok) {
                          setPwdResult({
                            ok: true,
                            msg: d.message || "Password updated",
                          });
                          setToast({
                            msg: d.message || "Password updated",
                            type: "success",
                          });
                          setTimeout(() => setToast(null), 2500);
                          setPwdState({ current: "", newPassword: "" });
                          setConfirmPwd("");
                          setTimeout(() => setShowPwdModal(false), 800);
                        } else {
                          setPwdResult({
                            ok: false,
                            msg: d.message || JSON.stringify(d),
                          });
                          setToast({
                            msg: d.message || JSON.stringify(d),
                            type: "error",
                          });
                          setTimeout(() => setToast(null), 3500);
                        }
                      } catch (err) {
                        setPwdResult({ ok: false, msg: err.message });
                      }
                    }}
                  >
                    Update
                  </button>
                </div>
                {pwdResult && (
                  <div
                    className={
                      pwdResult.ok ? "success-message" : "error-message"
                    }
                    style={{ marginTop: 8 }}
                  >
                    {pwdResult.msg}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Top items (Employee Survey / View Reports) placed directly under profile */}
        {(() => {
          const topIds = ["sentiment", "viewReports"];
          const topItems = userMenuItems.filter((i) => topIds.includes(i.id));
          if (topItems.length === 0) return null;
          return (
            <div className="sidebar-top-items" style={{ padding: "8px 16px" }}>
              <ul
                className="nav-list top-list"
                style={{ margin: 0, padding: 0 }}
              >
                {topItems.map((item) => (
                  <li key={item.id} className="nav-item">
                    <button
                      className={`nav-link ${activeSection === item.id ? "active" : ""
                        }`}
                      onClick={() => onSectionChange(item.id)}
                    >
                      <span className="nav-label">{item.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })()}

        {/* HR quick actions (placed under the user profile). Can be hidden when FAB handles these actions. */}
        {user?.role === "HR" && showHrQuickActions && (
          <div className="sidebar-hr-actions" style={{ padding: "12px 16px" }}>
            <ul
              className="nav-list hr-quick-list"
              style={{ margin: 0, padding: 0 }}
            >
              <li className="nav-item">
                <button
                  className={`nav-link ${activeSection === "import" ? "active" : ""
                    }`}
                  onClick={() => {
                    if (typeof onSectionChange === "function")
                      onSectionChange("import");
                    if (typeof onOpenImport === "function") onOpenImport();
                  }}
                >
                  <span className="nav-label">Import Employees</span>
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${activeSection === "add" ? "active" : ""
                    }`}
                  onClick={() => {
                    if (typeof onSectionChange === "function")
                      onSectionChange("add");
                    if (typeof onOpenAdd === "function") onOpenAdd();
                  }}
                >
                  <span className="nav-label">Add New Employee</span>
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${activeSection === "download" ? "active" : ""
                    }`}
                  onClick={() => {
                    if (typeof onSectionChange === "function")
                      onSectionChange("download");
                    setShowDownloadConfirm(true);
                  }}
                >
                  <span className="nav-label">Download sample XL</span>
                </button>
              </li>
            </ul>
          </div>
        )}

        {/* Navigation */}
        <nav className="sidebar-nav">
          <ul className="nav-list">
            {userMenuItems
              .filter((i) => i.id !== "sentiment" && i.id !== "viewReports")
              .map((item) => (
                <li key={item.id} className="nav-item">
                  <button
                    className={`nav-link ${activeSection === item.id ? "active" : ""
                      }`}
                    onClick={() => onSectionChange(item.id)}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    <span className="nav-label">{item.label}</span>
                  </button>
                </li>
              ))}
          </ul>
        </nav>

        {/* Download confirmation modal */}
        {showDownloadConfirm && (
          <div
            className="modal-overlay"
            onClick={() => setShowDownloadConfirm(false)}
          >
            <div
              className="modal-card"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: 360 }}
            >
              <h3>Confirm download</h3>
              <p>Do you want to download the sample XL file?</p>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  justifyContent: "flex-end",
                  marginTop: 12,
                }}
              >
                <button
                  className="action-button secondary"
                  onClick={() => setShowDownloadConfirm(false)}
                >
                  No
                </button>
                <button
                  className="action-button primary"
                  onClick={() => {
                    setShowDownloadConfirm(false);
                    triggerDownload("/sample_import.csv", "sample_import.csv");
                  }}
                >
                  Yes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Logout Button */}
        <div className="sidebar-footer">
          <button className="logout-btn" onClick={onLogout}>
            <span className="logout-text">Logout</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
