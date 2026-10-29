import { useEffect, useState } from "react";
import api from "../lib/api";
import { formatDateTime, getMessage, unwrap } from "../lib/helpers";
import { Icon, ACTION_LABEL } from "../components/ui";

const CARDS = [
  { key: "PENDING", label: "Awaiting review", icon: "clock", hint: "Open the queue" },
  { key: "CHANGES_REQUESTED", label: "More evidence needed", icon: "message", hint: "Waiting on candidates" },
  { key: "VERIFIED", label: "Approved", icon: "check", hint: "See approved evidence" },
  { key: "REJECTED", label: "Rejected", icon: "x", hint: "See rejected evidence" },
];

const VERB = {
  VERIFIED: "approved",
  REJECTED: "rejected",
  CHANGES_REQUESTED: "asked for more evidence on",
};

export default function ReviewerOverview({ onNavigate, onSessionExpired }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    api
      .get("/api/v1/reviews/stats")
      .then((response) => active && setStats(unwrap(response)))
      .catch((err) => {
        if (!active) return;
        if (err.response?.status === 401) onSessionExpired();
        else setError(getMessage(err));
      })
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [onSessionExpired]);

  const pending = stats?.counts?.PENDING || 0;

  return (
    <>
      <section className="page-heading">
        <div>
          <h1>Review desk</h1>
          <p>Check submitted evidence, record your decision and keep the audit trail clear.</p>
        </div>
      </section>

      {error && (
        <div className="alert alert-error" role="alert">
          <span>{error}</span>
          <button onClick={() => setError("")} aria-label="Dismiss error">×</button>
        </div>
      )}

      {loading ? (
        <section className="loading-state" aria-live="polite">
          <div className="loading-line" />
          <div className="loading-line short" />
          <p>Loading your review desk…</p>
        </section>
      ) : (
        stats && (
          <>
            <section className="welcome-panel">
              <div className="welcome-panel-content">
                <span className="welcome-overline">Review queue</span>
                <h2>
                  {pending === 0
                    ? "The queue is clear"
                    : `${pending} ${pending === 1 ? "item is" : "items are"} waiting`}
                </h2>
                <p>
                  {pending === 0
                    ? "New submissions appear here as soon as candidates send them in."
                    : "The oldest submissions are listed first so nobody waits longer than they need to."}
                </p>
                <button
                  className="button button-light"
                  onClick={() => onNavigate("queue", "PENDING")}
                >
                  Open the queue
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
                <h2>Where things stand</h2>
                <p>Select a card to see those submissions.</p>
              </div>
            </section>

            <section className="overview-grid">
              {CARDS.map((card) => (
                <button
                  key={card.key}
                  className="overview-card stat-button"
                  onClick={() => onNavigate("queue", card.key)}
                >
                  <div className="overview-card-top">
                    <span>{card.label}</span>
                    <span className="card-symbol">
                      <Icon name={card.icon} />
                    </span>
                  </div>
                  <div className="overview-value">{stats.counts[card.key] || 0}</div>
                  <p>{card.hint}</p>
                </button>
              ))}

              <article className="overview-card">
                <div className="overview-card-top">
                  <span>Reviewed by you</span>
                  <span className="card-symbol">
                    <Icon name="user" />
                  </span>
                </div>
                <div className="overview-value">{stats.reviewedByMe}</div>
                <p>Decisions you have recorded.</p>
              </article>
            </section>

            <section className="section-heading section-heading-spaced">
              <div>
                <h2>Recent activity</h2>
                <p>The latest decisions from the review team.</p>
              </div>
            </section>

            {stats.recent.length === 0 ? (
              <div className="empty-state-box">
                <strong>No decisions yet</strong>
                <span>Decisions will appear here once reviewing starts.</span>
              </div>
            ) : (
              <ul className="activity-list">
                {stats.recent.map((log) => (
                  <li key={log._id}>
                    <span className={`activity-dot dot-${log.action}`} aria-hidden="true" />
                    <div>
                      <p>
                        <strong>{log.reviewerEmail || "A reviewer"}</strong>{" "}
                        {VERB[log.action]} “{log.evidenceTitle}”
                        {log.candidateName ? ` from ${log.candidateName}` : ""}
                      </p>
                      <small>
                        {ACTION_LABEL[log.action]} · {formatDateTime(log.createdAt)}
                      </small>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )
      )}
    </>
  );
}