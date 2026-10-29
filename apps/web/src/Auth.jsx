import { useEffect, useRef, useState } from "react";
import api from "./lib/api";
import "./Auth.css";

const searchParams = new URLSearchParams(window.location.search);
const initialResetToken = searchParams.get("token");
const initialVerifyToken = searchParams.get("verify");

const STAFF_ROLES = ["REVIEWER", "ADMIN"];

function cleanUrl() {
  window.history.replaceState({}, document.title, window.location.pathname);
}

export default function Auth({ onAuthenticated }) {
  const [mode, setMode] = useState(
    initialVerifyToken
      ? "verifying"
      : initialResetToken
        ? "reset-password"
        : "login"
  );

  // Which dashboard the person wants: "candidate" or "reviewer".
  const [accountType, setAccountType] = useState("candidate");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [reviewerCode, setReviewerCode] = useState("");
  const [reviewerTracks, setReviewerTracks] = useState([]);
  const [resetToken, setResetToken] = useState(initialResetToken || "");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [needsVerification, setNeedsVerification] = useState(false);

  const verifyStarted = useRef(false);

  const isRegister = mode === "register";
  const isLogin = mode === "login";
  const isVerifyEmail = mode === "verify-email"; // "check your inbox" screen
  const isVerifying = mode === "verifying"; // link was opened, verifying now
  const isForgotPassword = mode === "forgot-password";
  const isResetPassword = mode === "reset-password";

  const showRolePicker = isLogin || isRegister;
  const registeringReviewer = isRegister && accountType === "reviewer";

  // When the user opens the link from their email (?verify=TOKEN),
  // verify automatically. The ref stops React from running it twice.
  useEffect(() => {
    if (!initialVerifyToken || verifyStarted.current) return;
    verifyStarted.current = true;

    async function verifyFromLink() {
      try {
        const response = await api.post("/api/v1/auth/verify-email", {
          token: initialVerifyToken,
        });

        const result = response.data?.data ?? response.data;

        cleanUrl();
        setMode("login");
        setSuccess(
          result?.message ||
            response.data?.message ||
            "Your email is verified. You can now sign in."
        );
      } catch (err) {
        cleanUrl();
        setMode("login");
        setNeedsVerification(true);
        setError(
          err.response?.data?.message ||
            "This verification link is invalid or has expired. Enter your email and request a new link."
        );
      }
    }

    verifyFromLink();
  }, []);

  function switchMode(nextMode) {
    setMode(nextMode);
    setError("");
    setSuccess("");
    setNeedsVerification(false);
    setPassword("");
    setConfirmPassword("");
    setReviewerCode("");
    setReviewerTracks([]);
  }

  function chooseAccountType(next) {
    setAccountType(next);
    setError("");
    setSuccess("");
    setNeedsVerification(false);
    if (next === "candidate") {
      setReviewerCode("");
      setReviewerTracks([]);
    }
  }

  function toggleTrack(track) {
    setReviewerTracks((current) =>
      current.includes(track)
        ? current.filter((item) => item !== track)
        : [...current, track]
    );
  }

  async function resendLink() {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError("Enter your Gmail address first, then request a new link.");
      return;
    }

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await api.post("/api/v1/auth/resend-verification", {
        email: normalizedEmail,
      });

      setEmail(normalizedEmail);
      setNeedsVerification(false);
      setMode("verify-email");
      setSuccess(
        response.data?.message ||
          "A new verification link has been sent to your email."
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "We couldn't send the link. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setNeedsVerification(false);

    if ((isRegister || isResetPassword) && password !== confirmPassword) {
      setError("Your passwords do not match.");
      return;
    }

    if (isResetPassword && password.length < 8) {
      setError("Your new password must contain at least 8 characters.");
      return;
    }

    if (registeringReviewer && !reviewerCode.trim()) {
      setError("Enter the reviewer access code you were given.");
      return;
    }

    if (registeringReviewer && reviewerTracks.length === 0) {
      setError("Choose at least one track you can review.");
      return;
    }

    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      if (isRegister) {
        const payload = { email: normalizedEmail, password };

        if (registeringReviewer) {
          payload.role = "REVIEWER";
          payload.reviewerCode = reviewerCode.trim();
          payload.reviewerTracks = reviewerTracks;
        }

        const response = await api.post("/api/v1/auth/register", payload);

        const result = response.data?.data ?? response.data;

        setEmail(normalizedEmail);
        setPassword("");
        setConfirmPassword("");
        setReviewerCode("");
        setReviewerTracks([]);

        if (result?.emailVerified) {
          setMode("login");
          setSuccess("Your account is ready. You can now sign in.");
        } else {
          setMode("verify-email");
        }

        return;
      }

      if (isForgotPassword) {
        const response = await api.post("/api/v1/auth/forgot-password", {
          email: normalizedEmail,
        });

        setSuccess(
          response.data?.message ||
            "If an account exists for this email, password reset instructions have been sent."
        );

        return;
      }

      if (isResetPassword) {
        if (!resetToken) {
          throw new Error(
            "The password reset token is missing. Please open the reset link from your email again."
          );
        }

        const response = await api.post("/api/v1/auth/reset-password", {
          token: resetToken,
          newPassword: password,
        });

        setPassword("");
        setConfirmPassword("");
        setResetToken("");
        cleanUrl();

        setMode("login");
        setSuccess(
          response.data?.message ||
            "Your password has been reset. You can now sign in with your new password."
        );

        return;
      }

      // Login
      const response = await api.post("/api/v1/auth/login", {
        email: normalizedEmail,
        password,
      });

      const result = response.data?.data ?? response.data;

      if (!result.token) {
        throw new Error(
          "Login succeeded, but the server did not return an authentication token."
        );
      }

      // Only accounts the server marked as reviewers can use the reviewer side.
      const isStaff = STAFF_ROLES.includes(result.user?.role);

      if (accountType === "reviewer" && !isStaff) {
        throw new Error(
          "This account doesn't have reviewer access. Choose Candidate to sign in, or create a reviewer account with an access code."
        );
      }

      localStorage.setItem("token", result.token);

      if (result.user) {
        localStorage.setItem("user", JSON.stringify(result.user));
      }

      if (onAuthenticated) {
        onAuthenticated(result, accountType);
      } else {
        window.location.reload();
      }
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.message ||
        "Something went wrong. Please try again.";

      // The API answers 403 when the email hasn't been verified yet.
      if (
        isLogin &&
        err.response?.status === 403 &&
        /verify/i.test(message)
      ) {
        setNeedsVerification(true);
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function renderHeading() {
    if (isRegister) {
      return registeringReviewer
        ? {
            eyebrow: "REVIEWER ACCESS",
            title: "Create a reviewer account",
            description:
              "Review candidates' evidence and record your decisions. You need an access code from the Proovix team.",
          }
        : {
            eyebrow: "GET STARTED",
            title: "Create your account",
            description: "Start building a profile that shows what you can do.",
          };
    }

    if (isVerifyEmail) {
      return {
        eyebrow: "ONE LAST STEP",
        title: "Check your email",
        description: `We sent a verification link to ${
          email || "your email address"
        }. Open it to activate your account.`,
      };
    }

    if (isVerifying) {
      return {
        eyebrow: "EMAIL VERIFICATION",
        title: "Verifying your email",
        description: "Please wait a moment while we confirm your account.",
      };
    }

    if (isForgotPassword) {
      return {
        eyebrow: "ACCOUNT RECOVERY",
        title: "Forgot your password?",
        description:
          "Enter your registered email address to receive password reset instructions.",
      };
    }

    if (isResetPassword) {
      return {
        eyebrow: "SECURE YOUR ACCOUNT",
        title: "Set a new password",
        description: "Choose a strong new password for your Proovix account.",
      };
    }

    return {
      eyebrow: "WELCOME BACK",
      title: "Sign in to Proovix",
      description:
        accountType === "reviewer"
          ? "Open the review desk to check submitted evidence."
          : "Continue building your evidence-backed profile.",
    };
  }

  const heading = renderHeading();
  const showForm = !isVerifyEmail && !isVerifying;

  return (
    <main className="auth-page">
      <section className="auth-brand-panel">
        <a className="auth-brand" href="/" aria-label="Proovix home">
          <span className="auth-brand-mark">P</span>
          <span>proovix</span>
        </a>

        <div className="auth-brand-content">
          <span className="auth-eyebrow">PROOF OVER PROMISES</span>
          <h1>Let your work speak for itself.</h1>
          <p>
            Build a professional skills profile backed by projects,
            evidence, and verifiable experience.
          </p>
        </div>

        <div className="auth-brand-footer">
          Evidence-backed skills. Built around your work.
        </div>
      </section>

      <section className="auth-form-panel">
        <div className="auth-form-container">
          <div className="auth-mobile-brand">
            <span className="auth-brand-mark">P</span>
            <span>proovix</span>
          </div>

          <div className="auth-heading">
            <span className="auth-eyebrow">{heading.eyebrow}</span>
            <h2>{heading.title}</h2>
            <p>{heading.description}</p>
          </div>

          {error && (
            <div className="auth-message auth-error" role="alert">
              {error}
            </div>
          )}

          {success && (
            <div className="auth-message auth-success" role="status">
              {success}
            </div>
          )}

          {needsVerification && isLogin && (
            <div style={{ margin: "-8px 0 20px" }}>
              <button
                type="button"
                className="auth-text-button"
                onClick={resendLink}
                disabled={loading}
              >
                {loading ? "Sending..." : "Resend verification link"}
              </button>
            </div>
          )}

          {isVerifyEmail && (
            <>
              <div className="auth-message auth-success" role="status">
                Can't find it? Check your spam folder. The link works once and
                is valid for 24 hours.
              </div>

              <button
                type="button"
                className="auth-submit"
                onClick={() => switchMode("login")}
              >
                Back to sign in
              </button>

              <p className="auth-switch">
                Didn't get the email?{" "}
                <button
                  type="button"
                  onClick={resendLink}
                  disabled={loading}
                >
                  {loading ? "Sending..." : "Resend link"}
                </button>
              </p>
            </>
          )}

          {isVerifying && (
            <div className="auth-message auth-success" role="status">
              Verifying…
            </div>
          )}

          {showRolePicker && (
            <div className="auth-role" role="group" aria-label="Account type">
              <span className="auth-role-label">
                {isRegister ? "I want to join as" : "Sign in as"}
              </span>
              <div className="auth-role-options">
                {[
                  ["candidate", "Candidate", "Prove my skills"],
                  ["reviewer", "Reviewer", "Check evidence"],
                ].map(([value, label, hint]) => (
                  <button
                    key={value}
                    type="button"
                    className={`auth-role-option ${
                      accountType === value ? "active" : ""
                    }`}
                    aria-pressed={accountType === value}
                    onClick={() => chooseAccountType(value)}
                  >
                    <strong>{label}</strong>
                    <small>{hint}</small>
                  </button>
                ))}
              </div>
            </div>
          )}

          {showRolePicker && (
            <div
              className="auth-tabs"
              role="tablist"
              aria-label="Authentication"
            >
              <button
                type="button"
                role="tab"
                aria-selected={!isRegister}
                className={!isRegister ? "active" : ""}
                onClick={() => switchMode("login")}
              >
                Sign in
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={isRegister}
                className={isRegister ? "active" : ""}
                onClick={() => switchMode("register")}
              >
                Create account
              </button>
            </div>
          )}

          {showForm && (
            <form className="auth-form" onSubmit={handleSubmit}>
              {(isLogin || isRegister || isForgotPassword) && (
                <div className="auth-field">
                  <label htmlFor="auth-email">Gmail address</label>
                  <input
                    id="auth-email"
                    type="email"
                    placeholder="you@gmail.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
              )}

              {(isLogin || isRegister || isResetPassword) && (
                <div className="auth-field">
                  <label htmlFor="auth-password">
                    {isResetPassword ? "New password" : "Password"}
                  </label>
                  <input
                    id="auth-password"
                    type="password"
                    placeholder={
                      isResetPassword
                        ? "Create a new password"
                        : isRegister
                          ? "Create a strong password"
                          : "Enter your password"
                    }
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete={isLogin ? "current-password" : "new-password"}
                    minLength={isRegister || isResetPassword ? 8 : undefined}
                    required
                  />
                </div>
              )}

              {(isRegister || isResetPassword) && (
                <div className="auth-field">
                  <label htmlFor="auth-confirm-password">
                    Confirm password
                  </label>
                  <input
                    id="auth-confirm-password"
                    type="password"
                    placeholder="Enter your password again"
                    value={confirmPassword}
                    onChange={(event) =>
                      setConfirmPassword(event.target.value)
                    }
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                </div>
              )}

              {registeringReviewer && (
                <div className="auth-field">
                  <label htmlFor="auth-reviewer-code">
                    Reviewer access code
                  </label>
                  <input
                    id="auth-reviewer-code"
                    type="password"
                    placeholder="Enter the code you were given"
                    value={reviewerCode}
                    onChange={(event) => setReviewerCode(event.target.value)}
                    autoComplete="off"
                    required
                  />
                  <small>
                    Reviewer accounts decide whether evidence is approved, so
                    they need a code from the Proovix team.
                  </small>
                </div>
              )}

              {registeringReviewer && (
                <div className="auth-field">
                  <label>Tracks you can review</label>
                  <div className="auth-role-options">
                    {[
                      ["FRONTEND", "Frontend"],
                      ["BACKEND", "Backend"],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        className={`auth-role-option ${
                          reviewerTracks.includes(value) ? "active" : ""
                        }`}
                        aria-pressed={reviewerTracks.includes(value)}
                        onClick={() => toggleTrack(value)}
                      >
                        <strong>{label}</strong>
                      </button>
                    ))}
                  </div>
                  <small>
                    You will only be sent evidence from the tracks you choose.
                  </small>
                </div>
              )}

              {isLogin && (
                <div className="auth-forgot-row">
                  <button
                    type="button"
                    className="auth-text-button"
                    onClick={() => switchMode("forgot-password")}
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              <button
                className="auth-submit"
                type="submit"
                disabled={loading}
              >
                {loading
                  ? "Please wait..."
                  : isRegister
                    ? registeringReviewer
                      ? "Create reviewer account"
                      : "Create account"
                    : isForgotPassword
                      ? "Send reset instructions"
                      : isResetPassword
                        ? "Reset password"
                        : accountType === "reviewer"
                          ? "Sign in to review desk"
                          : "Sign in"}

                {!loading && <span aria-hidden="true">→</span>}
              </button>
            </form>
          )}

          {isForgotPassword && (
            <p className="auth-switch">
              Remembered your password?{" "}
              <button type="button" onClick={() => switchMode("login")}>
                Back to sign in
              </button>
            </p>
          )}

          {isResetPassword && (
            <p className="auth-switch">
              Remembered your password?{" "}
              <button
                type="button"
                onClick={() => {
                  setResetToken("");
                  cleanUrl();
                  switchMode("login");
                }}
              >
                Back to sign in
              </button>
            </p>
          )}

          {showRolePicker && (
            <p className="auth-switch">
              {isRegister ? "Already have an account?" : "New to Proovix?"}{" "}
              <button
                type="button"
                onClick={() => switchMode(isRegister ? "login" : "register")}
              >
                {isRegister ? "Sign in" : "Create an account"}
              </button>
            </p>
          )}

          <p className="auth-legal">
            By continuing, you agree to use Proovix responsibly and provide
            accurate information about your skills and experience.
          </p>
        </div>
      </section>
    </main>
  );
}