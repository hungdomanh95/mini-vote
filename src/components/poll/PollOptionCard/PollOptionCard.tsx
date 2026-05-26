"use client";

import clsx from "clsx";
import { Check, Maximize2 } from "lucide-react";
import Image from "next/image";
import type { PollOption } from "@/types/poll.type";

type PollOptionCardProps = {
  option: PollOption;
  selected: boolean;
  multiple: boolean;
  onToggle: (optionId: string) => void;
  onPreview: (option: PollOption) => void;
};

export function PollOptionCard({
  option,
  selected,
  multiple,
  onToggle,
  onPreview,
}: PollOptionCardProps) {
  return (
    <button
      aria-pressed={selected}
      className={clsx("optionCard", selected && "selected")}
      type="button"
      onClick={() => onToggle(option.id)}
    >
      {option.imageUrl ? (
        <div className="optionImageArea">
          <span className="optionImageWrap">
            <Image
              alt={option.label}
              className="optionImage"
              src={option.imageUrl}
              fill
              sizes="(max-width: 720px) 50vw, 220px"
            />
          </span>

          <span className="optionSelectedOverlay" aria-hidden="true">
            <Check size={40} strokeWidth={3} />
          </span>

          <button
            aria-label={`Xem ảnh ${option.label}`}
            className="optionZoomBadge"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPreview(option);
            }}
          >
            <Maximize2 size={16} />
          </button>
        </div>
      ) : null}

      <div className="optionFooter">
        <span className="optionLabel">{option.label}</span>
        {selected ? (
          <span className="optionFooterCheck" aria-hidden="true">
            <Check size={13} strokeWidth={3} />
          </span>
        ) : (
          <span className="optionFooterHint">{multiple ? "Chọn" : "Chọn"}</span>
        )}
      </div>
    </button>
  );
}
