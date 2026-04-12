import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { login } from "../lib/auth";

export default function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const justRegistered = params.get("registered") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!email.trim()) { setError("Please enter your email."); return; }
    if (!password) { setError("Please enter your password."); return; }

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (!result.ok) { setError(result.error || "Login failed."); return; }
    navigate("/app");
  }

  return (
    <div className="auth-bg">
      <div className="auth-card">
        {/* Brand */}
        <div className="auth-brand">
          <div className="auth-brand-logo">B</div>
          <div>
            <div className="auth-brand-name">BotStudioX</div>
            <div className="auth-brand-sub">by The Bot Company</div>
          </div>
        </div>

        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">
          {justRegistered
            ? "🎉 Account created! Sign in to get started."
            : "Sign in to your account to continue."}
        </p>

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="auth-field">
            <label htmlFor="login-email">Email address</label>
            <input
              id="login-email"
              type="email"
              className="auth-input"
              placeholder="jane@yourcompany.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="auth-field">
            <label htmlFor="login-pass">Password</label>
            <div className="auth-input-wrap">
              <input
                id="login-pass"
                type={showPass ? "text" : "password"}
                className="auth-input"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button type="button" className="auth-eye" onClick={() => setShowPass((v) => !v)} tabIndex={-1}>
                {showPass ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? "Signing in…" : "Sign In →"}
          </button>
        </form>

        <div className="auth-footer">
          Don't have an account?{" "}
          <Link to="/register" className="auth-link">Create one</Link>
        </div>
      </div>
    </div>
  );
}
