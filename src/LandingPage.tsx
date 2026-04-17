import { Link } from "react-router-dom";

const APP = "/register";
const BASE = import.meta.env.BASE_URL;

export default function LandingPage() {
  return (
    <>
      {/* ── Nav ── */}
      <nav className="lp-nav">
        <a href="https://thebotcompany.in" target="_blank" rel="noreferrer" className="lp-nav-brand">
          <div className="lp-nav-logo"><img src={`${BASE}logo.png`} alt="BotStudioX" /></div>
          <span className="lp-nav-name">The Bot Company</span>
        </a>
        <div className="lp-nav-links">
          <a href="#features" className="lp-nav-link">Features</a>
          <a href="#how-it-works" className="lp-nav-link">How it works</a>
          <a href="#product" className="lp-nav-link">Product</a>
          <Link to="/login" className="lp-nav-link">Sign In</Link>
          <Link to={APP} className="lp-nav-cta">Get Started →</Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="lp-hero">
        <div>
          <div className="lp-hero-badge">
            <span>✨</span> AI-Powered Fashion Imaging
          </div>
          <h1>
            Generate Studio-Quality<br />
            <em>Product Scenes</em><br />
            with AI
          </h1>
          <p className="lp-hero-sub">
            BotStudioX turns your garment photos into
            photorealistic e-commerce scenes — complete with models, backgrounds, and
            multi-angle views. No studio. No photographer. Just results.
          </p>
          <div className="lp-hero-actions">
            <Link to={APP} className="lp-btn-primary">
              Get Started →
            </Link>
            <a href="#how-it-works" className="lp-btn-secondary">
              See how it works
            </a>
          </div>
        </div>

        <div className="lp-hero-visual">
          <div className="lp-floating-badge top-right">
            🤖 Powered by Gemini AI
          </div>
          <div className="lp-hero-card">
            <div className="lp-hero-card-title">
              <span style={{ background: "#EF4444" }} />
              <span style={{ background: "#FBBF24" }} />
              <span style={{ background: "#34D399" }} />
              BotStudioX — Scene Generator
            </div>

            <div className="lp-process-flow">
              {/* Input garment */}
              <div className="lp-process-input-wrap">
                <div className="lp-process-chip lp-chip-in">📥 Input</div>
                <div className="lp-process-img-single">
                  <img src={`${BASE}garment-templates/S1.png`} alt="Garment flat-lay" />
                </div>
                <div className="lp-process-sublabel">Garment photo</div>
              </div>

              {/* AI divider */}
              <div className="lp-process-divider">
                <div className="lp-process-ai-pill">✨ AI</div>
                <div className="lp-process-arrow-line" />
              </div>

              {/* Output angles */}
              <div className="lp-process-output-wrap">
                <div className="lp-process-chip lp-chip-out">✅ Generated</div>
                <div className="lp-scene-grid">
                  <div className="lp-scene-slot">
                    <img src={`${BASE}garment-templates/S1.png`} alt="Front view" />
                    <span className="lp-scene-angle">Front</span>
                  </div>
                  <div className="lp-scene-slot">
                    <img src={`${BASE}garment-templates/S2.png`} alt="Side view" />
                    <span className="lp-scene-angle">Side</span>
                  </div>
                  <div className="lp-scene-slot">
                    <img src={`${BASE}garment-templates/S3.png`} alt="Back view" />
                    <span className="lp-scene-angle">Back</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="lp-progress-bar">
              <div className="lp-progress-fill lp-progress-done" />
            </div>
            <div className="lp-progress-label">✅ 3 scenes ready in 24s</div>
          </div>
          <div className="lp-floating-badge bottom-left">
            ⚡ 3 angles in &lt; 30s
          </div>
        </div>
      </section>

      {/* ── Trust bar ── */}
      <div className="lp-trust">
        <div className="lp-trust-label">Built on enterprise-grade AI</div>
        <div className="lp-trust-pills">
          {["Google Gemini", "Photorealistic Output", "Multi-Angle Generation", "Print Application", "Storyboard Library", "IndexedDB Storage"].map((t) => (
            <div key={t} className="lp-trust-pill">{t}</div>
          ))}
        </div>
      </div>

      {/* ── Features ── */}
      <section className="lp-section" id="features">
        <div className="lp-section-label">✦ Features</div>
        <h2 className="lp-section-title">
          Everything you need for<br />professional product photography
        </h2>
        <p className="lp-section-sub">
          From garment upload to finished scene — our AI handles the entire creative process
          so your team can focus on what matters.
        </p>
        <div className="lp-features-grid">
          {[
            {
              icon: "🖼️",
              color: "#EDE9FE",
              title: "AI Scene Generation",
              desc: "Upload a garment photo and instantly receive photorealistic product scenes with professional lighting and composition.",
            },
            {
              icon: "🧍",
              color: "#FDF2F8",
              title: "Model References",
              desc: "Provide a reference image to control model appearance, pose style, and body type for consistent brand visuals.",
            },
            {
              icon: "🏞️",
              color: "#FFF7ED",
              title: "Background Control",
              desc: "Supply your own background or let the AI choose — from studio whites to editorial outdoor settings.",
            },
            {
              icon: "🔄",
              color: "#F0FDF4",
              title: "Multi-Angle Shots",
              desc: "Automatically generate front, side, and back views in a single run. Full 360° product coverage, no extra shoots.",
              comingSoon: true,
            },
            {
              icon: "🎨",
              color: "#FEF3C7",
              title: "Print Application",
              desc: "Apply graphic designs and print patterns directly onto garments and see how they look on a finished product.",
            },
            {
              icon: "📚",
              color: "#ECFDF5",
              title: "Storyboard Library",
              desc: "Organise every shoot into named storyboards. Save, reload, and compare configurations across your entire catalogue.",
            },
          ].map((f) => (
            <div className={`lp-feature-card${f.comingSoon ? " lp-feature-card-soon" : ""}`} key={f.title}>
              {f.comingSoon && <div className="lp-coming-soon-badge">Coming Soon</div>}
              <div className="lp-feature-icon" style={{ background: f.color }}>
                {f.icon}
              </div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="lp-section" id="how-it-works" style={{ paddingTop: 0 }}>
        <div className="lp-section-label">✦ Process</div>
        <h2 className="lp-section-title">From garment to gallery in five steps</h2>
        <p className="lp-section-sub">
          No creative briefs, no scheduling, no post-production. Just upload and generate.
        </p>
        <div className="lp-steps lp-steps-5">
          {[
            {
              num: "1",
              icon: "📸",
              color: "#EDE9FE",
              title: "Upload Garment",
              desc: "Drop in a flat-lay or product photo as your base canvas.",
            },
            {
              num: "2",
              icon: "🧍",
              color: "#FDF2F8",
              title: "Add References",
              desc: "Attach model and background references for full creative control.",
            },
            {
              num: "3",
              icon: "⚙️",
              color: "#FFF7ED",
              title: "Configure Scene",
              desc: "Pick occasion, style, pose, footwear — or let AI choose smart defaults.",
            },
            {
              num: "4",
              icon: "🤖",
              color: "#F0FDF4",
              title: "AI Generates",
              desc: "Gemini AI renders photorealistic front, side, and back views in under 30s.",
            },
            {
              num: "5",
              icon: "⬇️",
              color: "#FEF3C7",
              title: "Export & Save",
              desc: "Download production-ready images or save them to your storyboard library.",
            },
          ].map((s) => (
            <div className="lp-step" key={s.num}>
              <div className="lp-step-num" style={{ background: s.color }}>
                <span className="lp-step-icon">{s.icon}</span>
                <span className="lp-step-badge">{s.num}</span>
              </div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Product showcase ── */}
      <section className="lp-showcase" id="product">
        <div className="lp-showcase-inner">
          <div>
            <div className="lp-section-label">✦ Product</div>
            <h2 className="lp-section-title">
              A full AI studio<br />in your browser
            </h2>
            <p className="lp-section-sub" style={{ marginBottom: 0 }}>
              BotStudioX is built for e-commerce teams who need high-volume,
              high-quality imagery without the overhead of a traditional studio.
            </p>
            <div className="lp-showcase-features">
              {[
                { icon: "⚡", color: "#FEF3C7", title: "Instant generation", desc: "Front + side + back views in under 30 seconds" },
                { icon: "🔒", color: "#EDE9FE", title: "Private by design", desc: "Images stored locally in your browser — never on our servers" },
                { icon: "♾️", color: "#F0FDF4", title: "Unlimited storyboards", desc: "Organise every product into named campaigns and collections" },
                { icon: "🖨️", color: "#FDF2F8", title: "Print-ready output", desc: "Apply designs to garments and export production-ready images" },
              ].map((item) => (
                <div className="lp-showcase-item" key={item.title}>
                  <div className="lp-showcase-item-icon" style={{ background: item.color }}>{item.icon}</div>
                  <div className="lp-showcase-item-text">
                    <strong>{item.title}</strong>
                    <span>{item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lp-showcase-visual">
            <div className="lp-dashboard-mock">
              <div className="lp-dashboard-bar">
                <div className="lp-dashboard-bar-dot" />
                <div className="lp-dashboard-bar-dot" />
                <div className="lp-dashboard-bar-dot active" />
                <span style={{ color: "#fff", fontSize: 13, fontWeight: 700, marginLeft: 8 }}>
                  Storyboard Library
                </span>
              </div>
              <div className="lp-dashboard-body">
                {[
                  { bg: "#EDE9FE", emoji: "👗" },
                  { bg: "#FDF2F8", emoji: "🧥" },
                  { bg: "#FFF7ED", emoji: "👔" },
                  { bg: "#F0FDF4", emoji: "👠" },
                ].map((t, i) => (
                  <div key={i} className="lp-dashboard-thumb" style={{ background: t.bg }}>{t.emoji}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="lp-cta">
        <div className="lp-cta-inner">
          <h2>Ready to transform your product imagery?</h2>
          <p>
            Start generating photorealistic e-commerce scenes today —
            no credit card, no setup, no studio required.
          </p>
          <Link to={APP} className="lp-btn-white">
            Get Started for Free →
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-top">
            <div>
              <div className="lp-footer-brand-name">
                <div className="lp-footer-logo"><img src={`${BASE}logo.png`} alt="BotStudioX" /></div>
                The Bot Company
              </div>
              <p className="lp-footer-tagline">
                Enterprise AI solutions & bot development.<br />
                Building the future of intelligent automation.
              </p>
              <div className="lp-footer-social">
                <a href="https://thebotcompany.in" target="_blank" rel="noreferrer" title="Website">🌐</a>
                <a href="https://linkedin.com" target="_blank" rel="noreferrer" title="LinkedIn">💼</a>
                <a href="https://twitter.com" target="_blank" rel="noreferrer" title="Twitter">🐦</a>
              </div>
            </div>

            <div className="lp-footer-col">
              <h4>Product</h4>
              <ul>
                <li><a href="#features">Features</a></li>
                <li><a href="#how-it-works">How it works</a></li>
                <li><Link to="/login">Sign In</Link></li>
              </ul>
            </div>

            <div className="lp-footer-col">
              <h4>Company</h4>
              <ul>
                <li><a href="https://thebotcompany.in" target="_blank" rel="noreferrer">About</a></li>
                <li><a href="https://thebotcompany.in" target="_blank" rel="noreferrer">Services</a></li>
                <li><a href="https://thebotcompany.in" target="_blank" rel="noreferrer">Contact</a></li>
              </ul>
            </div>

            <div className="lp-footer-col">
              <h4>AI Tools</h4>
              <ul>
                <li><Link to={APP}>Get Started</Link></li>
                <li><Link to={APP}>Get Started</Link></li>
                <li><Link to={APP}>Get Started</Link></li>
              </ul>
            </div>
          </div>

          <div className="lp-footer-bottom">
            <span>© 2025 The Bot Company. All rights reserved.</span>
            <span>
              Built with ❤️ by{" "}
              <a href="https://thebotcompany.in" target="_blank" rel="noreferrer">
                thebotcompany.in
              </a>
            </span>
          </div>
        </div>
      </footer>
    </>
  );
}
