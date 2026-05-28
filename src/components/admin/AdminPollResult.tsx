"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Pencil, Trash2, Users, X } from "lucide-react";
import { formatDate, formatPercent } from "@/lib/format";
import type { AdminPollResultDetail } from "@/types/vote.type";
import { AdminLoginPanel } from "./AdminLoginPanel";

type AdminPollResultProps = {
  pollId: string;
};

type PreviewImage = {
  imageUrl: string;
  label: string;
  eyebrow: string;
};

const RANK_COLORS = ["#f59e0b", "#94a3b8", "#b45309"];

export function AdminPollResult({ pollId }: AdminPollResultProps) {
  const [result, setResult] = useState<AdminPollResultDetail | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingVoteId, setDeletingVoteId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<PreviewImage | null>(null);

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

  async function handleDeleteVote(vote: AdminPollResultDetail["voters"][number]) {
    const voterName = vote.voterName.trim() || "Không tên";
    const ok = window.confirm(`Xóa vote của "${voterName}"?`);

    if (!ok) {
      return;
    }

    setError(null);
    setDeletingVoteId(vote.id);

    const response = await fetch(`/api/admin/polls/${pollId}/votes/${vote.id}`, {
      method: "DELETE",
    });
    const data = await response.json().catch(() => null);

    setDeletingVoteId(null);

    if (response.status === 401) {
      setNeedsAuth(true);
      return;
    }

    if (!response.ok) {
      setError(data?.message ?? "Không thể xóa vote");
      return;
    }

    await loadResult();
  }

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
                const voterNames = votersByOptionId.get(option.id) ?? [];

                return (
                  <li
                    className={`adminResultRankItem${rank === 1 ? " first" : ""}`}
                    key={option.id}
                  >
                    <span className="adminResultRankBadge" style={{ color: rankColor }}>
                      {rank}
                    </span>

                    {option.imageUrl ? (
                      <button
                        aria-label={`Mở ảnh ${option.label}`}
                        className="adminResultThumb adminImagePreviewButton"
                        title="Xem ảnh lớn"
                        type="button"
                        onClick={() =>
                          setPreviewImage({
                            imageUrl: option.imageUrl ?? "",
                            label: option.label,
                            eyebrow: "Option",
                          })
                        }
                      >
                        <Image
                          alt={option.label}
                          height={64}
                          src={option.imageUrl}
                          width={64}
                          style={{ objectFit: "contain" }}
                        />
                      </button>
                    ) : (
                      <span className="adminResultThumb">
                        <span>{option.label.trim().charAt(0).toUpperCase()}</span>
                      </span>
                    )}

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
                      <div
                        aria-label={`Người chọn ${option.label}`}
                        className="adminResultVoterNames"
                      >
                        {voterNames.length > 0 ? (
                          voterNames.map((voter) => (
                            <span className="adminResultVoterName" key={voter.id}>
                              {voter.name}
                            </span>
                          ))
                        ) : (
                          <span className="adminResultVoterEmpty">Chưa có ai chọn</span>
                        )}
                      </div>
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
                      <button
                        className="smallIconButton danger adminVoterDeleteButton"
                        disabled={deletingVoteId === vote.id}
                        title={`Xóa vote của ${vote.voterName.trim() || "Không tên"}`}
                        type="button"
                        onClick={() => void handleDeleteVote(vote)}
                      >
                        <Trash2 aria-hidden="true" size={16} />
                      </button>
                    </div>

                    <div className="adminVoteSelections">
                      {vote.selections.length > 0 ? (
                        vote.selections.map((selection) =>
                          selection.imageUrl ? (
                            <button
                              className="adminVoteSelectionChip adminVoteSelectionButton"
                              key={selection.id}
                              title="Xem ảnh lớn"
                              type="button"
                              onClick={() =>
                                setPreviewImage({
                                  imageUrl: selection.imageUrl ?? "",
                                  label: selection.label,
                                  eyebrow: vote.voterName.trim() || "Không tên",
                                })
                              }
                            >
                              <Image
                                alt={selection.label}
                                height={34}
                                src={selection.imageUrl}
                                width={34}
                                style={{ objectFit: "contain" }}
                              />
                              {selection.label}
                            </button>
                          ) : (
                            <span className="adminVoteSelectionChip" key={selection.id}>
                              {selection.label}
                            </span>
                          ),
                        )
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

            <div className="lightboxImageWrap adminLightboxImageWrap">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt={previewImage.label} src={previewImage.imageUrl} />
            </div>

            <div className="lightboxFooter">
              <div>
                <p className="lightboxEyebrow">{previewImage.eyebrow}</p>
                <h2>{previewImage.label}</h2>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
