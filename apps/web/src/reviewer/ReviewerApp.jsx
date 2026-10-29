import { useState } from "react";
import { Icon } from "../components/ui";
import ReviewerOverview from "./ReviewerOverview";
import ReviewQueue from "./ReviewQueue";
import ReviewHistory from "./ReviewHistory";
import "./Reviewer.css";

const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: "grid" },
  { id: "queue", label: "Review queue", icon: "list" },
  { id: "history", label: "Review history", icon: "clock" },
];

export default function ReviewerApp({ user, onLogout, onSwitch }) {
  const [page, setPage] = useState("overview");
  const [queueStatus, setQueueStatus] = useState("PENDING");
  const [queueKey, setQueueKey] = useState(0);

  function navigate(id, status) {
    if (id === "queue") {
      setQueueStatus(status || "PENDING");
      setQueueKey((key) => key + 1); // reset the queue to the chosen filter
    }
    setPage(id);
    window.scrollTo({ top: 0 });
  }

  const initial = (user?.email || "R")[0].toUpperCase();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button
          className="brand"
          onClick={() => navigate("overview")}
          aria-label="Proovix review desk"
        >
          <span className="brand-mark">p</span>
          <span className="brand-copy">
            <strong>proovix</strong>
            <small>Review desk</small>
          </span>
        </button>

        <div className="sidebar-label">Reviewer</div>

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
            <span className="footer-monogram">{initial}</span>
            <span>
              <strong>Reviewer</strong>
              <small>{user?.email}</small>
            </span>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            Review desk <span>/</span>{" "}
            <strong>{NAV_ITEMS.find((item) => item.id === page)?.label}</strong>
          </div>

          <div className="topbar-right">
            <div className="user-avatar" aria-hidden="true">
              {initial}
            </div>

            {onSwitch && (
              <button
                className="button button-secondary"
                type="button"
                onClick={onSwitch}
              >
                Candidate dashboard
              </button>
            )}

            <button
              className="button button-secondary"
              type="button"
              onClick={onLogout}
            >
              Sign out
            </button>
          </div>
        </header>

        <div className="page-content">
          {page === "overview" && (
            <ReviewerOverview onNavigate={navigate} onSessionExpired={onLogout} />
          )}
          {page === "queue" && (
            <ReviewQueue
              key={queueKey}
              initialStatus={queueStatus}
              onSessionExpired={onLogout}
            />
          )}
          {page === "history" && <ReviewHistory onSessionExpired={onLogout} />}

          <footer className="page-footer">
            <span>Proovix</span>
          </footer>
        </div>
      </main>
    </div>
  );
}