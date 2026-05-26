"use client";

import { useState } from "react";
import { PollVoteForm } from "@/components/poll/PollVoteForm/PollVoteForm";
import { PollResultPanel } from "@/components/poll/PollResultPanel/PollResultPanel";
import type { PublicPoll } from "@/types/poll.type";

type Props = {
  poll: PublicPoll;
};

export function VoteLayout({ poll }: Props) {
  const [resultVersion, setResultVersion] = useState(0);

  return (
    <div className="voteLayout">
      <div className="voteLayoutMain">
        <PollVoteForm poll={poll} onVoteSuccess={() => setResultVersion((v) => v + 1)} />
      </div>
      <PollResultPanel slug={poll.slug} version={resultVersion} />
    </div>
  );
}
