import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../lib/api";
import { getMessage, unwrap } from "../lib/helpers";
import { Icon, StatusBadge, NeedProfile } from "../components/ui";

export default function Skills({ profileExists, onNavigate, onSessionExpired }) {
  const [mine, setMine] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  const fail = useCallback(
    (err) => {
      if (err.response?.status === 401) return onSessionExpired();
      setError(getMessage(err));
    },
    [onSessionExpired]
  );

  const load = useCallback(async () => {
    try {
      const [mineRes, catalogRes] = await Promise.all([
        api.get("/api/v1/candidates/me/skills"),
        api.get("/api/v1/skills"),
      ]);
      setMine(unwrap(mineRes) || []);
      setCatalog(unwrap(catalogRes) || []);
    } catch (err) {
      fail(err);
    } finally {
      setLoading(false);
    }
  }, [fail]);

  useEffect(() => {
    if (profileExists) load();
    else setLoading(false);
  }, [profileExists, load]);

  const ownedIds = useMemo(
    () => new Set(mine.map((item) => item.skillId?._id)),
    [mine]
  );

  const categories = useMemo(
    () => ["all", ...new Set(catalog.map((s) => s.category).filter(Boolean))],
    [catalog]
  );

  const available = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog.filter(
      (skill) =>
        !ownedIds.has(skill._id) &&
        (category === "all" || skill.category === category) &&
        (!q ||
          `${skill.name} ${skill.category} ${skill.description}`
            .toLowerCase()
            .includes(q))
    );
  }, [catalog, ownedIds, query, category]);

  async function addSkill(skill) {
    setBusyId(skill._id);
    setError("");
    setNotice("");
    try {
      await api.post("/api/v1/candidates/me/skills", { skillId: skill._id });
      setNotice(`${skill.name} was added. Next, add evidence to back it up.`);
      await load();
    } catch (err) {
      fail(err);
    } finally {
      setBusyId("");
    }
  }

  async function removeSkill(item) {
    const name = item.skillId?.name || "this skill";
    if (!window.confirm(`Remove ${name}? Your evidence is kept if you add it back later.`)) {
      return;
    }
    setBusyId(item._id);
    setError("");
    setNotice("");
    try {
      await api.delete(`/api/v1/candidates/me/skills/${item.skillId._id}`);
      setNotice(`${name} was removed.`);
      await load();
    } catch (err) {
      fail(err);
    } finally {
      setBusyId("");
    }
  }

  if (!profileExists) return <NeedProfile onNavigate={onNavigate} />;

  return (
    <>
      <section className="page-heading">
        <div>
          <h1>Skills</h1>
          <p>
            Choose the skills you want to prove. A skill score comes only from
            evidence that a reviewer has verified.
          </p>
        </div>
      </section>

      {error && (
        <div className="alert alert-error" role="alert">
          <span>{error}</span>
          <button onClick={() => setError("")} aria-label="Dismiss error">
            ×
          </button>
        </div>
      )}
      {notice && (
        <div className="alert alert-success" role="status">
          {notice}
        </div>
      )}

      {loading ? (
        <section className="loading-state" aria-live="polite">
          <div className="loading-line" />
          <div className="loading-line short" />
          <p>Loading skills…</p>
        </section>
      ) : (
        <>
          <section className="section-heading" style={{ marginTop: 0 }}>
            <div>
              <h2>Your skills</h2>
              <p>{mine.length ? `${mine.length} selected` : "You haven't added any yet."}</p>
            </div>
          </section>

          {mine.length > 0 && (
            <div className="card-grid">
              {mine.map((item) => (
                <article className="item-card" key={item._id}>
                  <div className="item-head">
                    <h3>{item.skillId?.name}</h3>
                    <StatusBadge status={item.verificationStatus} />
                  </div>
                  <p className="item-sub">{item.skillId?.category}</p>
                  <div className="score-line">
                    <span>Verified score</span>
                    <strong>{item.confidenceScore}/100</strong>
                  </div>
                  <div className="meter" aria-hidden="true">
                    <div style={{ width: `${item.confidenceScore}%` }} />
                  </div>
                  <div className="item-actions">
                    <button
                      className="button button-secondary button-small"
                      onClick={() => onNavigate("evidence")}
                    >
                      Add evidence
                    </button>
                    <button
                      className="button button-secondary button-small button-danger"
                      onClick={() => removeSkill(item)}
                      disabled={busyId === item._id}
                    >
                      Remove
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          <section className="section-heading section-heading-spaced">
            <div>
              <h2>Add a skill</h2>
              <p>Pick from the skills Proovix can assess.</p>
            </div>
          </section>

          <div className="toolbar">
            <input
              className="search-input"
              type="search"
              placeholder="Search skills"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search skills"
            />
            <select
              className="select-input"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-label="Filter by category"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === "all" ? "All categories" : c}
                </option>
              ))}
            </select>
          </div>

          {available.length === 0 ? (
            <div className="empty-state-box">
              <strong>
                {catalog.length === 0
                  ? "No skills are available yet"
                  : "No skills match your search"}
              </strong>
              <span>
                {catalog.length === 0
                  ? "An administrator needs to add skills to the catalog first."
                  : "Try a different word or category."}
              </span>
            </div>
          ) : (
            <div className="card-grid">
              {available.map((skill) => (
                <article className="item-card" key={skill._id}>
                  <div className="item-head">
                    <h3>{skill.name}</h3>
                  </div>
                  <p className="item-sub">{skill.category}</p>
                  <p className="item-desc">{skill.description}</p>
                  {skill.competencies?.length > 0 && (
                    <ul className="tag-list">
                      {skill.competencies.slice(0, 4).map((c) => (
                        <li key={c} className="tag">
                          {c}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="item-actions">
                    <button
                      className="button button-primary button-small"
                      onClick={() => addSkill(skill)}
                      disabled={busyId === skill._id}
                    >
                      <Icon name="plus" size={15} />
                      {busyId === skill._id ? "Adding…" : "Add skill"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}