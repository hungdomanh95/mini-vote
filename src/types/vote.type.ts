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

export type PollResultVoteSelection = Pick<PollOption, "id" | "label" | "imageUrl">;

export type PollResultVoter = {
  id: string;
  voterName: string;
  createdAt: string;
  selections: PollResultVoteSelection[];
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
  voters: PollResultVoter[];
};

export type AdminVoteSelection = PollResultVoteSelection;

export type AdminVoteRecord = PollResultVoter;

export type AdminPollResultDetail = PollResult;
