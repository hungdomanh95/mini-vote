"use client";

import { FormEvent, useState } from "react";
import { LockKeyhole } from "lucide-react";

type AdminLoginPanelProps = {
  onSuccess: () => void;
};

export function AdminLoginPanel({ onSuccess }: AdminLoginPanelProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const response = await fetch("/api/admin/auth", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password }),
    });
    const data = await response.json().catch(() => null);

    setIsSubmitting(false);

    if (!response.ok) {
      setError(data?.message ?? "Không thể đăng nhập");
      return;
    }

    setPassword("");
    onSuccess();
  }

  return (
    <main className="pageShell compactPage">
      <section className="panel narrowPanel">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">Admin</p>
            <h1>Đăng nhập</h1>
          </div>
          <LockKeyhole aria-hidden="true" className="headerIcon" />
        </div>

        <form className="stack" onSubmit={handleSubmit}>
          <label className="field">
            <span>Mật khẩu</span>
            <input
              autoComplete="current-password"
              name="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {error ? <p className="alert error">{error}</p> : null}

          <button className="primaryButton" disabled={isSubmitting} type="submit">
            <LockKeyhole aria-hidden="true" size={18} />
            {isSubmitting ? "Đang đăng nhập" : "Đăng nhập"}
          </button>
        </form>
      </section>
    </main>
  );
}
