import { ApiError } from "@/lib/errors";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { PollResult } from "@/types/vote.type";
import { getPublicPoll } from "./poll.service";

type SelectionRow = {
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
