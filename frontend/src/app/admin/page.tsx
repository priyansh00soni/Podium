"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useToast } from "@/components/Toast";
import { Skeleton } from "@/components/Skeleton";
import {
  getPlatformMe,
  getAdminSignInUrl,
  getAdminContests,
  getAdminContestDetail,
  createAdminContest,
  updateAdminContest,
  addAdminAllowedEmails,
  removeAdminAllowedEmail,
  assignAdminModerator,
  removeAdminModerator,
  getAdminStats,
  PlatformUser,
  AdminContestSummary,
  AdminContestDetail,
  AdminStats,
  ApiRequestError,
} from "@/lib/api";

type Tab = "contests" | "whitelist" | "moderators" | "health";

export default function SuperAdminPage() {
  const { showToast } = useToast();
  const [user, setUser] = useState<PlatformUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("contests");

  // Contests State
  const [contests, setContests] = useState<AdminContestSummary[]>([]);
  const [contestsLoading, setContestsLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newStartsAt, setNewStartsAt] = useState("");
  const [newEndsAt, setNewEndsAt] = useState("");
  const [newPublishBoard, setNewPublishBoard] = useState(false);
  const [creatingContest, setCreatingContest] = useState(false);

  // Edit Contest Modal State
  const [editingContest, setEditingContest] = useState<AdminContestSummary | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editEndsAt, setEditEndsAt] = useState("");
  const [editPublishBoard, setEditPublishBoard] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  // Selected Contest for Whitelist & Moderators tabs
  const [selectedContestId, setSelectedContestId] = useState<string>("");
  const [contestDetail, setContestDetail] = useState<AdminContestDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Whitelist input state
  const [emailInput, setEmailInput] = useState("");
  const [whitelistSearch, setWhitelistSearch] = useState("");
  const [addingEmails, setAddingEmails] = useState(false);

  // Moderator input state
  const [modEmailInput, setModEmailInput] = useState("");
  const [assigningMod, setAssigningMod] = useState(false);

  // Stats State
  const [stats, setStats] = useState<AdminStats | null>(null);

  // Check auth on mount
  useEffect(() => {
    getPlatformMe()
      .then((res) => {
        setUser(res);
        setAuthLoading(false);
      })
      .catch(() => {
        setUser(null);
        setAuthLoading(false);
      });
  }, []);

  // Load contests when admin is authenticated
  const loadContests = async () => {
    setContestsLoading(true);
    try {
      const list = await getAdminContests();
      setContests(list);
      if (list.length > 0 && !selectedContestId) {
        setSelectedContestId(list[0].id);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not load contests", "error");
    } finally {
      setContestsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await getAdminStats();
      setStats(res);
    } catch {
      // Ignored
    }
  };

  useEffect(() => {
    if (user?.platformRole === "admin") {
      loadContests();
      loadStats();
    }
  }, [user]);

  // Load contest detail when selectedContestId changes
  const loadContestDetail = async (id: string) => {
    if (!id) return;
    setDetailLoading(true);
    try {
      const detail = await getAdminContestDetail(id);
      setContestDetail(detail);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not load contest detail", "error");
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (selectedContestId && (activeTab === "whitelist" || activeTab === "moderators")) {
      loadContestDetail(selectedContestId);
    }
  }, [selectedContestId, activeTab]);

  // Title -> Slug auto generator
  const handleTitleChange = (val: string) => {
    setNewTitle(val);
    const derived = val
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    setNewSlug(derived);
  };

  // Create Contest Submit
  const handleCreateContest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSlug || !newTitle || !newStartsAt || !newEndsAt) {
      showToast("Please fill in all required fields.", "error");
      return;
    }

    setCreatingContest(true);
    try {
      const created = await createAdminContest({
        slug: newSlug.trim().toLowerCase(),
        title: newTitle.trim(),
        description: newDesc.trim() || undefined,
        startsAt: new Date(newStartsAt).toISOString(),
        endsAt: new Date(newEndsAt).toISOString(),
        leaderboardPublished: newPublishBoard,
      });

      showToast(`Contest '${created.title}' created successfully!`, "success");
      setShowCreateModal(false);
      setNewTitle("");
      setNewSlug("");
      setNewDesc("");
      setNewStartsAt("");
      setNewEndsAt("");
      loadContests();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not create contest", "error");
    } finally {
      setCreatingContest(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (c: AdminContestSummary) => {
    setEditingContest(c);
    setEditTitle(c.title);
    setEditDesc(c.description || "");
    // Format to YYYY-MM-DDTHH:mm for datetime-local input
    const endStr = new Date(c.endsAt).toISOString().slice(0, 16);
    setEditEndsAt(endStr);
    setEditPublishBoard(c.leaderboardPublished);
  };

  // Save Edit Contest
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContest) return;

    setSavingEdit(true);
    try {
      await updateAdminContest(editingContest.id, {
        title: editTitle.trim(),
        description: editDesc.trim() || undefined,
        endsAt: new Date(editEndsAt).toISOString(),
        leaderboardPublished: editPublishBoard,
      });

      showToast("Contest updated successfully!", "success");
      setEditingContest(null);
      loadContests();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update contest", "error");
    } finally {
      setSavingEdit(false);
    }
  };

  // Add Allowed Emails
  const handleAddEmails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContestId || !emailInput.trim()) return;

    const rawList = emailInput
      .split(/[\n,;\s]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && s.includes("@"));

    if (rawList.length === 0) {
      showToast("No valid email addresses found.", "error");
      return;
    }

    setAddingEmails(true);
    try {
      const res = await addAdminAllowedEmails(selectedContestId, rawList);
      showToast(`Added ${res.added} allowed email(s).`, "success");
      setEmailInput("");
      loadContestDetail(selectedContestId);
      loadContests();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to add emails", "error");
    } finally {
      setAddingEmails(false);
    }
  };

  // Remove Allowed Email
  const handleRemoveEmail = async (email: string) => {
    if (!selectedContestId) return;
    if (!confirm(`Revoke access for ${email}? This immediately terminates their active session.`)) {
      return;
    }

    try {
      await removeAdminAllowedEmail(selectedContestId, email);
      showToast(`Access revoked for ${email}.`, "info");
      loadContestDetail(selectedContestId);
      loadContests();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not remove email", "error");
    }
  };

  // Assign Moderator
  const handleAssignModerator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContestId || !modEmailInput.trim()) return;

    setAssigningMod(true);
    try {
      await assignAdminModerator(selectedContestId, modEmailInput.trim());
      showToast(`Assigned ${modEmailInput} as contest moderator.`, "success");
      setModEmailInput("");
      loadContestDetail(selectedContestId);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not assign moderator", "error");
    } finally {
      setAssigningMod(false);
    }
  };

  // Revoke Moderator
  const handleRemoveModerator = async (userId: string, name: string) => {
    if (!selectedContestId) return;
    if (!confirm(`Revoke moderator role for ${name}?`)) return;

    try {
      await removeAdminModerator(selectedContestId, userId);
      showToast(`Moderator role revoked for ${name}.`, "info");
      loadContestDetail(selectedContestId);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not remove moderator", "error");
    }
  };

  // 1. Loading screen
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] text-[#ededf0] p-6 max-w-5xl mx-auto space-y-6">
        <div className="h-10 w-48 bg-[#17171a] rounded animate-pulse" />
        <div className="h-64 bg-[#111113] border border-[#26262b] rounded-lg animate-pulse" />
      </div>
    );
  }

  // 2. Access Denied / Sign In Prompt
  if (!user || user.platformRole !== "admin") {
    return (
      <div className="min-h-screen bg-[#0a0a0b] text-[#ededf0] flex flex-col justify-center items-center p-6">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="w-12 h-12 rounded-full bg-[#6D4AFF]/20 text-[#a78bfa] border border-[#6D4AFF]/40 flex items-center justify-center mx-auto text-xl font-mono">
            ⚡
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold tracking-tight text-[#ededf0]">
              Super Admin Console
            </h1>
            <p className="text-xs text-[#8b8b94] leading-relaxed">
              Platform administrator privileges required. You must sign in with a verified Super Admin account.
            </p>
          </div>

          <Card className="space-y-4">
            <Button
              href={getAdminSignInUrl()}
              variant="primary"
              size="md"
              className="w-full justify-center"
            >
              Sign In with Google (Admin)
            </Button>
            <div className="text-[11px] text-[#5a5a63] font-mono">
              Note: &apos;platformRole = admin&apos; must be set in PostgreSQL on the users table.
            </div>
          </Card>

          <Link
            href="/contests"
            className="text-xs text-[#8b8b94] hover:text-[#ededf0] inline-block font-mono"
          >
            ← Return to Contest Hub
          </Link>
        </div>
      </div>
    );
  }

  // 3. Authenticated Admin View
  return (
    <div className="min-h-screen bg-[#0a0a0b] text-[#ededf0]">
      {/* Super Admin Top Header */}
      <header className="border-b border-[#26262b] bg-[#111113]/80 backdrop-blur sticky top-0 z-20 px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="text-sm font-bold tracking-tight text-[#ededf0] flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-[#6D4AFF] animate-pulse" />
              <span>Podium Super Admin</span>
            </Link>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#6D4AFF]/20 text-[#a78bfa] border border-[#6D4AFF]/40">
              Platform Owner
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="text-[#8b8b94] hidden sm:inline font-mono">
              {user.email}
            </span>
            <Link
              href="/contests"
              className="px-2.5 py-1 rounded bg-[#17171a] border border-[#26262b] text-[#8b8b94] hover:text-[#ededf0] transition-colors font-mono"
            >
              Contest Hub →
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-[#26262b] pb-3 overflow-x-auto text-xs font-mono">
          <button
            type="button"
            onClick={() => setActiveTab("contests")}
            className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-2 ${
              activeTab === "contests"
                ? "bg-[#6D4AFF] text-white font-medium"
                : "bg-[#111113] text-[#8b8b94] hover:text-[#ededf0] border border-[#26262b]"
            }`}
          >
            <span>Contest Studio</span>
            <span className="text-[10px] bg-black/30 px-1.5 py-0.2 rounded-full">
              {contests.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("whitelist")}
            className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-2 ${
              activeTab === "whitelist"
                ? "bg-[#6D4AFF] text-white font-medium"
                : "bg-[#111113] text-[#8b8b94] hover:text-[#ededf0] border border-[#26262b]"
            }`}
          >
            <span>Student Whitelist</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("moderators")}
            className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-2 ${
              activeTab === "moderators"
                ? "bg-[#6D4AFF] text-white font-medium"
                : "bg-[#111113] text-[#8b8b94] hover:text-[#ededf0] border border-[#26262b]"
            }`}
          >
            <span>Staff &amp; Moderators</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("health");
              loadStats();
            }}
            className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-2 ${
              activeTab === "health"
                ? "bg-[#6D4AFF] text-white font-medium"
                : "bg-[#111113] text-[#8b8b94] hover:text-[#ededf0] border border-[#26262b]"
            }`}
          >
            <span>System Health</span>
          </button>
        </div>

        {/* ================= TAB 1: CONTEST STUDIO ================= */}
        {activeTab === "contests" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-[#ededf0]">
                  Contest Studio
                </h2>
                <p className="text-xs text-[#8b8b94]">
                  Create new contests, extend time limits, and toggle leaderboard publishing without touching SQL.
                </p>
              </div>

              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setShowCreateModal(true)}
              >
                + Create Contest
              </Button>
            </div>

            {/* Contests List */}
            {contestsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : contests.length === 0 ? (
              <Card className="py-12 text-center space-y-3">
                <p className="text-sm text-[#8b8b94]">No contests created yet.</p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowCreateModal(true)}
                >
                  Create your first contest
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {contests.map((c) => {
                  const now = Date.now();
                  const startMs = new Date(c.startsAt).getTime();
                  const endMs = new Date(c.endsAt).getTime();
                  const isLive = now >= startMs && now < endMs;
                  const isUpcoming = now < startMs;
                  const isEnded = now >= endMs;

                  return (
                    <Card
                      key={c.id}
                      className="p-4 border-[#26262b] bg-[#111113] flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="font-semibold text-sm text-[#ededf0]">
                            {c.title}
                          </span>
                          <span className="font-mono text-xs text-[#a78bfa] bg-[#6D4AFF]/10 px-2 py-0.5 rounded border border-[#6D4AFF]/20">
                            /c/{c.slug}
                          </span>

                          {isLive && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              ● Live Now
                            </span>
                          )}
                          {isUpcoming && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              Upcoming
                            </span>
                          )}
                          {isEnded && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-[#26262b] text-[#8b8b94]">
                              Ended
                            </span>
                          )}

                          {c.leaderboardPublished ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono text-emerald-400 bg-emerald-500/10">
                              Board Published
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono text-[#8b8b94] bg-white/5">
                              Board Hidden
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-[#8b8b94] font-mono flex items-center gap-4 flex-wrap">
                          <span>
                            {new Date(c.startsAt).toLocaleString()} → {new Date(c.endsAt).toLocaleString()}
                          </span>
                          <span>· {c._count.problems} Problems</span>
                          <span>· {c._count.participants} Participants</span>
                          <span>· {c._count.submissions} Submissions</span>
                          <span>· {c._count.allowedEmails} Whitelisted</span>
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(c)}
                        >
                          Edit / Extend
                        </Button>
                        <Button
                          href={`/c/${encodeURIComponent(c.slug)}/moderator/problems`}
                          variant="secondary"
                          size="sm"
                        >
                          Moderator Portal
                        </Button>
                        <Button
                          href={`/c/${encodeURIComponent(c.slug)}`}
                          variant="ghost"
                          size="sm"
                        >
                          View →
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* CREATE CONTEST MODAL */}
            {showCreateModal && (
              <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <Card className="w-full max-w-lg bg-[#17171a] border-[#26262b] space-y-4">
                  <div className="flex items-center justify-between border-b border-[#26262b] pb-3">
                    <h3 className="text-sm font-semibold text-[#ededf0]">
                      Create New Contest
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="text-xs text-[#8b8b94] hover:text-[#ededf0]"
                    >
                      ✕
                    </button>
                  </div>

                  <form onSubmit={handleCreateContest} className="space-y-4 text-xs">
                    <label className="space-y-1 block">
                      <span className="text-[#8b8b94] font-mono uppercase">Contest Title</span>
                      <input
                        required
                        value={newTitle}
                        placeholder="e.g. Winter Clash 2026"
                        onChange={(e) => handleTitleChange(e.target.value)}
                        className="w-full bg-[#0a0a0b] border border-[#26262b] rounded-md px-3 py-2 text-sm text-[#ededf0] focus:ring-1 focus:ring-[#6D4AFF] focus:outline-none"
                      />
                    </label>

                    <label className="space-y-1 block">
                      <span className="text-[#8b8b94] font-mono uppercase">Contest Slug (URL)</span>
                      <input
                        required
                        value={newSlug}
                        placeholder="e.g. winter-clash-2026"
                        onChange={(e) => setNewSlug(e.target.value)}
                        className="w-full bg-[#0a0a0b] border border-[#26262b] rounded-md px-3 py-2 font-mono text-xs text-[#a78bfa] focus:ring-1 focus:ring-[#6D4AFF] focus:outline-none"
                      />
                    </label>

                    <label className="space-y-1 block">
                      <span className="text-[#8b8b94] font-mono uppercase">Description (Optional)</span>
                      <textarea
                        rows={2}
                        value={newDesc}
                        placeholder="Short overview of the event, rules, or prizes..."
                        onChange={(e) => setNewDesc(e.target.value)}
                        className="w-full bg-[#0a0a0b] border border-[#26262b] rounded-md px-3 py-2 text-xs text-[#ededf0] focus:ring-1 focus:ring-[#6D4AFF] focus:outline-none"
                      />
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className="space-y-1 block">
                        <span className="text-[#8b8b94] font-mono uppercase">Start Date &amp; Time</span>
                        <input
                          required
                          type="datetime-local"
                          value={newStartsAt}
                          onChange={(e) => setNewStartsAt(e.target.value)}
                          className="w-full bg-[#0a0a0b] border border-[#26262b] rounded-md px-3 py-2 text-xs font-mono text-[#ededf0] focus:ring-1 focus:ring-[#6D4AFF] focus:outline-none"
                        />
                      </label>
                      <label className="space-y-1 block">
                        <span className="text-[#8b8b94] font-mono uppercase">End Date &amp; Time</span>
                        <input
                          required
                          type="datetime-local"
                          value={newEndsAt}
                          onChange={(e) => setNewEndsAt(e.target.value)}
                          className="w-full bg-[#0a0a0b] border border-[#26262b] rounded-md px-3 py-2 text-xs font-mono text-[#ededf0] focus:ring-1 focus:ring-[#6D4AFF] focus:outline-none"
                        />
                      </label>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer select-none pt-1">
                      <input
                        type="checkbox"
                        checked={newPublishBoard}
                        onChange={(e) => setNewPublishBoard(e.target.checked)}
                        className="rounded border-[#26262b] bg-[#0a0a0b] text-[#6D4AFF]"
                      />
                      <span className="text-[#8b8b94]">
                        Publish Leaderboard Immediately
                      </span>
                    </label>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#26262b]">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowCreateModal(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        loading={creatingContest}
                      >
                        Create Contest
                      </Button>
                    </div>
                  </form>
                </Card>
              </div>
            )}

            {/* EDIT CONTEST MODAL */}
            {editingContest && (
              <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <Card className="w-full max-w-lg bg-[#17171a] border-[#26262b] space-y-4">
                  <div className="flex items-center justify-between border-b border-[#26262b] pb-3">
                    <h3 className="text-sm font-semibold text-[#ededf0]">
                      Edit Contest: {editingContest.title}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setEditingContest(null)}
                      className="text-xs text-[#8b8b94] hover:text-[#ededf0]"
                    >
                      ✕
                    </button>
                  </div>

                  <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
                    <label className="space-y-1 block">
                      <span className="text-[#8b8b94] font-mono uppercase">Title</span>
                      <input
                        required
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full bg-[#0a0a0b] border border-[#26262b] rounded-md px-3 py-2 text-sm text-[#ededf0] focus:ring-1 focus:ring-[#6D4AFF] focus:outline-none"
                      />
                    </label>

                    <label className="space-y-1 block">
                      <span className="text-[#8b8b94] font-mono uppercase">Extend End Time</span>
                      <input
                        required
                        type="datetime-local"
                        value={editEndsAt}
                        onChange={(e) => setEditEndsAt(e.target.value)}
                        className="w-full bg-[#0a0a0b] border border-[#26262b] rounded-md px-3 py-2 text-xs font-mono text-[#ededf0] focus:ring-1 focus:ring-[#6D4AFF] focus:outline-none"
                      />
                      <span className="text-[10px] text-[#5a5a63] block">
                        Guardrail: Live contest duration can only be extended.
                      </span>
                    </label>

                    <label className="space-y-1 block">
                      <span className="text-[#8b8b94] font-mono uppercase">Description</span>
                      <textarea
                        rows={2}
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        className="w-full bg-[#0a0a0b] border border-[#26262b] rounded-md px-3 py-2 text-xs text-[#ededf0] focus:ring-1 focus:ring-[#6D4AFF] focus:outline-none"
                      />
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer select-none pt-1">
                      <input
                        type="checkbox"
                        checked={editPublishBoard}
                        onChange={(e) => setEditPublishBoard(e.target.checked)}
                        className="rounded border-[#26262b] bg-[#0a0a0b] text-[#6D4AFF]"
                      />
                      <span className="text-[#8b8b94]">
                        Leaderboard Published (Visible to Contestants)
                      </span>
                    </label>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#26262b]">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingContest(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        loading={savingEdit}
                      >
                        Save Changes
                      </Button>
                    </div>
                  </form>
                </Card>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 2: STUDENT WHITELIST ================= */}
        {activeTab === "whitelist" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-[#ededf0]">
                  Student Whitelist Manager
                </h2>
                <p className="text-xs text-[#8b8b94]">
                  Batch whitelist student emails. Only whitelisted users can register and submit solutions.
                </p>
              </div>

              {/* Contest Selector */}
              <select
                value={selectedContestId}
                onChange={(e) => setSelectedContestId(e.target.value)}
                className="bg-[#111113] border border-[#26262b] rounded-md px-3 py-1.5 text-xs font-mono text-[#ededf0] focus:outline-none focus:ring-1 focus:ring-[#6D4AFF]"
              >
                {contests.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} (/c/{c.slug})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Batch Upload / Paste Card (1/3) */}
              <Card className="space-y-4">
                <span className="text-xs font-mono uppercase text-[#ededf0] font-medium block">
                  Add Allowed Emails
                </span>
                <p className="text-[11px] text-[#8b8b94] leading-relaxed">
                  Paste emails separated by commas, newlines, or spaces. Duplicates are skipped automatically.
                </p>

                <form onSubmit={handleAddEmails} className="space-y-3">
                  <textarea
                    rows={8}
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="student1@university.edu&#10;student2@university.edu&#10;student3@university.edu"
                    className="w-full bg-[#0a0a0b] border border-[#26262b] rounded-md p-2.5 text-xs font-mono text-[#ededf0] focus:ring-1 focus:ring-[#6D4AFF] focus:outline-none"
                  />

                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    loading={addingEmails}
                    className="w-full justify-center"
                  >
                    + Add to Whitelist
                  </Button>
                </form>
              </Card>

              {/* Whitelist Roster (2/3) */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-mono text-[#8b8b94]">
                    Total Whitelisted:{" "}
                    <strong className="text-[#ededf0]">
                      {contestDetail?.allowedEmails.length || 0}
                    </strong>
                  </span>

                  <input
                    type="text"
                    value={whitelistSearch}
                    onChange={(e) => setWhitelistSearch(e.target.value)}
                    placeholder="Search email..."
                    className="bg-[#111113] border border-[#26262b] rounded-md px-2.5 py-1 text-xs text-[#ededf0] font-mono focus:outline-none"
                  />
                </div>

                {detailLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : !contestDetail || contestDetail.allowedEmails.length === 0 ? (
                  <Card className="py-12 text-center text-xs text-[#8b8b94]">
                    No students on the whitelist yet. Paste emails on the left to add.
                  </Card>
                ) : (
                  <Card className="p-0 overflow-hidden border-[#26262b]">
                    <div className="max-h-96 overflow-y-auto divide-y divide-[#26262b]">
                      {contestDetail.allowedEmails
                        .filter((item) =>
                          item.email.toLowerCase().includes(whitelistSearch.toLowerCase())
                        )
                        .map((item) => (
                          <div
                            key={item.email}
                            className="px-4 py-2.5 flex items-center justify-between text-xs hover:bg-white/[0.02]"
                          >
                            <span className="font-mono text-[#ededf0]">
                              {item.email}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveEmail(item.email)}
                              className="text-rose-400 hover:text-rose-300 font-mono text-[11px]"
                            >
                              Revoke
                            </button>
                          </div>
                        ))}
                    </div>
                  </Card>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 3: STAFF & MODERATORS ================= */}
        {activeTab === "moderators" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-[#ededf0]">
                  Staff &amp; Moderator Delegation
                </h2>
                <p className="text-xs text-[#8b8b94]">
                  Assign teaching assistants or problem setters to author problems for this contest.
                </p>
              </div>

              {/* Contest Selector */}
              <select
                value={selectedContestId}
                onChange={(e) => setSelectedContestId(e.target.value)}
                className="bg-[#111113] border border-[#26262b] rounded-md px-3 py-1.5 text-xs font-mono text-[#ededf0] focus:outline-none focus:ring-1 focus:ring-[#6D4AFF]"
              >
                {contests.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} (/c/{c.slug})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Appoint Moderator Card (1/3) */}
              <Card className="space-y-4">
                <span className="text-xs font-mono uppercase text-[#ededf0] font-medium block">
                  Appoint Moderator
                </span>
                <p className="text-[11px] text-[#8b8b94] leading-relaxed">
                  Enter the user&apos;s email. They will receive access to the Moderator Problem Portal for this contest.
                </p>

                <form onSubmit={handleAssignModerator} className="space-y-3">
                  <input
                    type="email"
                    required
                    value={modEmailInput}
                    onChange={(e) => setModEmailInput(e.target.value)}
                    placeholder="moderator@university.edu"
                    className="w-full bg-[#0a0a0b] border border-[#26262b] rounded-md px-3 py-2 text-xs font-mono text-[#ededf0] focus:ring-1 focus:ring-[#6D4AFF] focus:outline-none"
                  />

                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    loading={assigningMod}
                    className="w-full justify-center"
                  >
                    + Assign Moderator Role
                  </Button>
                </form>
              </Card>

              {/* Moderator Roster (2/3) */}
              <div className="lg:col-span-2 space-y-4">
                <span className="text-xs font-mono text-[#8b8b94] block">
                  Active Moderators for this Contest (
                  {contestDetail?.participants.length || 0})
                </span>

                {detailLoading ? (
                  <Skeleton className="h-48 w-full" />
                ) : !contestDetail || contestDetail.participants.length === 0 ? (
                  <Card className="py-12 text-center text-xs text-[#8b8b94]">
                    No moderators assigned to this contest yet.
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {contestDetail.participants.map((m) => (
                      <Card
                        key={m.id}
                        className="p-3 flex items-center justify-between text-xs border-[#26262b] bg-[#111113]"
                      >
                        <div className="space-y-0.5">
                          <span className="font-semibold text-[#ededf0] block">
                            {m.user.name}
                          </span>
                          <span className="text-[11px] font-mono text-[#8b8b94]">
                            {m.user.email}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#6D4AFF]/10 text-[#a78bfa] border border-[#6D4AFF]/20">
                            Moderator
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveModerator(m.user.id, m.user.name)}
                            className="text-rose-400 hover:text-rose-300 font-mono text-[11px]"
                          >
                            Revoke
                          </button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 4: SYSTEM HEALTH ================= */}
        {activeTab === "health" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-[#ededf0]">
                Platform Health &amp; Queue Status
              </h2>
              <p className="text-xs text-[#8b8b94]">
                Real-time operational metrics across the Judge0 execution cluster and database.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="space-y-1 p-4">
                <span className="text-[11px] font-mono uppercase text-[#8b8b94]">
                  Total Contests
                </span>
                <div className="text-2xl font-bold font-mono text-[#ededf0]">
                  {stats?.totalContests ?? "—"}
                </div>
              </Card>

              <Card className="space-y-1 p-4">
                <span className="text-[11px] font-mono uppercase text-[#8b8b94]">
                  Registered Users
                </span>
                <div className="text-2xl font-bold font-mono text-[#ededf0]">
                  {stats?.totalUsers ?? "—"}
                </div>
              </Card>

              <Card className="space-y-1 p-4">
                <span className="text-[11px] font-mono uppercase text-[#8b8b94]">
                  Total Submissions
                </span>
                <div className="text-2xl font-bold font-mono text-[#ededf0]">
                  {stats?.totalSubmissions ?? "—"}
                </div>
              </Card>

              <Card className="space-y-1 p-4">
                <span className="text-[11px] font-mono uppercase text-[#8b8b94]">
                  Pending Judge Queue
                </span>
                <div className="text-2xl font-bold font-mono text-emerald-400">
                  {stats?.pendingQueue ?? 0}
                </div>
              </Card>
            </div>

            <Card className="p-4 space-y-3 border-[#26262b] bg-[#111113]">
              <span className="text-xs font-mono uppercase tracking-wider text-[#8b8b94] block">
                Infrastructure Check
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                <div className="p-2.5 rounded bg-[#0a0a0b] border border-[#26262b] flex items-center justify-between">
                  <span>PostgreSQL Database</span>
                  <span className="text-emerald-400">● Connected</span>
                </div>
                <div className="p-2.5 rounded bg-[#0a0a0b] border border-[#26262b] flex items-center justify-between">
                  <span>Judge0 Background Worker</span>
                  <span className="text-emerald-400">● Active</span>
                </div>
                <div className="p-2.5 rounded bg-[#0a0a0b] border border-[#26262b] flex items-center justify-between">
                  <span>Multi-Contest Cookies</span>
                  <span className="text-emerald-400">● Isolated</span>
                </div>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
