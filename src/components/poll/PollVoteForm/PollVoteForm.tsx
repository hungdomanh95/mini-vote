"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Send, X } from "lucide-react";
import Image from "next/image";
import { PollOptionCard } from "@/components/poll/PollOptionCard/PollOptionCard";
import type { PollOption, PublicPoll } from "@/types/poll.type";

type PollVoteFormProps = {
  poll: PublicPoll;
};

function getVoterToken(slug: string) {
  const key = `vote_token_${slug}`;
  const existingToken = localStorage.getItem(key);

  if (existingToken) {
    return existingToken;
  }

  const newToken =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  localStorage.setItem(key, newToken);

  return newToken;
}

export function PollVoteForm({ poll }: PollVoteFormProps) {
  const router = useRouter();
  const [voterName, setVoterName] = useState("");
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [previewOption, setPreviewOption] = useState<PollOption | null>(null);
  const [zoomTransform, setZoomTransform] = useState<{ x: number; y: number; scale: number } | null>(null);
  const dragRef = useRef<{ startMouseX: number; startMouseY: number; startTX: number; startTY: number } | null>(null);
  const didDragRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const selectionLimit = poll.allowMultiple ? poll.maxSelections ?? poll.options.length : 1;
  const selectedOptions = poll.options.filter((o) => selectedOptionIds.includes(o.id));
  const selectedPreviewOption = previewOption ? selectedOptionIds.includes(previewOption.id) : false;
  const isAtLimit =
    poll.allowMultiple && poll.maxSelections != null && selectedOptionIds.length >= poll.maxSelections;

  useEffect(() => {
    setZoomTransform(null);
  }, [previewOption]);

  useEffect(() => {
    if (!previewOption) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setPreviewOption(null);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [previewOption]);

  useEffect(() => {
    if (showConfirm) {
      setTimeout(() => nameInputRef.current?.focus(), 50);
    } else {
      setConfirmError(null);
    }
  }, [showConfirm]);

  useEffect(() => {
    if (!showConfirm) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setShowConfirm(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [showConfirm]);

  function toggleOption(optionId: string) {
    setError(null);
    if (!poll.allowMultiple) {
      setSelectedOptionIds([optionId]);
      return;
    }
    setSelectedOptionIds((current) => {
      if (current.includes(optionId)) return current.filter((id) => id !== optionId);
      if (poll.maxSelections && current.length >= poll.maxSelections) {
        setError(`Bạn chỉ được chọn tối đa ${poll.maxSelections} mẫu`);
        return current;
      }
      return [...current, optionId];
    });
  }

  function handleOpenConfirm() {
    if (selectedOptionIds.length === 0) {
      setError("Bạn cần chọn ít nhất 1 mẫu");
      return;
    }
    setError(null);
    setShowConfirm(true);
  }

  async function handleConfirmSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setConfirmError(null);

    if (!voterName.trim()) {
      setConfirmError("Bạn cần nhập tên");
      return;
    }

    setIsSubmitting(true);

    const response = await fetch(`/api/polls/${poll.slug}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        voterName,
        optionIds: selectedOptionIds,
        voterToken: getVoterToken(poll.slug),
      }),
    });
    const data = await response.json().catch(() => null);

    setIsSubmitting(false);

    if (!response.ok) {
      setConfirmError(data?.message ?? "Không thể gửi vote");
      return;
    }

    setShowConfirm(false);

    if (poll.showResultAfterVote) {
      router.push(`/vote/${poll.slug}/result`);
    }
  }

  const isClosed = poll.status !== "active";

  return (
    <>
      <div className="panel votePanel">
        <div className="voteMeter" aria-live="polite">
          <span className="voteMeterCount">{selectedOptionIds.length}<em>/{selectionLimit}</em></span>
          <span className="voteMeterLabel">mẫu đã chọn</span>
        </div>

        <div className="optionGrid">
          {poll.options.map((option) => (
            <PollOptionCard
              key={option.id}
              multiple={poll.allowMultiple}
              option={option}
              selected={selectedOptionIds.includes(option.id)}
              onPreview={setPreviewOption}
              onToggle={toggleOption}
            />
          ))}
        </div>

        {error ? <p className="alert error">{error}</p> : null}
        {isClosed ? <p className="alert warning">Poll đã đóng</p> : null}

        <div className="actionRow">
          <button
            className="primaryButton voteSubmitButton"
            disabled={isClosed}
            type="button"
            onClick={handleOpenConfirm}
          >
            <Send aria-hidden="true" size={18} />
            Gửi vote
          </button>

          {poll.showResultAfterVote ? (
            <Link className="ghostButton" href={`/vote/${poll.slug}/result`}>
              Xem kết quả
            </Link>
          ) : null}
        </div>
      </div>

      {/* Confirm modal */}
      {showConfirm ? (
        <div
          aria-modal="true"
          className="confirmOverlay"
          role="dialog"
          aria-label="Xác nhận vote"
          onClick={() => setShowConfirm(false)}
        >
          <div className="confirmPanel" onClick={(e) => e.stopPropagation()}>
            <button
              aria-label="Đóng"
              className="lightboxClose confirmClose"
              type="button"
              onClick={() => setShowConfirm(false)}
            >
              <X size={20} />
            </button>

            <div className="confirmHeader">
              <h2>Xác nhận vote</h2>
            </div>

            <div className="confirmSelections">
              <div className="confirmThumbs">
                {selectedOptions.map((option) => (
                  <div key={option.id} className="confirmThumb">
                    {option.imageUrl ? (
                      <Image alt={option.label} src={option.imageUrl} width={160} height={160} style={{ objectFit: "contain" }} />
                    ) : null}
                    <span>{option.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <form className="confirmForm" onSubmit={handleConfirmSubmit}>
              <label className="field">
                <input
                  ref={nameInputRef}
                  autoComplete="name"
                  disabled={isSubmitting}
                  placeholder="Nhập tên để xác nhận"
                  value={voterName}
                  onChange={(e) => setVoterName(e.target.value)}
                />
              </label>

              {confirmError ? (
                <p className="alert error">
                  {confirmError}
                  {confirmError.includes("đã vote") ? (
                    <>
                      {" "}
                      <Link href={`/vote/${poll.slug}/result`}>Xem kết quả</Link>
                    </>
                  ) : null}
                </p>
              ) : null}

              <div className="confirmActions">
                <button
                  className="ghostButton"
                  disabled={isSubmitting}
                  type="button"
                  onClick={() => setShowConfirm(false)}
                >
                  Hủy
                </button>
                <button className="primaryButton" disabled={isSubmitting} type="submit">
                  <Send aria-hidden="true" size={16} />
                  {isSubmitting ? "Đang gửi…" : "Xác nhận gửi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Image lightbox */}
      {previewOption?.imageUrl ? (
        <div
          aria-label={`Ảnh ${previewOption.label}`}
          aria-modal="true"
          className="imageLightbox"
          role="dialog"
          onClick={() => setPreviewOption(null)}
        >
          <div className="imageLightboxPanel" onClick={(event) => event.stopPropagation()}>
            <button
              aria-label="Đóng ảnh"
              className="lightboxClose"
              type="button"
              onClick={() => setPreviewOption(null)}
            >
              <X aria-hidden="true" size={22} />
            </button>

            <div
              className={zoomTransform ? "lightboxImageWrap zoomed" : "lightboxImageWrap"}
              onClick={(e) => {
                if (didDragRef.current) { didDragRef.current = false; return; }
                if (!zoomTransform) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const cx = e.clientX - rect.left;
                  const cy = e.clientY - rect.top;
                  const scale = 2.5;
                  setZoomTransform({ scale, x: cx - cx * scale, y: cy - cy * scale });
                } else {
                  setZoomTransform(null);
                }
              }}
              onMouseDown={(e) => {
                if (!zoomTransform) return;
                e.preventDefault();
                didDragRef.current = false;
                dragRef.current = {
                  startMouseX: e.clientX,
                  startMouseY: e.clientY,
                  startTX: zoomTransform.x,
                  startTY: zoomTransform.y,
                };
                function onMouseMove(ev: MouseEvent) {
                  if (!dragRef.current) return;
                  const { startMouseX, startMouseY, startTX, startTY } = dragRef.current;
                  const dx = ev.clientX - startMouseX;
                  const dy = ev.clientY - startMouseY;
                  if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didDragRef.current = true;
                  setZoomTransform((prev) =>
                    prev ? { ...prev, x: startTX + dx, y: startTY + dy } : null,
                  );
                }
                function onMouseUp() {
                  dragRef.current = null;
                  window.removeEventListener("mousemove", onMouseMove);
                  window.removeEventListener("mouseup", onMouseUp);
                }
                window.addEventListener("mousemove", onMouseMove);
                window.addEventListener("mouseup", onMouseUp);
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={previewOption.label}
                src={previewOption.imageUrl}
                style={
                  zoomTransform
                    ? { transform: `translate(${zoomTransform.x}px, ${zoomTransform.y}px) scale(${zoomTransform.scale})` }
                    : undefined
                }
              />
            </div>

            <div className="lightboxFooter">
              <div>
                <p className="lightboxEyebrow">Mẫu áo</p>
                <h2>{previewOption.label}</h2>
              </div>
              <button
                className="primaryButton lightboxSelectButton"
                disabled={!selectedPreviewOption && isAtLimit}
                type="button"
                onClick={() => {
                  toggleOption(previewOption.id);
                  setPreviewOption(null);
                }}
              >
                {selectedPreviewOption ? <Check aria-hidden="true" size={18} /> : null}
                {selectedPreviewOption ? "Đã chọn" : isAtLimit ? "Đã đủ lượt chọn" : "Chọn mẫu này"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
