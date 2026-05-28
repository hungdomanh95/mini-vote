"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { PollResult } from "@/types/vote.type";
import { formatPercent } from "@/lib/format";

type PollResultListProps = {
  result: PollResult;
};

export function PollResultList({ result }: PollResultListProps) {
  const [previewImage, setPreviewImage] = useState<{ imageUrl: string; label: string } | null>(
    null,
  );

  return (
    <div className="resultList">
      {result.options.map((option) => (
        <article className="resultItem" key={option.id}>
          {option.imageUrl ? (
            <button
              aria-label={`Mở ảnh ${option.label}`}
              className="resultThumbWrap resultImagePreviewButton"
              title="Xem ảnh lớn"
              type="button"
              onClick={() =>
                setPreviewImage({
                  imageUrl: option.imageUrl ?? "",
                  label: option.label,
                })
              }
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt={option.label} className="resultThumb" src={option.imageUrl} />
            </button>
          ) : null}

          <div className="resultContent">
            <div className="resultTopline">
              <h2>{option.label}</h2>
              <span>
                {option.voteCount} vote · {formatPercent(option.percentage)}
              </span>
            </div>
            <div aria-hidden="true" className="progressTrack">
              <span className="progressBar" style={{ width: `${option.percentage}%` }} />
            </div>
          </div>
        </article>
      ))}

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
    </div>
  );
}
