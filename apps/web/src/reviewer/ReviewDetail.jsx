import { useCallback, useEffect, useState } from "react";
import api from "../lib/api";
import { formatDate, formatDateTime, getMessage, safeUrl, unwrap } from "../lib/helpers";
import { Icon, StatusBadge, Analysis, ACTION_LABEL } from "../components/ui";

const TYPE_LABEL = {
  PROJECT: "Project",
  GITHUB: "GitHub repository",
  ASSESSMENT: "Assessment",
  CERTIFICATE: "Certificate",
  INTERNSHIP: "Internship",
};

const DONE_MESSAGE = {
  VERIFIED: "Evidence approved.",
  REJECTED: "Evidence rejected. The candidate can see your reason.",
  CHANGES_REQUESTED: "Requested more evidence. The candidate can see your note.",
};

function hostOf(href) {
  try {
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return href;
  }
}

export default function ReviewDetail({ id, onBack, onDone, onSessionExpired }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState("");

  const handleError = useCallback(
    (err) => {
      if (err.response?.status === 401) onSessionExpired();
      else setError(getMessage(err));
    },
    [onSessionExpired]
  );

  const load = useCallback(async () => {
    try {
      const response = await api.get(`/api/v1/reviews/evidence/${id}`);
      setDetail(unwrap(response));
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, [id, handleError]);

  useEffect(() => {
    load();
  }, [load]);

  async function decide(status) {
    const text = note.trim();
    setError("");

    if (status !== "VERIFIED" && text.length < 10) {
      setError("Add a reason for the candidate (at least 10 characters).");
      return;
    }

    if (status === "REJECTED" && !window.confirm("Reject this evidence? The candidate will need to submit new evidence.")) {
      return;
    }

    setBusy(status);

    try {
      await api.post(`/api/v1/reviews/evidence/${id}/decision`, { status, note: text });
      onDone(DONE_MESSAGE[status]);
    } catch (err) {
      handleError(err);
      if (err.response?.status === 409) load(); // someone else decided first
    } finally {
      setBusy("");
    }
  }

  const back = (
    <button className="back-link" onClick={onBack}>
      <Icon name="back" size={16} /> Back to the queue
    </button>
  );

  if (loading) {
    return (
      <>
        {back}
        <section className="loading-state" aria-live="polite">
          <div className="loading-line" />
          <div className="loading-line short" />
          <p>Loading submission…</p>
        </section>
      </>
    );
  }

  if (!detail) {
    return (
      <>
        {back}
        {error && (
          <div className="alert alert-error" role="alert">
            <span>{error}</span>
          </div>
        )}
      </>
    );
  }

  const { evidence, history } = detail;
  const candidate = evidence.candidateId;
  const skill = evidence.candidateSkillId?.skillId;
  const href = safeUrl(evidence.sourceUrl);
  const isPending = evidence.verificationStatus === "PENDING";
  const analysed = Boolean(evidence.aiAnalysis);

  const candidateLinks = [
    ["GitHub", candidate?.githubUrl],
    ["LinkedIn", candidate?.linkedinUrl],
    ["Portfolio", candidate?.portfolioUrl],
  ].filter(([, value]) => safeUrl(value));

  return (
    <>
      {back}

      <section className="page-heading" style={{ marginTop: 16 }}>
        <div>
          <h1>{evidence.title}</h1>
          <p>
            {TYPE_LABEL[evidence.type] || evidence.type}
            {skill ? ` for ${skill.name}` : ""} · submitted {formatDate(evidence.createdAt)}
          </p>
        </div>
        <StatusBadge status={evidence.verificationStatus} />
      </section>

      {error && (
        <div className="alert alert-error" role="alert">
          <span>{error}</span>
          <button onClick={() => setError("")} aria-label="Dismiss error">×</button>
        </div>
      )}

      <div className="detail-grid">
        <div className="detail-col">
          <section className="panel">
            <h2>The evidence</h2>

            {href ? (
              <a className="item-link" href={href} target="_blank" rel="noopener noreferrer">
                <Icon name="link" size={15} />
                {hostOf(href)} (opens in a new tab)
              </a>
            ) : (
              <p className="item-sub">No link was provided.</p>
            )}

            {evidence.description ? (
              <p className="item-desc">{evidence.description}</p>
            ) : (
              <p className="item-sub">The candidate didn’t add a description.</p>
            )}

            {skill?.competencies?.length > 0 && (
              <>
                <h3 className="panel-sub">What {skill.name} should show</h3>
                <ul className="tag-list">
                  {skill.competencies.map((c) => (
                    <li key={c} className="tag">{c}</li>
                  ))}
                </ul>
              </>
            )}
          </section>

          <section className="panel">
            <h2>AI analysis</h2>
            {analysed ? (
              <>
                <p className="score-note">
                  Evidence score <strong>{evidence.confidenceScore}</strong>/100. This is guidance. The decision is yours.
                </p>
                <Analysis data={evidence.aiAnalysis} />
              </>
            ) : (
              <p className="hint">
                The candidate hasn’t run the AI analysis yet. You can’t approve
                until they do, but you can ask for more evidence.
              </p>
            )}
          </section>

          <section className="panel">
            <h2>Candidate</h2>
            {candidate ? (
              <>
                <p className="candidate-name">
                  {candidate.fullName} <span>@{candidate.username}</span>
                </p>
                {candidate.headline && <p className="item-desc">{candidate.headline}</p>}
                {candidate.location && <p className="item-sub">{candidate.location}</p>}
                {candidateLinks.length > 0 && (
                  <ul className="tag-list">
                    {candidateLinks.map(([label, value]) => (
                      <li key={label}>
                        <a className="item-link" href={safeUrl(value)} target="_blank" rel="noopener noreferrer">
                          <Icon name="link" size={14} /> {label}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <p className="item-sub">This candidate profile is no longer available.</p>
            )}
          </section>
        </div>

        <div className="detail-col">
          <section className="panel decision-panel">
            <h2>Your decision</h2>

            {isPending ? (
              <>
                <label className="field">
                  <span>Note for the candidate</span>
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    maxLength={1000}
                    rows={5}
                    placeholder="Required when rejecting or asking for more evidence. Say what you checked and what is missing."
                  />
                  <small>{note.length}/1000 characters</small>
                </label>

                <div className="decision-actions">
                  <button
                    className="button button-primary"
                    onClick={() => decide("VERIFIED")}
                    disabled={Boolean(busy) || !analysed}
                    title={!analysed ? "The AI analysis has to be run first." : undefined}
                  >
                    <Icon name="check" size={16} />
                    {busy === "VERIFIED" ? "Approving…" : "Approve"}
                  </button>
                  <button
                    className="button button-secondary"
                    onClick={() => decide("CHANGES_REQUESTED")}
                    disabled={Boolean(busy)}
                  >
                    <Icon name="message" size={16} />
                    {busy === "CHANGES_REQUESTED" ? "Sending…" : "Request more evidence"}
                  </button>
                  <button
                    className="button button-secondary button-danger"
                    onClick={() => decide("REJECTED")}
                    disabled={Boolean(busy)}
                  >
                    <Icon name="x" size={16} />
                    {busy === "REJECTED" ? "Rejecting…" : "Reject"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="item-sub">
                  This submission isn’t waiting for review any more.
                  {evidence.reviewedAt ? ` Last decision: ${formatDateTime(evidence.reviewedAt)}.` : ""}
                </p>
                {evidence.reviewNote && (
                  <p className="review-note">
                    <strong>Note:</strong> {evidence.reviewNote}
                  </p>
                )}
              </>
            )}
          </section>

          <section className="panel">
            <h2>Review history</h2>
            {history.length === 0 ? (
              <p className="item-sub">No decisions recorded yet.</p>
            ) : (
              <ul className="timeline">
                {history.map((log) => (
                  <li key={log._id}>
                    <strong>{ACTION_LABEL[log.action]}</strong>
                    <small>
                      {log.reviewerEmail || "A reviewer"} · {formatDateTime(log.createdAt)}
                    </small>
                    {log.note && <p>{log.note}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}