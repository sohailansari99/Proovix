import { useEffect, useState } from "react";
import api from "../lib/api";
import { formatDateTime, getMessage, unwrap } from "../lib/helpers";
import { ACTION_LABEL } from "../components/ui";

export default function ReviewHistory({ onSessionExpired }) {
  const [scope, setScope] = useState("mine");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    api
      .get("/api/v1/reviews/history", { params: { scope, page } })
      .then((response) => active && setData(unwrap(response) || { items: [], total: 0, pages: 1 }))
      .catch((err) => {
        if (!active) return;
        if (err.response?.status === 401) onSessionExpired();
        else setError(getMessage(err));
      })
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [scope, page, onSessionExpired]);

  return (
    <>
      <section className="page-heading">
        <div>
          <h1>Review history</h1>
          <p>Every decision is recorded with who made it, when, and why. Entries can’t be edited.</p>
        </div>
      </section>

      {error && (
        <div className="alert alert-error" role="alert">
          <span>{error}</span>
          <button onClick={() => setError("")} aria-label="Dismiss error">×</button>
        </div>
      )}

      <div className="chip-row" role="group" aria-label="Whose decisions" style={{ marginTop: 0 }}>
        {[
          ["mine", "My decisions"],
          ["all", "Everyone"],
        ].map(([value, label]) => (
          <button
            key={value}
            className={`chip ${scope === value ? "active" : ""}`}
            onClick={() => {
              setScope(value);
              setPage(1);
            }}
            aria-pressed={scope === value}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <section className="loading-state" aria-live="polite">
          <div className="loading-line" />
          <div className="loading-line short" />
          <p>Loading history…</p>
        </section>
      ) : data.items.length === 0 ? (
        <div className="empty-state-box">
          <strong>No decisions yet</strong>
          <span>Decisions you record will be listed here.</span>
        </div>
      ) : (
        <>
          <ul className="activity-list">
            {data.items.map((log) => (
              <li key={log._id}>
                <span className={`activity-dot dot-${log.action}`} aria-hidden="true" />
                <div>
                  <p>
                    <strong>{ACTION_LABEL[log.action]}</strong> “{log.evidenceTitle}”
                    {log.candidateName ? ` from ${log.candidateName}` : ""}
                  </p>
                  <small>
                    {scope === "all" && log.reviewerEmail ? `${log.reviewerEmail} · ` : ""}
                    {formatDateTime(log.createdAt)}
                  </small>
                  {log.note && <p className="activity-note">{log.note}</p>}
                </div>
              </li>
            ))}
          </ul>

          <div className="pager">
            <span>
              {data.total} {data.total === 1 ? "entry" : "entries"} · page {page} of {data.pages}
            </span>
            <div>
              <button
                className="button button-secondary button-small"
                onClick={() => setPage((value) => value - 1)}
                disabled={page <= 1}
              >
                Previous
              </button>{" "}
              <button
                className="button button-secondary button-small"
                onClick={() => setPage((value) => value + 1)}
                disabled={page >= data.pages}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}