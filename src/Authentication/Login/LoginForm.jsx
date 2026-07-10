import React, { useState, useRef, useEffect, useCallback } from "react";

/**
 * LoginForm.jsx
 * -------------------------------------------------------------
 * Two-step authentication for the MIS App:
 *   Step 1: Email + Password
 *   Step 2: OTP verification
 *
 * Role routing:
 *   - If the email matches an "admin" identity -> role = "admin"
 *   - Else                                      -> role = "user"
 *   The parent component (App.jsx / router) decides which
 *   workspace (Floor 1 - Admin / Floor 2 - User) to mount,
 *   based on the role returned in onLoginSuccess(role, email).
 *
 * Wire-up notes (for later, when you connect real APIs):
 *   1. Replace `mockCheckCredentials()` with your real
 *      POST /api/auth/login  -> { success, isAdmin }
 *   2. Replace `mockSendOtp()` with your real
 *      POST /api/auth/send-otp
 *   3. Replace `mockVerifyOtp()` with your real
 *      POST /api/auth/verify-otp -> { success, token, role }
 *
 * Everything else (UI, validation, timers, focus handling)
 * is production-ready as-is.
 * -------------------------------------------------------------
 */

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

// --- TEMP: replace this with your real admin-detection logic / API ---
const ADMIN_EMAIL_PATTERNS = ["admin@pgel.com", "admin@pgtl.com"];
function resolveRole(email) {
  const normalized = email.trim().toLowerCase();
  if (ADMIN_EMAIL_PATTERNS.includes(normalized) || normalized.startsWith("admin")) {
    return "admin";
  }
  return "user";
}

// --- TEMP mocks: swap these for real fetch() calls to your backend ---
function mockCheckCredentials(email, password) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ success: password.length >= 4 });
    }, 900);
  });
}
function mockSendOtp(email) {
  return new Promise((resolve) => setTimeout(() => resolve({ success: true }), 700));
}
function mockVerifyOtp(email, otp) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ success: otp.join("") === "123456" || otp.every((d) => d !== "") });
    }, 900);
  });
}

export default function LoginForm({ onLoginSuccess }) {
  const [step, setStep] = useState(1); // 1 = credentials, 2 = otp
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  const [role, setRole] = useState(null);

  const otpRefs = useRef([]);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setInterval(() => setResendTimer((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [resendTimer]);

  const validateEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!validateEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < 4) {
      setError("Password must be at least 4 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await mockCheckCredentials(email, password);
      if (!res.success) {
        setError("Incorrect email or password.");
        setLoading(false);
        return;
      }
      const resolvedRole = resolveRole(email);
      setRole(resolvedRole);

      await mockSendOtp(email);
      setResendTimer(RESEND_SECONDS);
      setStep(2);
      setTimeout(() => otpRefs.current[0]?.focus(), 50);
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (!/^[0-9]?$/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    if (value && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    e.preventDefault();
    const next = Array(OTP_LENGTH).fill("");
    pasted.split("").forEach((ch, i) => (next[i] = ch));
    setOtp(next);
    otpRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (otp.some((d) => d === "")) {
      setError("Enter the complete 6-digit OTP.");
      return;
    }

    setLoading(true);
    try {
      const res = await mockVerifyOtp(email, otp);
      if (!res.success) {
        setError("Invalid OTP. Please try again.");
        setLoading(false);
        return;
      }
      onLoginSuccess?.(role, email);
    } catch (err) {
      setError("Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = useCallback(async () => {
    if (resendTimer > 0) return;
    setError("");
    setLoading(true);
    try {
      await mockSendOtp(email);
      setResendTimer(RESEND_SECONDS);
      setOtp(Array(OTP_LENGTH).fill(""));
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }, [email, resendTimer]);

  const goBack = () => {
    setStep(1);
    setOtp(Array(OTP_LENGTH).fill(""));
    setError("");
  };

  return (
    <div className="mis-login-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');

        .mis-login-root {
            --bg: #f4f6f9;
            --panel: #ffffff;
            --panel-border: #e3e8ef;
            --accent: #c9820a;
            --accent-soft: rgba(201,130,10,0.10);
            --steel: #3a6d95;
            --text: #1b2430;
            --muted: #64748b;
            --danger: #d1483c;
            --success: #0f9a90;

          min-height: 100vh;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background:
            radial-gradient(1200px 600px at 15% -10%, rgba(76,126,168,0.18), transparent 60%),
            radial-gradient(900px 500px at 110% 110%, rgba(232,163,61,0.10), transparent 60%),
            var(--bg);
          font-family: 'Inter', sans-serif;
          color: var(--text);
          padding: 24px;
        }

        .mis-shell {
          width: 100%;
          max-width: 420px;
          background: var(--panel);
          border: 1px solid var(--panel-border);
          border-radius: 14px;
          padding: 36px 32px 30px;
          position: relative;
          overflow: hidden;
        }

        .mis-shell::before {
          content: "";
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3px;
          background: linear-gradient(90deg, var(--steel), var(--accent));
        }

        .mis-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 28px;
        }

        .mis-badge {
          width: 42px;
          height: 42px;
          border-radius: 9px;
          background: var(--accent-soft);
          border: 1px solid rgba(232,163,61,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Chakra Petch', sans-serif;
          font-weight: 700;
          color: var(--accent);
          font-size: 15px;
          flex-shrink: 0;
        }

        .mis-title {
          font-family: 'Chakra Petch', sans-serif;
          font-size: 18px;
          font-weight: 600;
          letter-spacing: 0.3px;
        }

        .mis-subtitle {
          font-size: 12.5px;
          color: var(--muted);
          margin-top: 2px;
        }

        .mis-rail {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 26px;
        }

        .mis-rail-seg {
          height: 3px;
          flex: 1;
          border-radius: 2px;
          background: var(--panel-border);
          position: relative;
          overflow: hidden;
        }

        .mis-rail-seg.done {
          background: var(--steel);
        }

        .mis-rail-seg.active::after {
          content: "";
          position: absolute;
          inset: 0;
          background: var(--accent);
          animation: mis-fill 0.5s ease forwards;
        }

        @keyframes mis-fill {
          from { transform: scaleX(0); transform-origin: left; }
          to { transform: scaleX(1); transform-origin: left; }
        }

        .mis-rail-label {
          font-size: 10.5px;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.6px;
          white-space: nowrap;
        }

        .mis-field {
          margin-bottom: 16px;
        }

        .mis-label {
          display: block;
          font-size: 12px;
          color: var(--muted);
          margin-bottom: 6px;
          letter-spacing: 0.2px;
        }

        .mis-input-wrap {
          position: relative;
        }

        .mis-input {
          width: 100%;
          background: #ebeef3;
          border: 1px solid var(--panel-border);
          border-radius: 8px;
          padding: 11px 42px 11px 13px;
          color: var(--text);
          font-size: 14px;
          outline: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
          box-sizing: border-box;
        }

        .mis-input:focus {
          border-color: var(--steel);
          box-shadow: 0 0 0 3px rgba(76,126,168,0.15);
        }

        .mis-input-icon-btn {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: var(--muted);
          cursor: pointer;
          font-size: 12px;
          padding: 4px;
        }

        .mis-input-icon-btn:hover { color: var(--text); }

        .mis-role-hint {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: var(--steel);
          margin-top: 8px;
        }

        .mis-role-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--steel);
        }

        .mis-error {
          background: rgba(226,87,76,0.1);
          border: 1px solid rgba(226,87,76,0.3);
          color: #f2a49e;
          font-size: 12.5px;
          padding: 9px 12px;
          border-radius: 7px;
          margin-bottom: 16px;
        }

        .mis-btn {
          width: 100%;
          background: linear-gradient(90deg, var(--steel), #3a6d95);
          color: #fff;
          border: none;
          border-radius: 8px;
          padding: 12px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: opacity 0.15s ease, transform 0.1s ease;
        }

        .mis-btn:hover:not(:disabled) { opacity: 0.92; }
        .mis-btn:active:not(:disabled) { transform: scale(0.99); }
        .mis-btn:disabled { opacity: 0.55; cursor: not-allowed; }

        .mis-spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255,255,255,0.35);
          border-top-color: #fff;
          border-radius: 50%;
          animation: mis-spin 0.7s linear infinite;
        }

        @keyframes mis-spin {
          to { transform: rotate(360deg); }
        }

        .mis-otp-row {
          display: flex;
          gap: 9px;
          margin-bottom: 18px;
        }

        .mis-otp-box {
          width: 42px;
          height: 44px;
          flex: none;
          text-align: center;
          font-size: 16px;
          font-family: 'Chakra Petch', sans-serif;
          font-weight: 600;
          background: #e3e5e8;
          border: 1px solid var(--panel-border);
          border-radius: 8px;
          color: var(--text);
          outline: none;
          padding: 0;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .mis-otp-box:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px rgba(232,163,61,0.15);
        }

        .mis-otp-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 18px;
          font-size: 12px;
        }

        .mis-otp-email {
          color: var(--muted);
        }

        .mis-otp-email b { color: var(--text); font-weight: 500; }

        .mis-resend {
          background: none;
          border: none;
          color: var(--accent);
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          padding: 0;
        }

        .mis-resend:disabled {
          color: var(--muted);
          cursor: not-allowed;
        }

        .mis-back {
          background: none;
          border: none;
          color: var(--muted);
          font-size: 12.5px;
          cursor: pointer;
          margin-top: 18px;
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 0;
        }

        .mis-back:hover { color: var(--text); }

        .mis-footer {
          text-align: center;
          margin-top: 22px;
          font-size: 11px;
          color: var(--muted);
          letter-spacing: 0.3px;
        }
      `}</style>

      <div className="mis-shell">
        <div className="mis-header">
          <div className="mis-badge">MIS</div>
          <div>
            <div className="mis-title">MIS Access Portal</div>
            <div className="mis-subtitle">
              {step === 1 ? "Sign in to continue" : "Verify your identity"}
            </div>
          </div>
        </div>

        <div className="mis-rail">
          <div className={`mis-rail-seg ${step >= 1 ? "done" : ""} ${step === 1 ? "active" : ""}`} />
          <span className="mis-rail-label">Credentials</span>
          <div className={`mis-rail-seg ${step === 2 ? "active" : ""}`} />
          <span className="mis-rail-label">OTP</span>
        </div>

        {error && <div className="mis-error">{error}</div>}

        {step === 1 && (
          <form onSubmit={handleCredentialsSubmit} noValidate>
            <div className="mis-field">
              <label className="mis-label" htmlFor="mis-email">Email address</label>
              <div className="mis-input-wrap">
                <input
                  id="mis-email"
                  type="email"
                  className="mis-input"
                  placeholder="you@pgel.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
              {email && validateEmail(email) && (
                <div className="mis-role-hint">
                  <span className="mis-role-dot" />
                  Detected role: {resolveRole(email) === "admin" ? "Admin Workspace" : "User Workspace"}
                </div>
              )}
            </div>

            <div className="mis-field">
              <label className="mis-label" htmlFor="mis-password">Password</label>
              <div className="mis-input-wrap">
                <input
                  id="mis-password"
                  type={showPassword ? "text" : "password"}
                  className="mis-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="mis-input-icon-btn"
                  onClick={() => setShowPassword((s) => !s)}
                  tabIndex={-1}
                >
                  {showPassword ? "HIDE" : "SHOW"}
                </button>
              </div>
            </div>

            <button type="submit" className="mis-btn" disabled={loading}>
              {loading ? (
                <>
                  <span className="mis-spinner" /> Verifying
                </>
              ) : (
                "Continue"
              )}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleOtpSubmit}>
            <div className="mis-otp-meta">
              <span className="mis-otp-email">
                Code sent to <b>{email}</b>
              </span>
            </div>

            <div className="mis-otp-row" onPaste={handleOtpPaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => (otpRefs.current[i] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  className="mis-otp-box"
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                />
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
              <button
                type="button"
                className="mis-resend"
                disabled={resendTimer > 0}
                onClick={handleResend}
              >
                {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : "Resend OTP"}
              </button>
            </div>

            <button type="submit" className="mis-btn" disabled={loading}>
              {loading ? (
                <>
                  <span className="mis-spinner" /> Verifying
                </>
              ) : (
                "Verify & Sign In"
              )}
            </button>

            <button type="button" className="mis-back" onClick={goBack}>
              &larr; Back to credentials
            </button>
          </form>
        )}

        <div className="mis-footer">SECURE MIS ACCESS · TWO-STEP VERIFICATION</div>
      </div>
    </div>
  );
}