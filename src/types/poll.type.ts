export type PollStatus = "active" | "closed";

export type Poll = {
  id: string;
  title: string;
  description?: string | null;
  slug: string;
  allowMultiple: boolean;
  maxSelections?: number | null;
  status: PollStatus;
  showResultAfterVote: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PollOption = {
  id: string;
  pollId: string;
  label: string;
  imageUrl?: string | null;
  orderIndex: number;
};

export type PublicPoll = Poll & {
  options: PollOption[];
};

export type PollOptionInput = {
  id?: string;
  label: string;
  imageUrl?: string | null;
  orderIndex?: number;
};

export type PollInput = {
  title: string;
  description?: string | null;
  slug: string;
  allowMultiple: boolean;
  maxSelections?: number | null;
  status: PollStatus;
  showResultAfterVote: boolean;
  options: PollOptionInput[];
};

export type PollRow = {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  allow_multiple: boolean;
  max_selections: number | null;
  status: PollStatus;
  show_result_after_vote: boolean;
  created_at: string;
  updated_at: string;
};

export type PollOptionRow = {
  id: string;
  poll_id: string;
  label: string;
  image_url: string | null;
  order_index: number;
  created_at?: string;
  updated_at?: string;
};
