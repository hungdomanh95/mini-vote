"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import { PollResultList } from "@/components/poll/PollResultList/PollResultList";
import type { PublicPoll } from "@/types/poll.type";
import type { PollResult } from "@/types/vote.type";
import { AdminLoginPanel } from "./AdminLoginPanel";

type AdminPollResultProps = {
  pollId: string;
};

export function AdminPollResult({ pollId }: AdminPollResultProps) {
  const [poll, setPoll] = useState<PublicPoll | null>(null);
  const [result, setResult] = useState<PollResult | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadResult = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const pollResponse = await fetch(`/api/admin/polls/${pollId}`, {
      cache: "no-store",
    });
    const pollData = await pollResponse.json().catch(() => null);

    if (pollResponse.status === 401) {
      setNeedsAuth(true);
      setIsLoading(false);
      return;
    }

    if (!pollResponse.ok) {
      setError(pollData?.message ?? "Không thể tải poll");
      setIsLoading(false);
      return;
    }

    const currentPoll = pollData.poll as PublicPoll;
    const resultResponse = await fetch(`/api/polls/${currentPoll.slug}/result`, {
      cache: "no-store",
    });
    const resultData = await resultResponse.json().catch(() => null);

    setIsLoading(false);

    if (!resultResponse.ok) {
      setError(resultData?.message ?? "Không thể tải kết quả");
      return;
    }

    setPoll(currentPoll);
    setResult(resultData);
    setNeedsAuth(false);
  }, [pollId]);

  useEffect(() => {
    void loadResult();
  }, [loadResult]);

  if (needsAuth) {
    return <AdminLoginPanel onSuccess={loadResult} />;
  }

  return (
    <main className="pageShell">
      <section className="adminHeader">
        <div>
          <p className="eyebrow">Admin result</p>
          <h1>{poll?.title ?? "Kết quả poll"}</h1>
        </div>

        <div className="toolbar">
          <Link className="ghostButton" href="/admin">
            <ArrowLeft aria-hidden="true" size={18} />
            Danh sách
          </Link>
          {poll ? (
            <Link className="primaryButton" href={`/admin/polls/${poll.id}/edit`}>
              <Pencil aria-hidden="true" size={18} />
              Sửa poll
            </Link>
          ) : null}
        </div>
      </section>

      {isLoading ? <p className="muted">Đang tải kết quả</p> : null}
      {error ? <p className="alert error">{error}</p> : null}

      {result ? (
        <section className="panel">
          <div className="resultSummary">
            <span>{result.totalVotes} người vote</span>
            <span>{result.totalSelections} lượt chọn</span>
          </div>
          <PollResultList result={result} />
        </section>
      ) : null}
    </main>
  );
}
