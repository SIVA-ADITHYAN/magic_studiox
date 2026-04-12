import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../lib/auth";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) { setError("Please enter your full name."); return; }
    if (!email.trim()) { setError("Please enter your email."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }

    setLoading(true);
    const result = await register(name, email, password);
    setLoading(false);
    if (!result.ok) { setError(result.error || "Registration failed."); return; }
    navigate("/login?registered=1");
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

        <h1 className="auth-title">Create your account</h1>
        <p className="auth-subtitle">
          Start generating studio-quality product scenes with AI.
        </p>

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="auth-field">
            <label htmlFor="reg-name">Full name</label>
            <input
              id="reg-name"
              type="text"
              className="auth-input"
              placeholder="Jane Smith"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              autoFocus
            />
          </div>

          <div className="auth-field">
            <label htmlFor="reg-email">Email address</label>
            <input
              id="reg-email"
              type="email"
              className="auth-input"
              placeholder="jane@yourcompany.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div className="auth-field">
            <label htmlFor="reg-pass">Password</label>
            <div className="auth-input-wrap">
              <input
                id="reg-pass"
                type={showPass ? "text" : "password"}
                className="auth-input"
                placeholder="Min. 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
              <button type="button" className="auth-eye" onClick={() => setShowPass((v) => !v)} tabIndex={-1}>
                {showPass ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="reg-confirm">Confirm password</label>
            <input
              id="reg-confirm"
              type={showPass ? "text" : "password"}
              className="auth-input"
              placeholder="Re-enter password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? "Creating account…" : "Create Account →"}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account?{" "}
          <Link to="/login" className="auth-link">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
