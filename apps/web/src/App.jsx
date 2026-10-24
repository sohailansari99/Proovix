import { useCallback, useEffect, useState } from "react";
import api from "./lib/api";
import { getMessage } from "./lib/helpers";
import Auth from "./Auth";
import Skills from "./pages/Skills";
import Evidence from "./pages/Evidence";
import { Icon } from "./components/ui";
import "./App.css";

const EMPTY_PROFILE = {
  fullName: "",
  username: "",
  headline: "",
  bio: "",
  location: "",
  githubUrl: "",
  linkedinUrl: "",
  portfolioUrl: "",
};

const EMPTY_STATS = { skills: null, evidence: null };

const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: "grid" },
  { id: "profile", label: "My profile", icon: "user" },
  { id: "skills", label: "Skills", icon: "target" },
  { id: "evidence", label: "Evidence", icon: "file" },
];

function readUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

function countVerified(list) {
  return list.filter((item) => item.verificationStatus === "VERIFIED").length;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() =>
    Boolean(localStorage.getItem("token"))
  );

  const [page, setPage] = useState("overview");
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [profileExists, setProfileExists] = useState(false);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const handleLogout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setIsAuthenticated(false);
    setProfile(EMPTY_PROFILE);
    setProfileExists(false);
    setStats(EMPTY_STATS);
    setPage("overview");
    setError("");
    setNotice("");
  }, []);

  const navigate = useCallback((id) => {
    setPage(id);
    setError("");
    setNotice("");
    window.scrollTo({ top: 0 });
  }, []);

  // Load the candidate profile only after authentication.
  useEffect(() => {
    let active = true;

    async function loadProfile() {
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const response = await api.get("/api/v1/candidates/me");
        const data = response.data?.data;

        if (!active) return;

        if (data) {
          setProfile({ ...EMPTY_PROFILE, ...data });
          setProfileExists(true);
        } else {
          setProfile(EMPTY_PROFILE);
          setProfileExists(false);
        }
      } catch (err) {
        if (!active) return;

        if (err.response?.status === 404) {
          setProfile(EMPTY_PROFILE);
          setProfileExists(false);
        } else if (err.response?.status === 401) {
          handleLogout();
        } else {
          setError(getMessage(err));
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, [isAuthenticated, handleLogout]);

  // Real skill and evidence counts for the overview.
  useEffect(() => {
    if (!isAuthenticated || !profileExists || page !== "overview") return;

    let active = true;

    async function loadStats() {
      const [skillsRes, evidenceRes] = await Promise.allSettled([
        api.get("/api/v1/candidates/me/skills"),
        api.get("/api/v1/candidates/me/evidence"),
      ]);

      if (!active) return;

      const read = (result) =>
        result.status === "fulfilled" ? result.value.data?.data || [] : null;

      const skills = read(skillsRes);
      const evidence = read(evidenceRes);

      setStats({
        skills: skills && { total: skills.length, verified: countVerified(skills) },
        evidence: evidence && {
          total: evidence.length,
          verified: countVerified(evidence),
        },
      });
    }

    loadStats();

    return () => {
      active = false;
    };
  }, [isAuthenticated, profileExists, page]);

  function handleAuthenticated() {
    setError("");
    setNotice("");
    setPage("overview");
    setIsAuthenticated(true);
  }

  function updateField(event) {
    const { name, value } = event.target;
    setProfile((current) => ({ ...current, [name]: value }));
  }

  async function saveProfile(event) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setNotice("");

    const payload = {
      fullName: profile.fullName.trim(),
      username: profile.username.trim().toLowerCase(),
      headline: profile.headline.trim(),
      bio: profile.bio.trim(),
      location: profile.location.trim(),
      githubUrl: profile.githubUrl.trim(),
      linkedinUrl: profile.linkedinUrl.trim(),
      portfolioUrl: profile.portfolioUrl.trim(),
    };

    try {
      const response = profileExists
        ? await api.patch("/api/v1/candidates/me", payload)
        : await api.post("/api/v1/candidates", {
            fullName: payload.fullName,
            username: payload.username,
          });

      const saved = response.data?.data;

      if (saved) {
        setProfile((current) => ({ ...current, ...saved }));
      }

      // Save optional fields after the candidate profile exists.
      if (!profileExists) {
        const optionalFields = {
          headline: payload.headline,
          bio: payload.bio,
          location: payload.location,
          githubUrl: payload.githubUrl,
          linkedinUrl: payload.linkedinUrl,
          portfolioUrl: payload.portfolioUrl,
        };

        if (Object.values(optionalFields).some(Boolean)) {
          const updateResponse = await api.patch(
            "/api/v1/candidates/me",
            optionalFields
          );

          setProfile((current) => ({
            ...current,
            ...updateResponse.data?.data,
          }));
        }
      }

      setProfileExists(true);
      setNotice("Your profile has been saved.");
      setPage("overview");
    } catch (err) {
      if (err.response?.status === 401) {
        handleLogout();
        return;
      }

      setError(getMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const completedFields = [
    profile.fullName,
    profile.username,
    profile.headline,
    profile.bio,
    profile.location,
    profile.githubUrl,
    profile.linkedinUrl,
    profile.portfolioUrl,
  ].filter((value) => String(value || "").trim()).length;

  const completion = Math.round((completedFields / 8) * 100);

  const hasSkills = (stats.skills?.total || 0) > 0;
  const hasEvidence = (stats.evidence?.total || 0) > 0;

  const steps = [
    {
      id: "profile",
      title: profileExists ? "Profile created" : "Set up your profile",
      text: profileExists
        ? "Add a headline and links any time to complete it."
        : "Your name and a username are all you need to start.",
      done: profileExists,
    },
    {
      id: "skills",
      title: hasSkills ? "Skills selected" : "Choose your skills",
      text: "Pick the skills you want to prove.",
      done: hasSkills,
    },
    {
      id: "evidence",
      title: hasEvidence ? "Evidence added" : "Add evidence",
      text: "Link projects, repositories or certificates to each skill.",
      done: hasEvidence,
    },
  ];

  const nextStep = steps.find((step) => !step.done);

  const heroCopy = {
    profile: {
      title: "Set up your profile",
      text: "It takes a minute. Your name and a username are enough to begin.",
      button: "Set up profile",
    },
    skills: {
      title: "Choose the skills to prove",
      text: "Select the skills you want employers to see, then back each one with evidence.",
      button: "Choose skills",
    },
    evidence: {
      title: "Back your skills with evidence",
      text: "Add a project, repository or certificate. A reviewer verifies it before it counts.",
      button: "Add evidence",
    },
  }[nextStep?.id] || {
    title: "Your workspace is set up",
    text: "Keep your evidence current. Editing evidence sends it back for review.",
    button: "View evidence",
  };

  const user = readUser();
  const initials = profile.fullName
    ? profile.fullName
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase()
    : "P";

  const statValue = (group, key) =>
    group ? String(group[key]) : "—";

  // Unauthenticated visitors see login/register, not the dashboard.
  if (!isAuthenticated) {
    return <Auth onAuthenticated={handleAuthenticated} />;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button
          className="brand"
          onClick={() => navigate("overview")}
          aria-label="Proovix home"
        >
          <span className="brand-mark">p</span>
          <span className="brand-copy">
            <strong>proovix</strong>
            <small>Prove what you can do.</small>
          </span>
        </button>

        <div className="sidebar-label">Workspace</div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${page === item.id ? "active" : ""}`}
              onClick={() => navigate(item.id)}
              aria-current={page === item.id ? "page" : undefined}
            >
              <span className="nav-icon" aria-hidden="true">
                <Icon name={item.icon} size={19} />
              </span>
              <span>{item.label}</span>
              {page === item.id && <span className="nav-active-mark" />}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-footer">
            <span className="footer-monogram">{initials}</span>
            <span>
              <strong>{profile.fullName || "Your account"}</strong>
              <small>{user?.email || "Candidate"}</small>
            </span>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span>{" "}
            <strong>
              {NAV_ITEMS.find((item) => item.id === page)?.label || "Profile"}
            </strong>
          </div>

          <div className="topbar-right">
            <div className="user-avatar" aria-hidden="true">
              {initials}
            </div>

            <button
              className="button button-secondary"
              type="button"
              onClick={handleLogout}
            >
              Sign out
            </button>
          </div>
        </header>

        <div className="page-content">
          {error && page !== "skills" && page !== "evidence" && (
            <div className="alert alert-error" role="alert">
              <span>{error}</span>
              <button onClick={() => setError("")} aria-label="Dismiss error">
                ×
              </button>
            </div>
          )}

          {notice && page === "overview" && (
            <div className="alert alert-success" role="status">
              {notice}
            </div>
          )}

          {loading ? (
            <section className="loading-state" aria-live="polite">
              <div className="loading-line" />
              <div className="loading-line short" />
              <p>Loading your workspace…</p>
            </section>
          ) : (
            <>
              {page === "overview" && (
                <>
                  <section className="page-heading">
                    <div>
                      <h1>
                        {profile.fullName
                          ? `Welcome back, ${profile.fullName.split(" ")[0]}`
                          : "Welcome to Proovix"}
                      </h1>
                      <p>
                        Here's where your profile, skills and evidence stand.
                      </p>
                    </div>
                  </section>

                  <section className="welcome-panel">
                    <div className="welcome-panel-content">
                      <span className="welcome-overline">
                        {nextStep ? "Next step" : "All done"}
                      </span>
                      <h2>{heroCopy.title}</h2>
                      <p>{heroCopy.text}</p>
                      <button
                        className="button button-light"
                        onClick={() => navigate(nextStep?.id || "evidence")}
                      >
                        {heroCopy.button}
                        <span aria-hidden="true">
                          <Icon name="arrow" size={16} />
                        </span>
                      </button>
                    </div>

                    <div className="welcome-graphic" aria-hidden="true">
                      <div className="graphic-ring ring-one" />
                      <div className="graphic-ring ring-two" />
                      <div className="graphic-center">P</div>
                    </div>
                  </section>

                  <section className="section-heading">
                    <div>
                      <h2>Your progress</h2>
                      <p>Counts come straight from your account.</p>
                    </div>
                  </section>

                  <section className="overview-grid">
                    <article className="overview-card">
                      <div className="overview-card-top">
                        <span>Profile completion</span>
                        <span className="card-symbol">
                          <Icon name="user" />
                        </span>
                      </div>
                      <div className="overview-value">
                        {profileExists ? `${completion}%` : "—"}
                      </div>
                      <p>
                        {profileExists
                          ? "Based on the profile fields you have filled in."
                          : "Create your profile to begin."}
                      </p>

                      {profileExists && (
                        <div
                          className="progress-track"
                          role="progressbar"
                          aria-label="Profile completion"
                          aria-valuenow={completion}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        >
                          <div
                            className="progress-fill"
                            style={{ width: `${completion}%` }}
                          />
                        </div>
                      )}
                    </article>

                    <article className="overview-card">
                      <div className="overview-card-top">
                        <span>Skills</span>
                        <span className="card-symbol">
                          <Icon name="target" />
                        </span>
                      </div>
                      <div className="overview-value">
                        {profileExists ? statValue(stats.skills, "total") : "—"}
                      </div>
                      <p>
                        {profileExists && stats.skills
                          ? `${stats.skills.verified} verified by a reviewer.`
                          : "Add skills once your profile exists."}
                      </p>
                    </article>

                    <article className="overview-card">
                      <div className="overview-card-top">
                        <span>Evidence</span>
                        <span className="card-symbol">
                          <Icon name="file" />
                        </span>
                      </div>
                      <div className="overview-value">
                        {profileExists ? statValue(stats.evidence, "total") : "—"}
                      </div>
                      <p>
                        {profileExists && stats.evidence
                          ? `${stats.evidence.verified} verified by a reviewer.`
                          : "Add evidence once you have skills."}
                      </p>
                    </article>
                  </section>

                  <section className="section-heading section-heading-spaced">
                    <div>
                      <h2>Getting set up</h2>
                      <p>Three steps to a profile employers can check.</p>
                    </div>
                  </section>

                  <section className="next-steps-list">
                    {steps.map((step, index) => (
                      <button
                        key={step.id}
                        className={`next-step ${step.done ? "is-done" : ""}`}
                        onClick={() => navigate(step.id)}
                      >
                        <span className="step-number">
                          {step.done ? (
                            <Icon name="check" size={18} />
                          ) : (
                            String(index + 1).padStart(2, "0")
                          )}
                        </span>
                        <span className="step-copy">
                          <strong>{step.title}</strong>
                          <small>{step.text}</small>
                        </span>
                        <span className="step-arrow" aria-hidden="true">
                          <Icon name="arrow" size={18} />
                        </span>
                      </button>
                    ))}
                  </section>
                </>
              )}

              {page === "profile" && (
                <>
                  <section className="page-heading">
                    <div>
                      <h1>
                        {profileExists ? "Your profile" : "Create your profile"}
                      </h1>
                      <p>Keep your details accurate. You can update them later.</p>
                    </div>
                  </section>

                  <form className="form-panel" onSubmit={saveProfile}>
                    <div className="form-section-heading">
                      <h2>About you</h2>
                      <p>Fields marked with * are required.</p>
                    </div>

                    <div className="form-grid">
                      <label className="field">
                        <span>Full name *</span>
                        <input
                          name="fullName"
                          value={profile.fullName}
                          onChange={updateField}
                          required
                          maxLength={100}
                          autoComplete="name"
                          placeholder="Your full name"
                        />
                      </label>

                      <label className="field">
                        <span>Username *</span>
                        <input
                          name="username"
                          value={profile.username}
                          onChange={updateField}
                          required
                          minLength={3}
                          maxLength={30}
                          pattern="[A-Za-z0-9_\-]+"
                          title="Use letters, numbers, underscores, or hyphens."
                          autoComplete="username"
                          placeholder="your-username"
                        />
                        <small>3–30 characters. Saved in lowercase.</small>
                      </label>

                      <label className="field field-full">
                        <span>Professional headline</span>
                        <input
                          name="headline"
                          value={profile.headline}
                          onChange={updateField}
                          maxLength={150}
                          placeholder="e.g. Full-stack developer"
                        />
                      </label>

                      <label className="field field-full">
                        <span>About you</span>
                        <textarea
                          name="bio"
                          value={profile.bio}
                          onChange={updateField}
                          maxLength={1000}
                          rows={5}
                          placeholder="Your experience, interests and the work you want to do."
                        />
                        <small>{profile.bio.length}/1000 characters</small>
                      </label>

                      <label className="field field-full">
                        <span>Location</span>
                        <input
                          name="location"
                          value={profile.location}
                          onChange={updateField}
                          maxLength={100}
                          autoComplete="address-level2"
                          placeholder="City, country"
                        />
                      </label>
                    </div>

                    <div className="form-section-heading form-section-spaced">
                      <h2>Links</h2>
                      <p>Must start with http or https.</p>
                    </div>

                    <div className="form-grid">
                      <label className="field field-full">
                        <span>GitHub</span>
                        <input
                          name="githubUrl"
                          type="url"
                          value={profile.githubUrl}
                          onChange={updateField}
                          placeholder="https://github.com/username"
                        />
                      </label>

                      <label className="field field-full">
                        <span>LinkedIn</span>
                        <input
                          name="linkedinUrl"
                          type="url"
                          value={profile.linkedinUrl}
                          onChange={updateField}
                          placeholder="https://www.linkedin.com/in/username"
                        />
                      </label>

                      <label className="field field-full">
                        <span>Portfolio website</span>
                        <input
                          name="portfolioUrl"
                          type="url"
                          value={profile.portfolioUrl}
                          onChange={updateField}
                          placeholder="https://your-portfolio.com"
                        />
                      </label>
                    </div>

                    <div className="form-actions">
                      <button
                        className="button button-secondary"
                        type="button"
                        onClick={() => navigate("overview")}
                      >
                        Cancel
                      </button>

                      <button
                        className="button button-primary"
                        type="submit"
                        disabled={saving}
                      >
                        {saving ? "Saving…" : "Save profile"}
                        {!saving && (
                          <span aria-hidden="true">
                            <Icon name="arrow" size={16} />
                          </span>
                        )}
                      </button>
                    </div>
                  </form>
                </>
              )}

              {page === "skills" && (
                <Skills
                  profileExists={profileExists}
                  onNavigate={navigate}
                  onSessionExpired={handleLogout}
                />
              )}

              {page === "evidence" && (
                <Evidence
                  profileExists={profileExists}
                  onNavigate={navigate}
                  onSessionExpired={handleLogout}
                />
              )}
            </>
          )}

          <footer className="page-footer">
            <span>Proovix</span>
          </footer>
        </div>
      </main>
    </div>
  );
}

export default App;