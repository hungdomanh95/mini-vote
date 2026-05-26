import { ApiError } from "@/lib/errors";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { SubmitVoteBody } from "@/types/vote.type";
import { getOptionsByPollId, getPublicPoll } from "./poll.service";

type VoteRow = {
  id: string;
  poll_id: string;
  voter_name: string;
  voter_token: string | null;
  created_at: string;
};

function throwDatabaseError(error: { code?: string; message?: string } | null, fallback: string) {
  if (!error) {
    return;
  }

  if (error.code === "23505") {
    throw new ApiError("ALREADY_VOTED", "Bạn đã vote rồi", 409);
  }

  throw new ApiError("DATABASE_ERROR", error.message ?? fallback, 500);
}

export async function submitVote(slug: string, body: SubmitVoteBody) {
  const supabase = getSupabaseAdmin();
  const poll = await getPublicPoll(slug);

  if (!poll) {
    throw new ApiError("POLL_NOT_FOUND", "Không tìm thấy poll", 404);
  }

  if (poll.status !== "active") {
    throw new ApiError("POLL_CLOSED", "Poll đã đóng", 409);
  }

  const voterName = body.voterName.trim();
  const optionIds = Array.from(new Set(body.optionIds));

  if (!voterName) {
    throw new ApiError("VOTER_NAME_REQUIRED", "Bạn cần nhập tên", 422);
  }

  if (optionIds.length === 0) {
    throw new ApiError("OPTION_REQUIRED", "Bạn cần chọn ít nhất 1 option", 422);
  }

  if (!poll.allowMultiple && optionIds.length !== 1) {
    throw new ApiError("ONLY_ONE_OPTION_ALLOWED", "Poll này chỉ được chọn 1 option", 422);
  }

  if (poll.allowMultiple && poll.maxSelections && optionIds.length > poll.maxSelections) {
    throw new ApiError(
      "MAX_SELECTION_EXCEEDED",
      `Bạn chỉ được chọn tối đa ${poll.maxSelections} option`,
      422,
    );
  }

  const validOptions = await getOptionsByPollId(poll.id);
  const validOptionIds = new Set(validOptions.map((option) => option.id));
  const hasInvalidOption = optionIds.some((optionId) => !validOptionIds.has(optionId));

  if (hasInvalidOption) {
    throw new ApiError("INVALID_OPTION", "Option không thuộc poll này", 422);
  }

  const voterToken = body.voterToken?.trim() || null;

  if (voterToken) {
    const { data: existingVote, error } = await supabase
      .from("votes")
      .select("id")
      .eq("poll_id", poll.id)
      .eq("voter_token", voterToken)
      .maybeSingle();

    throwDatabaseError(error, "Không thể kiểm tra vote trùng");

    if (existingVote) {
      throw new ApiError("ALREADY_VOTED", "Bạn đã vote rồi", 409);
    }
  }

  const { data: vote, error: voteError } = await supabase
    .from("votes")
    .insert({
      poll_id: poll.id,
      voter_name: voterName,
      voter_token: voterToken,
    })
    .select("*")
    .single();

  throwDatabaseError(voteError, "Không thể lưu vote");

  const voteRow = vote as VoteRow;
  const { error: selectionError } = await supabase.from("vote_selections").insert(
    optionIds.map((optionId) => ({
      vote_id: voteRow.id,
      option_id: optionId,
    })),
  );

  if (selectionError) {
    await supabase.from("votes").delete().eq("id", voteRow.id);
    throwDatabaseError(selectionError, "Không thể lưu lựa chọn");
  }

  return {
    id: voteRow.id,
    pollId: voteRow.poll_id,
    voterName: voteRow.voter_name,
    voterToken: voteRow.voter_token,
    createdAt: voteRow.created_at,
  };
}
