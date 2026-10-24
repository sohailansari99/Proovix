import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../lib/api";
import { getMessage, safeUrl, unwrap } from "../lib/helpers";
import { Icon, StatusBadge, NeedProfile } from "../components/ui";

const TYPES = [
  ["PROJECT", "Project"],
  ["GITHUB", "GitHub repository"],
  ["ASSESSMENT", "Assessment"],
  ["CERTIFICATE", "Certificate"],
  ["INTERNSHIP", "Internship"],
];
const TYPE_LABEL = Object.fromEntries(TYPES);

const FILTERS = [
  ["ALL", "All"],
  ["PENDING", "Awaiting review"],
  ["VERIFIED", "Verified"],
  ["REJECTED", "Rejected"],
];

const EMPTY_FORM = {
  candidateSkillId: "",
  type: "PROJECT",
  title: "",
  description: "",
  sourceUrl: "",
};

function hostOf(href) {
  try {
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return href;
  }
}

function Analysis({ data }) {
  const competencies = data.competencies || [];
  const strengths = data.strengths || [];
  const missing = data.missingEvidence || [];

  return (
    <div className="analysis">
      <p className="analysis-summary">{data.summary}</p>

      {competencies.length > 0 && (
        <>
          <h4>Competencies</h4>
          <ul className="meter-list">
            {competencies.map((c) => (
              <li key={c.name}>
                <div className="score-line">
                  <span>{c.name}</span>
                  <strong>{c.score}</strong>
                </div>
                <div className="meter" aria-hidden="true">
                  <div style={{ width: `${c.score}%` }} />
                </div>
                <small>{c.reason}</small>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="analysis-columns">
        {strengths.length > 0 && (
          <div>
            <h4>Strengths</h4>
            <ul>
              {strengths.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        )}
        {missing.length > 0 && (
          <div>
            <h4>What would make it stronger</h4>
            <ul>
              {missing.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Evidence({ profileExists, onNavigate, onSessionExpired }) {
  const [items, setItems] = useState([]);
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [filter, setFilter] = useState("ALL");

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [analyzingId, setAnalyzingId] = useState("");
  const [expanded, setExpanded] = useState({});

  const fail = useCallback(
    (err) => {
      if (err.response?.status === 401) return onSessionExpired();
      setError(getMessage(err));
    },
    [onSessionExpired]
  );

  const load = useCallback(async () => {
    try {
      const [evidenceRes, skillsRes] = await Promise.all([
        api.get("/api/v1/candidates/me/evidence"),
        api.get("/api/v1/candidates/me/skills"),
      ]);
      setItems(unwrap(evidenceRes) || []);
      setSkills(unwrap(skillsRes) || []);
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

  const counts = useMemo(() => {
    const result = { ALL: items.length, PENDING: 0, VERIFIED: 0, REJECTED: 0 };
    items.forEach((item) => {
      result[item.verificationStatus] = (result[item.verificationStatus] || 0) + 1;
    });
    return result;
  }, [items]);

  const visible = useMemo(
    () =>
      filter === "ALL"
        ? items
        : items.filter((item) => item.verificationStatus === filter),
    [items, filter]
  );

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function openNew() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, candidateSkillId: skills[0]?._id || "" });
    setError("");
    setNotice("");
    setFormOpen(true);
  }

  function openEdit(item) {
    setEditingId(item._id);
    setForm({
      candidateSkillId: item.candidateSkillId?._id || "",
      type: item.type,
      title: item.title,
      description: item.description || "",
      sourceUrl: item.sourceUrl || "",
    });
    setError("");
    setNotice("");
    setFormOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
  }

  async function saveEvidence(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    const fields = {
      type: form.type,
      title: form.title.trim(),
      description: form.description.trim(),
      sourceUrl: form.sourceUrl.trim(),
    };

    try {
      if (editingId) {
        await api.patch(`/api/v1/candidates/me/evidence/${editingId}`, fields);
        setNotice("Evidence updated. Run the AI analysis again to refresh its feedback.");
      } else {
        await api.post("/api/v1/candidates/me/evidence", {
          candidateSkillId: form.candidateSkillId,
          ...fields,
        });
        setNotice("Evidence added. Run the AI analysis to get feedback on it.");
      }
      closeForm();
      await load();
    } catch (err) {
      fail(err);
    } finally {
      setSaving(false);
    }
  }

  async function analyze(item) {
    if (
      item.verificationStatus === "VERIFIED" &&
      !window.confirm(
        "Re-running the analysis sends this verified evidence back for review. Continue?"
      )
    ) {
      return;
    }

    setAnalyzingId(item._id);
    setError("");
    setNotice("");

    try {
      const response = await api.post(
        `/api/v1/candidates/me/evidence/${item._id}/analyze`
      );
      const updated = unwrap(response);
      if (updated) {
        setItems((current) =>
          current.map((entry) => (entry._id === updated._id ? updated : entry))
        );
        setExpanded((current) => ({ ...current, [updated._id]: true }));
      }
      setNotice("Analysis finished. A reviewer still needs to verify this evidence.");
    } catch (err) {
      fail(err);
    } finally {
      setAnalyzingId("");
    }
  }

  async function removeEvidence(item) {
    if (!window.confirm(`Delete "${item.title}"? This can't be undone.`)) return;

    setError("");
    setNotice("");

    try {
      await api.delete(`/api/v1/candidates/me/evidence/${item._id}`);
      setNotice("Evidence deleted.");
      await load();
    } catch (err) {
      fail(err);
    }
  }

  if (!profileExists) return <NeedProfile onNavigate={onNavigate} />;

  return (
    <>
      <section className="page-heading">
        <div>
          <h1>Evidence</h1>
          <p>
            Add projects, repositories and certificates that back up your
            skills. The AI analysis gives you feedback, but a reviewer must
            verify evidence before it counts toward a skill score.
          </p>
        </div>

        {skills.length > 0 && !formOpen && (
          <button className="button button-primary" onClick={openNew}>
            <Icon name="plus" size={16} />
            Add evidence
          </button>
        )}
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
          <p>Loading evidence…</p>
        </section>
      ) : (
        <>
          {skills.length === 0 && (
            <div className="empty-state-box">
              <strong>Add a skill first</strong>
              <span>
                Each piece of evidence supports one of your skills, so choose a
                skill before adding evidence.
              </span>
              <div>
                <button
                  className="button button-primary button-small"
                  onClick={() => onNavigate("skills")}
                >
                  Go to skills
                </button>
              </div>
            </div>
          )}

          {formOpen && (
            <form className="form-panel" onSubmit={saveEvidence}>
              <div className="form-section-heading">
                <h2>{editingId ? "Edit evidence" : "Add evidence"}</h2>
                <p>
                  {editingId
                    ? "Saving clears the earlier analysis and sends it back for review."
                    : "Link to something a reviewer can open and check."}
                </p>
              </div>

              <div className="form-grid">
                <label className="field">
                  <span>Skill *</span>
                  <select
                    name="candidateSkillId"
                    value={form.candidateSkillId}
                    onChange={updateField}
                    disabled={Boolean(editingId)}
                    required
                  >
                    {skills.map((item) => (
                      <option key={item._id} value={item._id}>
                        {item.skillId?.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Type *</span>
                  <select name="type" value={form.type} onChange={updateField}>
                    {TYPES.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field field-full">
                  <span>Title *</span>
                  <input
                    name="title"
                    value={form.title}
                    onChange={updateField}
                    maxLength={150}
                    required
                    placeholder="e.g. Inventory tracker built with Node and MongoDB"
                  />
                </label>

                <label className="field field-full">
                  <span>Link</span>
                  <input
                    name="sourceUrl"
                    type="url"
                    value={form.sourceUrl}
                    onChange={updateField}
                    maxLength={500}
                    placeholder="https://github.com/you/project"
                  />
                  <small>Repository, live site or certificate page. Must start with http or https.</small>
                </label>

                <label className="field field-full">
                  <span>What did you do?</span>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={updateField}
                    maxLength={2000}
                    rows={5}
                    placeholder="Describe your part, the tools you used and the result."
                  />
                  <small>{form.description.length}/2000 characters</small>
                </label>
              </div>

              <div className="form-actions">
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={closeForm}
                >
                  Cancel
                </button>
                <button
                  className="button button-primary"
                  type="submit"
                  disabled={saving}
                >
                  {saving ? "Saving…" : editingId ? "Save changes" : "Add evidence"}
                </button>
              </div>
            </form>
          )}

          {items.length > 0 && (
            <div className="chip-row" role="group" aria-label="Filter evidence">
              {FILTERS.map(([value, label]) => (
                <button
                  key={value}
                  className={`chip ${filter === value ? "active" : ""}`}
                  onClick={() => setFilter(value)}
                  aria-pressed={filter === value}
                >
                  {label} <span>{counts[value] || 0}</span>
                </button>
              ))}
            </div>
          )}

          {items.length === 0 && skills.length > 0 && !formOpen && (
            <div className="empty-state-box">
              <strong>No evidence yet</strong>
              <span>
                Add your first project, repository or certificate to start
                backing up your skills.
              </span>
              <div>
                <button className="button button-primary button-small" onClick={openNew}>
                  Add evidence
                </button>
              </div>
            </div>
          )}

          {items.length > 0 && visible.length === 0 && (
            <div className="empty-state-box">
              <strong>Nothing in this view</strong>
              <span>Choose another filter to see the rest of your evidence.</span>
            </div>
          )}

          <div className="evidence-list">
            {visible.map((item) => {
              const href = safeUrl(item.sourceUrl);
              const status = item.verificationStatus;
              const isOpen = Boolean(expanded[item._id]);
              const analyzing = analyzingId === item._id;

              return (
                <article className="item-card" key={item._id}>
                  <div className="item-head">
                    <h3>{item.title}</h3>
                    <StatusBadge status={status} />
                  </div>

                  <ul className="tag-list">
                    <li className="tag">{TYPE_LABEL[item.type] || item.type}</li>
                    <li className="tag">
                      {item.candidateSkillId?.skillId?.name || "Skill"}
                    </li>
                  </ul>

                  {href && (
                    <a
                      className="item-link"
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Icon name="link" size={15} />
                      {hostOf(href)}
                    </a>
                  )}

                  {item.description && <p className="item-desc">{item.description}</p>}

                  {item.reviewNote && (
                    <p className="review-note">
                      <strong>Reviewer note:</strong> {item.reviewNote}
                    </p>
                  )}

                  <p className="score-note">
                    {item.aiAnalysis ? (
                      <>
                        Evidence score <strong>{item.confidenceScore}</strong>/100
                      </>
                    ) : (
                      "Not analyzed yet"
                    )}
                  </p>

                  {isOpen && item.aiAnalysis && <Analysis data={item.aiAnalysis} />}

                  <div className="item-actions">
                    <button
                      className="button button-primary button-small"
                      onClick={() => analyze(item)}
                      disabled={analyzing || status === "REJECTED"}
                      title={
                        status === "REJECTED"
                          ? "Rejected evidence can't be analyzed. Add new evidence instead."
                          : undefined
                      }
                    >
                      <Icon name="spark" size={15} />
                      {analyzing
                        ? "Analyzing…"
                        : item.aiAnalysis
                          ? "Run analysis again"
                          : "Run AI analysis"}
                    </button>

                    {item.aiAnalysis && (
                      <button
                        className="button button-secondary button-small"
                        onClick={() =>
                          setExpanded((current) => ({
                            ...current,
                            [item._id]: !current[item._id],
                          }))
                        }
                        aria-expanded={isOpen}
                      >
                        {isOpen ? "Hide analysis" : "View analysis"}
                      </button>
                    )}

                    <button
                      className="button button-secondary button-small"
                      onClick={() => openEdit(item)}
                      disabled={status !== "PENDING"}
                      title={
                        status !== "PENDING"
                          ? "Only evidence that is awaiting review can be edited."
                          : undefined
                      }
                    >
                      <Icon name="edit" size={15} />
                      Edit
                    </button>

                    <button
                      className="button button-secondary button-small button-danger"
                      onClick={() => removeEvidence(item)}
                    >
                      <Icon name="trash" size={15} />
                      Delete
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}