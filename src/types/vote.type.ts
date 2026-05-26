import type { PollOption } from "./poll.type";

export type Vote = {
  id: string;
  pollId: string;
  voterName: string;
  voterToken?: string | null;
  createdAt: string;
};

export type SubmitVoteBody = {
  voterName: string;
  optionIds: string[];
  voterToken?: string | null;
};

export type PollResultOption = Pick<PollOption, "id" | "label" | "imageUrl"> & {
  voteCount: number;
  percentage: number;
};

export type PollResult = {
  pollId: string;
  title: string;
  description?: string | null;
  slug: string;
  allowMultiple: boolean;
  totalVotes: number;
  totalSelections: number;
  options: PollResultOption[];
};
