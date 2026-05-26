"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BarChart3, Copy, LogOut, Pencil, Plus, Trash2 } from "lucide-react";
import type { Poll } from "@/types/poll.type";
import { formatDate } from "@/lib/format";
import { AdminLoginPanel } from "./AdminLoginPanel";

export function AdminDashboard() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPolls = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const response = await fetch("/api/admin/polls", {
      cache: "no-store",
    });
    const data = await response.json().catch(() => null);

    setIsLoading(false);

    if (response.status === 401) {
      setNeedsAuth(true);
      return;
    }

    if (!response.ok) {
      setError(data?.message ?? "Không thể tải danh sách poll");
      return;
    }

    setNeedsAuth(false);
    setPolls(data.polls ?? []);
  }, []);

  useEffect(() => {
    void loadPolls();
  }, [loadPolls]);

  async function handleLogout() {
    await fetch("/api/admin/auth", { method: "DELETE" });
    setNeedsAuth(true);
    setPolls([]);
  }

  async function handleDelete(poll: Poll) {
    const ok = window.confirm(`Xóa poll "${poll.title}"?`);

    if (!ok) {
      return;
    }

    const response = await fetch(`/api/admin/polls/${poll.id}`, {
      method: "DELETE",
    });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      setError(data?.message ?? "Không thể xóa poll");
      return;
    }

    setPolls((current) => current.filter((item) => item.id !== poll.id));
  }

  async function copyVoteLink(slug: string) {
    const origin = window.location.origin;
    await navigator.clipboard.writeText(`${origin}/vote/${slug}`);
  }

  if (needsAuth) {
    return <AdminLoginPanel onSuccess={loadPolls} />;
  }

  return (
    <main className="pageShell">
      <section className="adminHeader">
        <div>
          <p className="eyebrow">Mini Vote</p>
          <h1>Poll admin</h1>
        </div>

        <div className="toolbar">
          <Link className="primaryButton" href="/admin/polls/new">
            <Plus aria-hidden="true" size={18} />
            Tạo poll
          </Link>
          <button className="iconButton" title="Đăng xuất" type="button" onClick={handleLogout}>
            <LogOut aria-hidden="true" size={18} />
          </button>
        </div>
      </section>

      {error ? <p className="alert error">{error}</p> : null}

      <section className="panel">
        {isLoading ? <p className="muted">Đang tải poll</p> : null}

        {!isLoading && polls.length === 0 ? (
          <div className="emptyState">
            <h2>Chưa có poll</h2>
            <Link className="primaryButton" href="/admin/polls/new">
              <Plus aria-hidden="true" size={18} />
              Tạo poll đầu tiên
            </Link>
          </div>
        ) : null}

        {polls.length > 0 ? (
          <div className="adminTable" role="list">
            {polls.map((poll) => (
              <article className="adminRow" key={poll.id} role="listitem">
                <div className="adminRowMain">
                  <div>
                    <h2>{poll.title}</h2>
                    <p>
                      /vote/{poll.slug} · {formatDate(poll.createdAt)}
                    </p>
                  </div>
                  <span className={`statusPill ${poll.status}`}>{poll.status}</span>
                </div>

                <div className="rowActions">
                  <button
                    className="iconButton"
                    title="Copy link vote"
                    type="button"
                    onClick={() => void copyVoteLink(poll.slug)}
                  >
                    <Copy aria-hidden="true" size={18} />
                  </button>
                  <Link
                    className="iconButton"
                    href={`/admin/polls/${poll.id}/result`}
                    title="Xem kết quả"
                  >
                    <BarChart3 aria-hidden="true" size={18} />
                  </Link>
                  <Link
                    className="iconButton"
                    href={`/admin/polls/${poll.id}/edit`}
                    title="Sửa poll"
                  >
                    <Pencil aria-hidden="true" size={18} />
                  </Link>
                  <button
                    className="iconButton danger"
                    title="Xóa poll"
                    type="button"
                    onClick={() => void handleDelete(poll)}
                  >
                    <Trash2 aria-hidden="true" size={18} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}
