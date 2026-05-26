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
  replaceExisting?: boolean;
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

export type AdminVoteSelection = Pick<PollOption, "id" | "label" | "imageUrl">;

export type AdminVoteRecord = {
  id: string;
  voterName: string;
  createdAt: string;
  selections: AdminVoteSelection[];
};

export type AdminPollResultDetail = PollResult & {
  voters: AdminVoteRecord[];
};
