import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  adminApprovePost,
  adminDeleteReportedPost,
  adminRejectPost,
  getAdminPendingPosts,
  getAdminReportedPosts,
  getAdminStats,
  getAdminUsers,
} from "../services/socialService";
import { getErrorMessage } from "../utils/errorMessage";
import type {
  AdminPendingPostItem,
  AdminReportedPostItem,
  AdminStats,
  AdminUserItem,
} from "../types/social";

type AdminTab = "users" | "pending" | "reports";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString();
}

function formatReason(reason: string): string {
  return reason
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// eslint-disable-next-line sonarjs/cognitive-complexity
function AdminPanelPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdminTab>("users");

  // Hide scrollbar while on this page
  useEffect(() => {
    document.documentElement.classList.add("hide-scrollbar");
    document.body.classList.add("hide-scrollbar");
    return () => {
      document.documentElement.classList.remove("hide-scrollbar");
      document.body.classList.remove("hide-scrollbar");
    };
  }, []);

  // Dashboard stats
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  // Users tab
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [usersPage, setUsersPage] = useState(0);
  const [usersHasNext, setUsersHasNext] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);

  // Pending posts tab
  const [pendingPosts, setPendingPosts] = useState<AdminPendingPostItem[]>([]);
  const [pendingPage, setPendingPage] = useState(0);
  const [pendingHasNext, setPendingHasNext] = useState(false);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingError, setPendingError] = useState<string | null>(null);
  const [pendingBusy, setPendingBusy] = useState<Set<string>>(new Set());

  // Reports tab
  const [reportedPosts, setReportedPosts] = useState<AdminReportedPostItem[]>([]);
  const [reportsPage, setReportsPage] = useState(0);
  const [reportsHasNext, setReportsHasNext] = useState(false);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState<string | null>(null);
  const [reportsBusy, setReportsBusy] = useState<Set<string>>(new Set());

  // Delete report confirmation dialog
  const [deleteReportTarget, setDeleteReportTarget] = useState<AdminReportedPostItem | null>(null);

  // Toast
  const [toast, setToast] = useState<{ message: string; out: boolean } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToast({ message, out: false });
    toastTimerRef.current = setTimeout(() => {
      setToast((prev) => (prev ? { ...prev, out: true } : null));
      toastTimerRef.current = setTimeout(() => {
        setToast(null);
      }, 500);
    }, 2500);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  // Load stats
  useEffect(() => {
    let active = true;
    const loadStats = async () => {
      setStatsLoading(true);
      setStatsError(null);
      try {
        const data = await getAdminStats();
        if (active) setStats(data);
      } catch (error) {
        if (active) setStatsError(getErrorMessage(error, "Cannot load stats"));
      } finally {
        if (active) setStatsLoading(false);
      }
    };
    void loadStats();
    return () => { active = false; };
  }, []);

  // Load users
  useEffect(() => {
    if (activeTab !== "users") return;
    let active = true;
    const loadUsers = async () => {
      setUsersLoading(true);
      setUsersError(null);
      try {
        const data = await getAdminUsers(0, 20);
        if (active) {
          setUsers(data.items);
          setUsersPage(data.page);
          setUsersHasNext(data.hasNext);
        }
      } catch (error) {
        if (active) setUsersError(getErrorMessage(error, "Cannot load users"));
      } finally {
        if (active) setUsersLoading(false);
      }
    };
    void loadUsers();
    return () => { active = false; };
  }, [activeTab]);

  // Load pending posts
  useEffect(() => {
    if (activeTab !== "pending") return;
    let active = true;
    const loadPending = async () => {
      setPendingLoading(true);
      setPendingError(null);
      try {
        const data = await getAdminPendingPosts(0, 10);
        if (active) {
          setPendingPosts(data.items);
          setPendingPage(data.page);
          setPendingHasNext(data.hasNext);
        }
      } catch (error) {
        if (active) setPendingError(getErrorMessage(error, "Cannot load pending posts"));
      } finally {
        if (active) setPendingLoading(false);
      }
    };
    void loadPending();
    return () => { active = false; };
  }, [activeTab]);

  // Load reports
  useEffect(() => {
    if (activeTab !== "reports") return;
    let active = true;
    const loadReports = async () => {
      setReportsLoading(true);
      setReportsError(null);
      try {
        const data = await getAdminReportedPosts(0, 10);
        if (active) {
          setReportedPosts(data.items);
          setReportsPage(data.page);
          setReportsHasNext(data.hasNext);
        }
      } catch (error) {
        if (active) setReportsError(getErrorMessage(error, "Cannot load reports"));
      } finally {
        if (active) setReportsLoading(false);
      }
    };
    void loadReports();
    return () => { active = false; };
  }, [activeTab]);

  const loadMoreUsers = async () => {
    if (usersLoading || !usersHasNext) return;
    setUsersLoading(true);
    try {
      const data = await getAdminUsers(usersPage + 1, 20);
      setUsers((prev) => [...prev, ...data.items]);
      setUsersPage(data.page);
      setUsersHasNext(data.hasNext);
    } catch (error) {
      setUsersError(getErrorMessage(error, "Cannot load more users"));
    } finally {
      setUsersLoading(false);
    }
  };

  const loadMorePending = async () => {
    if (pendingLoading || !pendingHasNext) return;
    setPendingLoading(true);
    try {
      const data = await getAdminPendingPosts(pendingPage + 1, 10);
      setPendingPosts((prev) => [...prev, ...data.items]);
      setPendingPage(data.page);
      setPendingHasNext(data.hasNext);
    } catch (error) {
      setPendingError(getErrorMessage(error, "Cannot load more pending posts"));
    } finally {
      setPendingLoading(false);
    }
  };

  const loadMoreReports = async () => {
    if (reportsLoading || !reportsHasNext) return;
    setReportsLoading(true);
    try {
      const data = await getAdminReportedPosts(reportsPage + 1, 10);
      setReportedPosts((prev) => [...prev, ...data.items]);
      setReportsPage(data.page);
      setReportsHasNext(data.hasNext);
    } catch (error) {
      setReportsError(getErrorMessage(error, "Cannot load more reports"));
    } finally {
      setReportsLoading(false);
    }
  };

  const handleApprove = async (postId: string) => {
    if (pendingBusy.has(postId)) return;
    setPendingBusy((prev) => new Set(prev).add(postId));
    try {
      await adminApprovePost(postId);
      setPendingPosts((prev) => prev.filter((p) => p.postId !== postId));
      showToast("Post approved successfully.");
    } catch (error) {
      setPendingError(getErrorMessage(error, "Cannot approve post"));
    } finally {
      setPendingBusy((prev) => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
    }
  };

  const handleReject = async (postId: string) => {
    if (pendingBusy.has(postId)) return;
    setPendingBusy((prev) => new Set(prev).add(postId));
    try {
      await adminRejectPost(postId);
      setPendingPosts((prev) => prev.filter((p) => p.postId !== postId));
      showToast("Post rejected. The user has been notified.");
    } catch (error) {
      setPendingError(getErrorMessage(error, "Cannot reject post"));
    } finally {
      setPendingBusy((prev) => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
    }
  };

  const handleDeleteReportedPost = async (postId: string) => {
    if (reportsBusy.has(postId)) return;
    setDeleteReportTarget(null);
    setReportsBusy((prev) => new Set(prev).add(postId));
    try {
      await adminDeleteReportedPost(postId);
      setReportedPosts((prev) => prev.filter((p) => p.postId !== postId));
      showToast("Post deleted. The user has been notified.");
    } catch (error) {
      setReportsError(getErrorMessage(error, "Cannot delete post"));
    } finally {
      setReportsBusy((prev) => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
    }
  };

  const statCards = stats
    ? [
        { label: "Total Users", value: stats.totalUsers },
        { label: "New Users (7 days)", value: stats.newUsersLast7Days },
        { label: "Total Posts", value: stats.totalPosts },
        { label: "Total Comments", value: stats.totalComments },
        { label: "Total Likes", value: stats.totalLikes },
        { label: "Total Reports", value: stats.totalReports },
      ]
    : [];

  return (
    <div className="admin-panel">
      <div className="admin-panel__header">
        <h1 className="admin-panel__title">Admin Panel</h1>
      </div>

      {/* Dashboard */}
      <section className="admin-dashboard">
        <h2 className="admin-section-title">Dashboard</h2>
        {statsLoading ? (
          <div className="admin-loading">Loading stats...</div>
        ) : null}
        {!statsLoading && statsError ? (
          <div className="admin-error">{statsError}</div>
        ) : null}
        {!statsLoading && !statsError ? (
          <div className="admin-stat-grid">
            {statCards.map((card) => (
              <div key={card.label} className="admin-stat-card">
                <span className="admin-stat-card__value">{card.value.toLocaleString()}</span>
                <span className="admin-stat-card__label">{card.label}</span>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {/* Tabs */}
      <section className="admin-tabs-section">
        <div className="admin-tabs">
          {(["users", "pending", "reports"] as AdminTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              className={`admin-tab${activeTab === tab ? " admin-tab--active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "users" && "Users"}
              {tab === "pending" && "Pending Posts"}
              {tab === "reports" && "Reports"}
            </button>
          ))}
        </div>

        {/* Users Tab */}
        {activeTab === "users" ? (
          <div className="admin-tab-content">
            {usersError ? <div className="admin-error">{usersError}</div> : null}
            {!usersLoading && users.length === 0 ? (
              <div className="admin-empty">No users found.</div>
            ) : null}
            <div className="admin-user-list">
              {users.map((user) => (
                <button
                  key={user.userId}
                  type="button"
                  className="admin-user-item"
                  onClick={() => navigate(`/${user.username}`)}
                  aria-label={`Go to profile of ${user.displayName || user.username}`}
                >
                  <div className="admin-user-item__avatar">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.displayName || user.username} />
                    ) : (
                      <span>{(user.displayName || user.username || "U").charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="admin-user-item__info">
                    <strong>{user.displayName || user.username}</strong>
                    <span>@{user.username}</span>
                    <span className="admin-user-item__meta">Joined {formatDate(user.createdAt)}</span>
                  </div>
                  {user.role === "ADMIN" ? (
                    <span className="admin-user-item__badge admin-user-item__badge--admin">Admin</span>
                  ) : null}
                </button>
              ))}
            </div>
            {usersLoading ? <div className="admin-loading">Loading...</div> : null}
            {!usersLoading && usersHasNext ? (
              <div className="admin-actions-center">
                <button type="button" className="admin-btn" onClick={() => void loadMoreUsers()}>
                  Load more
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Pending Posts Tab */}
        {activeTab === "pending" ? (
          <div className="admin-tab-content">
            {pendingError ? <div className="admin-error">{pendingError}</div> : null}
            {!pendingLoading && pendingPosts.length === 0 ? (
              <div className="admin-empty">No pending posts.</div>
            ) : null}
            <div className="post-feed">
              {pendingPosts.map((post) => (
                <article key={post.postId} className="post-card">
                  <div className="post-card__head">
                    <Link
                      to={`/${post.username}`}
                      className="post-card__author-link"
                      aria-label={`Open profile for ${post.displayName || post.username}`}
                    >
                      <div className="post-card__author-avatar">
                        {post.avatarUrl ? (
                          <img src={post.avatarUrl} alt={post.displayName || "User"} />
                        ) : (
                          <span>{(post.displayName || "U").charAt(0)}</span>
                        )}
                      </div>
                      <div>
                        <h3>{post.displayName}</h3>
                        <p>@{post.username} • {formatDate(post.createdAt)}</p>
                      </div>
                    </Link>
                  </div>

                  {post.caption ? <p className="post-card__caption">{post.caption}</p> : null}

                  {post.flaggedMatchedAuthorDisplayName ? (
                    <div className="flag-warning">
                      <span className="flag-warning__icon" aria-hidden="true">⚠️ </span>
                      Flagged: may contain stolen/traced artwork from{" "}
                      <span className="flag-warning__name">{post.flaggedMatchedAuthorDisplayName}</span>{"'s "}
                      {post.flaggedMatchedPostId ? (
                        <Link to={`/posts/${post.flaggedMatchedPostId}`} className="flag-warning__link">
                          post
                        </Link>
                      ) : (
                        "post"
                      )}.
                    </div>
                  ) : null}

                  {post.media && post.media.length > 0 ? (
                    <Link
                      to={`/posts/${post.postId}`}
                      className="post-card__media-link"
                      aria-label="Open post detail"
                    >
                      <img
                        className="post-card__image"
                        src={post.media[0].originalUrl}
                        alt={post.caption || "Artwork"}
                        loading="lazy"
                      />
                    </Link>
                  ) : null}

                  {post.tags.length > 0 ? (
                    <div className="post-card__tags">
                      {post.tags.map((tag) => (
                        <span key={`${post.postId}-${tag}`}>#{tag}</span>
                      ))}
                    </div>
                  ) : null}

                  <div className="admin-post-actions">
                    <button
                      type="button"
                      className="admin-btn admin-btn--approve"
                      disabled={pendingBusy.has(post.postId)}
                      onClick={() => void handleApprove(post.postId)}
                    >
                      {pendingBusy.has(post.postId) ? "Processing..." : "Approve"}
                    </button>
                    <button
                      type="button"
                      className="admin-btn admin-btn--reject"
                      disabled={pendingBusy.has(post.postId)}
                      onClick={() => void handleReject(post.postId)}
                    >
                      {pendingBusy.has(post.postId) ? "Processing..." : "Reject"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
            {pendingLoading ? <div className="admin-loading">Loading...</div> : null}
            {!pendingLoading && pendingHasNext ? (
              <div className="admin-actions-center">
                <button type="button" className="admin-btn" onClick={() => void loadMorePending()}>
                  Load more
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Reports Tab */}
        {activeTab === "reports" ? (
          <div className="admin-tab-content">
            {reportsError ? <div className="admin-error">{reportsError}</div> : null}
            {!reportsLoading && reportedPosts.length === 0 ? (
              <div className="admin-empty">No reported posts.</div>
            ) : null}
            <div className="post-feed">
              {reportedPosts.map((post) => (
                <article key={post.postId} className="post-card admin-reported-post">
                  <div className="post-card__head">
                    <Link
                      to={`/${post.username}`}
                      className="post-card__author-link"
                      aria-label={`Open profile for ${post.displayName || post.username}`}
                    >
                      <div className="post-card__author-avatar">
                        {post.avatarUrl ? (
                          <img src={post.avatarUrl} alt={post.displayName || "User"} />
                        ) : (
                          <span>{(post.displayName || "U").charAt(0)}</span>
                        )}
                      </div>
                      <div>
                        <h3>{post.displayName}</h3>
                        <p>@{post.username} • {formatDate(post.createdAt)}</p>
                      </div>
                    </Link>
                    <div className="admin-report-count">
                      <span className="admin-report-badge">{post.reportCount} report{post.reportCount === 1 ? "" : "s"}</span>
                    </div>
                  </div>

                  {post.caption ? <p className="post-card__caption">{post.caption}</p> : null}

                  {post.media && post.media.length > 0 ? (
                    <Link
                      to={`/posts/${post.postId}`}
                      className="post-card__media-link"
                      aria-label="Open post detail"
                    >
                      <img
                        className="post-card__image"
                        src={post.media[0].originalUrl}
                        alt={post.caption || "Artwork"}
                        loading="lazy"
                      />
                    </Link>
                  ) : null}

                  {post.tags.length > 0 ? (
                    <div className="post-card__tags">
                      {post.tags.map((tag) => (
                        <span key={`${post.postId}-${tag}`}>#{tag}</span>
                      ))}
                    </div>
                  ) : null}

                  {/* Reports list */}
                  <div className="admin-reports-list">
                    {post.reports.map((report) => (
                      <div key={report.reportId} className="admin-report-item">
                        <div className="admin-report-item__reporter">
                          <div className="admin-report-item__avatar">
                            {report.reporterAvatarUrl ? (
                              <img src={report.reporterAvatarUrl} alt={report.reporterDisplayName || "Reporter"} />
                            ) : (
                              <span>{(report.reporterDisplayName || report.reporterUsername || "R").charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                          <span>
                            Reported by{" "}
                            <strong>
                              {report.reporterDisplayName || report.reporterUsername || "Unknown"}
                            </strong>
                          </span>
                        </div>
                        {report.reasons.length > 0 ? (
                          <div className="admin-report-item__reasons">
                            {report.reasons.map((reason) => (
                              <span key={reason} className="admin-reason-tag">{formatReason(reason)}</span>
                            ))}
                          </div>
                        ) : null}
                        {report.otherReason ? (
                          <p className="admin-report-item__other">"{report.otherReason}"</p>
                        ) : null}
                      </div>
                    ))}
                  </div>

                  <div className="admin-post-actions">
                    <button
                      type="button"
                      className="admin-btn admin-btn--danger"
                      disabled={reportsBusy.has(post.postId)}
                      onClick={() => setDeleteReportTarget(post)}
                    >
                      {reportsBusy.has(post.postId) ? "Deleting..." : "Delete Post"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
            {reportsLoading ? <div className="admin-loading">Loading...</div> : null}
            {!reportsLoading && reportsHasNext ? (
              <div className="admin-actions-center">
                <button type="button" className="admin-btn" onClick={() => void loadMoreReports()}>
                  Load more
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      {/* Delete confirmation dialog */}
      {deleteReportTarget ? (
        <dialog
          className="admin-dialog-backdrop"
          open
          aria-labelledby="admin-delete-dialog-title"
        >
          <div className="admin-dialog">
            <h3 id="admin-delete-dialog-title">Delete Reported Post?</h3>
            <p>
              This post by <strong>{deleteReportTarget.displayName || deleteReportTarget.username}</strong> has{" "}
              <strong>{deleteReportTarget.reportCount} report{deleteReportTarget.reportCount === 1 ? "" : "s"}</strong>.
              Deleting it will permanently remove the post and notify the owner.
            </p>
            <div className="admin-dialog__actions">
              <button
                type="button"
                className="admin-btn admin-btn--danger"
                onClick={() => void handleDeleteReportedPost(deleteReportTarget.postId)}
              >
                Delete Post
              </button>
              <button
                type="button"
                className="admin-btn"
                onClick={() => setDeleteReportTarget(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </dialog>
      ) : null}

      {/* Toast notification */}
      {toast ? (
        <div
          className={`admin-toast${toast.out ? " admin-toast--out" : ""}`}
          role="status"
          aria-live="polite"
        >
          {toast.message}
        </div>
      ) : null}
    </div>
  );
}

export default AdminPanelPage;
