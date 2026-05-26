"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { formatPercent } from "@/lib/format";
import type { PollResult } from "@/types/vote.type";

type Props = {
  slug: string;
  version: number;
};

const RANK_COLORS = ["#f59e0b", "#94a3b8", "#b45309"];

export function PollResultPanel({ slug, version }: Props) {
  const [result, setResult] = useState<PollResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/polls/${slug}/result`)
      .then((r) => r.json())
      .then((data) => {
        setResult(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [slug, version]);

  const sorted = result
    ? [...result.options].sort((a, b) => b.voteCount - a.voteCount)
    : [];

  const maxVotes = sorted[0]?.voteCount ?? 0;

  return (
    <aside className="resultPanel">
      <div className="resultPanelHeader">
        <h2 className="resultPanelTitle">Kết quả</h2>
        {result ? (
          <span className="resultPanelMeta">{result.totalVotes} lượt vote</span>
        ) : null}
      </div>

      {loading && !result ? (
        <div className="resultPanelLoading">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="resultSkeletonItem" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <p className="resultPanelEmpty">Chưa có vote nào.</p>
      ) : (
        <ol className="resultRankList">
          {sorted.map((option, i) => {
            const rank = i + 1;
            const isTop3 = rank <= 3;
            const rankColor = isTop3 ? RANK_COLORS[i] : "var(--muted)";
            const barWidth = maxVotes > 0 ? (option.voteCount / maxVotes) * 100 : 0;

            return (
              <li key={option.id} className={`resultRankItem${rank === 1 ? " resultRankFirst" : ""}`}>
                <span className="resultRankBadge" style={{ color: rankColor }}>
                  {rank}
                </span>

                {option.imageUrl ? (
                  <span className="resultRankThumb">
                    <Image
                      alt={option.label}
                      src={option.imageUrl}
                      width={52}
                      height={52}
                      style={{ objectFit: "contain" }}
                    />
                  </span>
                ) : null}

                <div className="resultRankContent">
                  <div className="resultRankTopline">
                    <span className="resultRankLabel">{option.label}</span>
                    <span className="resultRankCount" style={{ color: isTop3 ? rankColor : undefined }}>
                      {formatPercent(option.percentage)}
                    </span>
                  </div>
                  <div className="resultRankTrack" aria-hidden="true">
                    <span
                      className="resultRankBar"
                      style={{
                        width: `${barWidth}%`,
                        background: isTop3 ? rankColor : "var(--accent)",
                        transition: "width 600ms ease",
                      }}
                    />
                  </div>
                  <span className="resultRankVotes">{option.voteCount} vote</span>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </aside>
  );
}
