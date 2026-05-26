"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Pencil, Users } from "lucide-react";
import { formatDate, formatPercent } from "@/lib/format";
import type { AdminPollResultDetail } from "@/types/vote.type";
import { AdminLoginPanel } from "./AdminLoginPanel";

type AdminPollResultProps = {
  pollId: string;
};

const RANK_COLORS = ["#f59e0b", "#94a3b8", "#b45309"];

export function AdminPollResult({ pollId }: AdminPollResultProps) {
  const [result, setResult] = useState<AdminPollResultDetail | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadResult = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const response = await fetch(`/api/admin/polls/${pollId}/result`, {
      cache: "no-store",
    });
    const data = await response.json().catch(() => null);

    setIsLoading(false);

    if (response.status === 401) {
      setNeedsAuth(true);
      return;
    }

    if (!response.ok) {
      setError(data?.message ?? "Không thể tải kết quả");
      return;
    }

    setResult(data.result);
    setNeedsAuth(false);
  }, [pollId]);

  useEffect(() => {
    void loadResult();
  }, [loadResult]);

  if (needsAuth) {
    return <AdminLoginPanel onSuccess={loadResult} />;
  }

  const sortedOptions = result
    ? [...result.options].sort((a, b) => b.voteCount - a.voteCount)
    : [];
  const maxVotes = sortedOptions[0]?.voteCount ?? 0;

  return (
    <main className="pageShell adminResultPage">
      <section className="adminHeader">
        <div>
          <p className="eyebrow">Admin result</p>
          <h1>{result?.title ?? "Kết quả poll"}</h1>
        </div>

        <div className="toolbar">
          <Link className="ghostButton" href="/admin">
            <ArrowLeft aria-hidden="true" size={18} />
            Danh sách
          </Link>
          {result ? (
            <Link className="primaryButton" href={`/admin/polls/${result.pollId}/edit`}>
              <Pencil aria-hidden="true" size={18} />
              Sửa poll
            </Link>
          ) : null}
        </div>
      </section>

      {isLoading ? <p className="muted">Đang tải kết quả</p> : null}
      {error ? <p className="alert error">{error}</p> : null}

      {result ? (
        <section className="adminResultLayout">
          <article className="adminResultCard">
            <div className="adminResultCardHeader">
              <div>
                <p className="adminResultKicker">Bảng xếp hạng</p>
                <h2>Kết quả vote</h2>
              </div>
              <div className="adminResultStats">
                <span>{result.totalVotes} người vote</span>
                <span>{result.totalSelections} lượt chọn</span>
              </div>
            </div>

            <ol className="adminResultRankList">
              {sortedOptions.map((option, index) => {
                const rank = index + 1;
                const isTop3 = rank <= 3;
                const rankColor = isTop3 ? RANK_COLORS[index] : undefined;
                const barWidth = maxVotes > 0 ? (option.voteCount / maxVotes) * 100 : 0;

                return (
                  <li
                    className={`adminResultRankItem${rank === 1 ? " first" : ""}`}
                    key={option.id}
                  >
                    <span className="adminResultRankBadge" style={{ color: rankColor }}>
                      {rank}
                    </span>

                    <span className="adminResultThumb">
                      {option.imageUrl ? (
                        <Image
                          alt={option.label}
                          height={64}
                          src={option.imageUrl}
                          width={64}
                          style={{ objectFit: "contain" }}
                        />
                      ) : (
                        <span>{option.label.trim().charAt(0).toUpperCase()}</span>
                      )}
                    </span>

                    <div className="adminResultRankContent">
                      <div className="adminResultRankTopline">
                        <strong>{option.label}</strong>
                        <span style={{ color: rankColor }}>{formatPercent(option.percentage)}</span>
                      </div>
                      <div className="adminResultTrack" aria-hidden="true">
                        <span
                          className="adminResultBar"
                          style={{
                            width: `${barWidth}%`,
                            background: rankColor ?? "#2563eb",
                          }}
                        />
                      </div>
                      <small>{option.voteCount} vote</small>
                    </div>
                  </li>
                );
              })}
            </ol>
          </article>

          <article className="adminResultCard adminVoterPanel">
            <div className="adminResultCardHeader">
              <div>
                <p className="adminResultKicker">Chi tiết</p>
                <h2>Người đã vote</h2>
              </div>
              <span className="adminVoterCount">
                <Users aria-hidden="true" size={16} />
                {result.voters.length}
              </span>
            </div>

            {result.voters.length === 0 ? (
              <p className="adminResultEmpty">Chưa có ai vote.</p>
            ) : (
              <div className="adminVoterList">
                {result.voters.map((vote) => (
                  <article className="adminVoterCard" key={vote.id}>
                    <div className="adminVoterTopline">
                      <span className="adminVoterAvatar" aria-hidden="true">
                        {(vote.voterName.trim() || "?").charAt(0).toUpperCase()}
                      </span>
                      <div>
                        <h3>{vote.voterName.trim() || "Không tên"}</h3>
                        <p>{formatDate(vote.createdAt)}</p>
                      </div>
                    </div>

                    <div className="adminVoteSelections">
                      {vote.selections.length > 0 ? (
                        vote.selections.map((selection) => (
                          <span className="adminVoteSelectionChip" key={selection.id}>
                            {selection.imageUrl ? (
                              <Image
                                alt={selection.label}
                                height={34}
                                src={selection.imageUrl}
                                width={34}
                                style={{ objectFit: "contain" }}
                              />
                            ) : null}
                            {selection.label}
                          </span>
                        ))
                      ) : (
                        <span className="adminVoteSelectionEmpty">Không có lựa chọn</span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </article>
        </section>
      ) : null}
    </main>
  );
}
