"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
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
  const [previewImage, setPreviewImage] = useState<{ imageUrl: string; label: string } | null>(
    null,
  );
  const [expandedVoterOptionId, setExpandedVoterOptionId] = useState<string | null>(null);

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
  const votersByOptionId = new Map<string, Array<{ id: string; name: string }>>();

  if (result) {
    for (const vote of result.voters) {
      const voterName = vote.voterName.trim() || "Không tên";

      for (const selection of vote.selections) {
        const current = votersByOptionId.get(selection.id) ?? [];
        current.push({ id: vote.id, name: voterName });
        votersByOptionId.set(selection.id, current);
      }
    }
  }

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
            const voterNames = votersByOptionId.get(option.id) ?? [];
            const isVoterListOpen = expandedVoterOptionId === option.id;
            const voterToggleLabel =
              voterNames.length > 0
                ? `${isVoterListOpen ? "Ẩn" : "Xem"} người vote (${voterNames.length})`
                : "Chưa có ai chọn";

            return (
              <li key={option.id} className={`resultRankItem${rank === 1 ? " resultRankFirst" : ""}`}>
                <span className="resultRankBadge" style={{ color: rankColor }}>
                  {rank}
                </span>

                {option.imageUrl ? (
                  <button
                    aria-label={`Mở ảnh ${option.label}`}
                    className="resultRankThumb resultImagePreviewButton"
                    title="Xem ảnh lớn"
                    type="button"
                    onClick={() =>
                      setPreviewImage({
                        imageUrl: option.imageUrl ?? "",
                        label: option.label,
                      })
                    }
                  >
                    <Image
                      alt={option.label}
                      src={option.imageUrl}
                      width={52}
                      height={52}
                      style={{ objectFit: "contain" }}
                    />
                  </button>
                ) : (
                  <span className="resultRankThumb resultRankThumbFallback">
                    {option.label.trim().charAt(0).toUpperCase()}
                  </span>
                )}

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
                  <button
                    aria-expanded={isVoterListOpen}
                    className="resultRankVoterToggle"
                    disabled={voterNames.length === 0}
                    type="button"
                    onClick={() =>
                      setExpandedVoterOptionId((current) =>
                        current === option.id ? null : option.id,
                      )
                    }
                  >
                    {voterToggleLabel}
                  </button>
                  {isVoterListOpen && voterNames.length > 0 ? (
                    <ol
                      aria-label={`Người chọn ${option.label}`}
                      className="resultRankVoterList"
                    >
                      {voterNames.map((voter, voterIndex) => (
                        <li className="resultRankVoterRow" key={voter.id}>
                          <span>{voterIndex + 1}</span>
                          <strong>{voter.name}</strong>
                        </li>
                      ))}
                    </ol>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {previewImage ? (
        <div
          aria-label={`Ảnh ${previewImage.label}`}
          aria-modal="true"
          className="imageLightbox"
          role="dialog"
          onClick={() => setPreviewImage(null)}
        >
          <div className="imageLightboxPanel" onClick={(event) => event.stopPropagation()}>
            <button
              aria-label="Đóng ảnh"
              className="lightboxClose"
              type="button"
              onClick={() => setPreviewImage(null)}
            >
              <X aria-hidden="true" size={22} />
            </button>

            <div className="lightboxImageWrap resultLightboxImageWrap">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt={previewImage.label} src={previewImage.imageUrl} />
            </div>

            <div className="lightboxFooter">
              <div>
                <p className="lightboxEyebrow">Kết quả</p>
                <h2>{previewImage.label}</h2>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
