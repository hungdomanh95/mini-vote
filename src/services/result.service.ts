import { ApiError } from "@/lib/errors";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { AdminPollResultDetail, AdminVoteSelection, PollResult } from "@/types/vote.type";
import { getAdminPollById, getPublicPoll } from "./poll.service";

type SelectionRow = {
  option_id: string;
};

type VoteRow = {
  id: string;
  voter_name: string;
  created_at: string;
};

type VoteSelectionRow = {
  vote_id: string;
  option_id: string;
};

function throwDatabaseError(error: { message?: string } | null, fallback: string) {
  if (error) {
    throw new ApiError("DATABASE_ERROR", error.message ?? fallback, 500);
  }
}

export async function getPollResult(slug: string): Promise<PollResult | null> {
  const supabase = getSupabaseAdmin();
  const poll = await getPublicPoll(slug);

  if (!poll) {
    return null;
  }

  const optionIds = poll.options.map((option) => option.id);

  const { count: totalVotes, error: voteCountError } = await supabase
    .from("votes")
    .select("id", { count: "exact", head: true })
    .eq("poll_id", poll.id);

  throwDatabaseError(voteCountError, "Không thể đếm vote");

  const { data: selections, error: selectionsError } =
    optionIds.length > 0
      ? await supabase.from("vote_selections").select("option_id").in("option_id", optionIds)
      : { data: [], error: null };

  throwDatabaseError(selectionsError, "Không thể lấy lựa chọn");

  const counts = new Map<string, number>();

  for (const selection of (selections ?? []) as SelectionRow[]) {
    counts.set(selection.option_id, (counts.get(selection.option_id) ?? 0) + 1);
  }

  const totalSelections = ((selections ?? []) as SelectionRow[]).length;
  const baseTotal = poll.allowMultiple ? totalSelections : totalVotes ?? 0;

  return {
    pollId: poll.id,
    title: poll.title,
    description: poll.description,
    slug: poll.slug,
    allowMultiple: poll.allowMultiple,
    totalVotes: totalVotes ?? 0,
    totalSelections,
    options: poll.options.map((option) => {
      const voteCount = counts.get(option.id) ?? 0;
      const percentage =
        baseTotal === 0 ? 0 : Number(((voteCount / baseTotal) * 100).toFixed(2));

      return {
        id: option.id,
        label: option.label,
        imageUrl: option.imageUrl,
        voteCount,
        percentage,
      };
    }),
  };
}

export async function getAdminPollResultById(
  pollId: string,
): Promise<AdminPollResultDetail | null> {
  const supabase = getSupabaseAdmin();
  const poll = await getAdminPollById(pollId);

  if (!poll) {
    return null;
  }

  const result = await getPollResult(poll.slug);

  if (!result) {
    return null;
  }

  const { data: votes, error: votesError } = await supabase
    .from("votes")
    .select("id, voter_name, created_at")
    .eq("poll_id", poll.id)
    .order("created_at", { ascending: false });

  throwDatabaseError(votesError, "Không thể lấy danh sách người vote");

  const voteRows = (votes ?? []) as VoteRow[];
  const voteIds = voteRows.map((vote) => vote.id);

  const { data: selections, error: selectionsError } =
    voteIds.length > 0
      ? await supabase
          .from("vote_selections")
          .select("vote_id, option_id")
          .in("vote_id", voteIds)
      : { data: [], error: null };

  throwDatabaseError(selectionsError, "Không thể lấy lựa chọn của người vote");

  const optionById = new Map(poll.options.map((option) => [option.id, option]));
  const selectionsByVoteId = new Map<string, AdminVoteSelection[]>();

  for (const selection of (selections ?? []) as VoteSelectionRow[]) {
    const option = optionById.get(selection.option_id);

    if (!option) {
      continue;
    }

    const current = selectionsByVoteId.get(selection.vote_id) ?? [];
    current.push({
      id: option.id,
      label: option.label,
      imageUrl: option.imageUrl,
    });
    selectionsByVoteId.set(selection.vote_id, current);
  }

  for (const selectedOptions of selectionsByVoteId.values()) {
    selectedOptions.sort((a, b) => {
      const optionA = optionById.get(a.id);
      const optionB = optionById.get(b.id);

      return (optionA?.orderIndex ?? 0) - (optionB?.orderIndex ?? 0);
    });
  }

  return {
    ...result,
    voters: voteRows.map((vote) => ({
      id: vote.id,
      voterName: vote.voter_name,
      createdAt: vote.created_at,
      selections: selectionsByVoteId.get(vote.id) ?? [],
    })),
  };
}
