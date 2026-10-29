import { useEffect, useState } from "react";
import api from "../lib/api";
import { formatDate, getMessage, unwrap } from "../lib/helpers";
import { Icon, StatusBadge } from "../components/ui";
import ReviewDetail from "./ReviewDetail";

const FILTERS = [
  ["PENDING", "Awaiting review"],
  ["CHANGES_REQUESTED", "More evidence needed"],
  ["VERIFIED", "Approved"],
  ["REJECTED", "Rejected"],
  ["ALL", "All"],
];

const TYPE_LABEL = {
  PROJECT: "Project",
  GITHUB: "GitHub repository",
  ASSESSMENT: "Assessment",
  CERTIFICATE: "Certificate",
  INTERNSHIP: "Internship",
};

export default function ReviewQueue({ initialStatus, onSessionExpired }) {
  const [status, setStatus] = useState(initialStatus || "PENDING");
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [openId, setOpenId] = useState(null);

  // Wait a moment after typing before searching.
  useEffect(() => {
    const timer = setTimeout(() => {
      setTerm(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (openId) return undefined;

    let active = true;
    setLoading(true);
    setError("");

    api
      .get("/api/v1/reviews/queue", { params: { status, search: term, page } })
      .then((response) => {
        if (active) setData(unwrap(response) || { items: [], total: 0, pages: 1 });
      })
      .catch((err) => {
        if (!active) return;
        if (err.response?.status === 401) onSessionExpired();
        else setError(getMessage(err));
      })
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [status, term, page, openId, onSessionExpired]);

  if (openId) {
    return (
      <ReviewDetail
        id={openId}
        onBack={() => setOpenId(null)}
        onDone={(message) => {
          setOpenId(null);
          setNotice(message);
        }}
        onSessionExpired={onSessionExpired}
      />
    );
  }

  function changeStatus(value) {
    setStatus(value);
    setPage(1);
    setNotice("");
  }

  return (
    <>
      <section className="page-heading">
        <div>
          <h1>Review queue</h1>
          <p>Open a submission to inspect the proof and record your decision.</p>
        </div>
      </section>

      {error && (
        <div className="alert alert-error" role="alert">
          <span>{error}</span>
          <button onClick={() => setError("")} aria-label="Dismiss error">×</button>
        </div>
      )}
      {notice && (
        <div className="alert alert-success" role="status">
          {notice}
        </div>
      )}

      <div className="toolbar">
        <input
          className="search-input"
          type="search"
          placeholder="Search by candidate or evidence title"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search the queue"
        />
      </div>

      <div className="chip-row" role="group" aria-label="Filter by status" style={{ marginTop: 0 }}>
        {FILTERS.map(([value, label]) => (
          <button
            key={value}
            className={`chip ${status === value ? "active" : ""}`}
            onClick={() => changeStatus(value)}
            aria-pressed={status === value}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <section className="loading-state" aria-live="polite">
          <div className="loading-line" />
          <div className="loading-line short" />
          <p>Loading submissions…</p>
        </section>
      ) : data.items.length === 0 ? (
        <div className="empty-state-box">
          <strong>{term ? "Nothing matches your search" : "Nothing here right now"}</strong>
          <span>
            {term
              ? "Try a different name or title."
              : "New submissions and updates will appear here."}
          </span>
        </div>
      ) : (
        <>
          <div className="queue-list">
            {data.items.map((item) => (
              <article className="item-card queue-row" key={item._id}>
                <div className="queue-main">
                  <div className="item-head">
                    <h3>{item.title}</h3>
                  </div>
                  <div className="queue-meta">
                    <span>{item.candidateId?.fullName || "Unknown candidate"}</span>
                    <span>{item.candidateSkillId?.skillId?.name || "Skill"}</span>
                    <span>{TYPE_LABEL[item.type] || item.type}</span>
                    <span>Submitted {formatDate(item.createdAt)}</span>
                  </div>
                  <div className="tag-list">
                    <StatusBadge status={item.verificationStatus} />
                    {item.verificationStatus === "PENDING" && !item.hasAnalysis && (
                      <span className="tag">AI analysis not run yet</span>
                    )}
                  </div>
                </div>

                <button
                  className="button button-primary button-small"
                  onClick={() => {
                    setNotice("");
                    setOpenId(item._id);
                  }}
                >
                  {item.verificationStatus === "PENDING" ? "Review" : "View"}
                  <span aria-hidden="true">
                    <Icon name="arrow" size={15} />
                  </span>
                </button>
              </article>
            ))}
          </div>

          <div className="pager">
            <span>
              {data.total} {data.total === 1 ? "submission" : "submissions"} · page {page} of {data.pages}
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