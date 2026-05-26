import type { PollResult } from "@/types/vote.type";
import { formatPercent } from "@/lib/format";

type PollResultListProps = {
  result: PollResult;
};

export function PollResultList({ result }: PollResultListProps) {
  return (
    <div className="resultList">
      {result.options.map((option) => (
        <article className="resultItem" key={option.id}>
          {option.imageUrl ? (
            <span className="resultThumbWrap">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt={option.label} className="resultThumb" src={option.imageUrl} />
            </span>
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
    </div>
  );
}
