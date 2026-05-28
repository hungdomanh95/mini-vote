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

function normalizeVoterName(value: string) {
  return value
    .trim()
    .replace(/[đĐ]/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function mapVoteRow(voteRow: VoteRow) {
  return {
    id: voteRow.id,
    pollId: voteRow.poll_id,
    voterName: voteRow.voter_name,
    voterToken: voteRow.voter_token,
    createdAt: voteRow.created_at,
  };
}

async function replaceVoteSelections(voteId: string, optionIds: string[]) {
  const supabase = getSupabaseAdmin();

  const { data: currentSelections, error: currentSelectionsError } = await supabase
    .from("vote_selections")
    .select("option_id")
    .eq("vote_id", voteId);

  throwDatabaseError(currentSelectionsError, "Không thể lấy lựa chọn hiện tại");

  const previousOptionIds = ((currentSelections ?? []) as { option_id: string }[]).map(
    (selection) => selection.option_id,
  );

  const { error: deleteError } = await supabase
    .from("vote_selections")
    .delete()
    .eq("vote_id", voteId);

  throwDatabaseError(deleteError, "Không thể xóa lựa chọn cũ");

  const { error: insertError } = await supabase.from("vote_selections").insert(
    optionIds.map((optionId) => ({
      vote_id: voteId,
      option_id: optionId,
    })),
  );

  if (!insertError) {
    return;
  }

  if (previousOptionIds.length > 0) {
    await supabase.from("vote_selections").insert(
      previousOptionIds.map((optionId) => ({
        vote_id: voteId,
        option_id: optionId,
      })),
    );
  }

  throwDatabaseError(insertError, "Không thể cập nhật lựa chọn");
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
  const normalizedVoterName = normalizeVoterName(voterName);
  const optionIds = Array.from(new Set(body.optionIds));

  if (!voterName) {
    throw new ApiError("VOTER_NAME_REQUIRED", "Bạn cần nhập tên", 422);
  }

  if (!normalizedVoterName) {
    throw new ApiError("VOTER_NAME_REQUIRED", "Tên cần có chữ hoặc số", 422);
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
  let existingVoteByToken: VoteRow | null = null;

  if (voterToken) {
    const { data: existingVote, error } = await supabase
      .from("votes")
      .select("*")
      .eq("poll_id", poll.id)
      .eq("voter_token", voterToken)
      .maybeSingle();

    throwDatabaseError(error, "Không thể kiểm tra vote trùng");

    existingVoteByToken = (existingVote as VoteRow | null) ?? null;
  }

  const { data: pollVotes, error: pollVotesError } = await supabase
    .from("votes")
    .select("*")
    .eq("poll_id", poll.id);

  throwDatabaseError(pollVotesError, "Không thể kiểm tra tên đã vote");

  const existingVoteByName =
    ((pollVotes ?? []) as VoteRow[]).find(
      (vote) => normalizeVoterName(vote.voter_name) === normalizedVoterName,
    ) ?? null;

  if (
    existingVoteByToken &&
    existingVoteByName &&
    existingVoteByToken.id !== existingVoteByName.id
  ) {
    throw new ApiError(
      "VOTE_IDENTITY_CONFLICT",
      "Tên này đã có người vote rồi. Vui lòng nhập đúng tên bạn đã dùng trước đó.",
      409,
    );
  }

  const existingVote = existingVoteByToken ?? existingVoteByName;

  if (existingVote) {
    if (!body.replaceExisting) {
      throw new ApiError("ALREADY_VOTED", "Bạn đã vote rồi", 409);
    }

    const nextToken = existingVote.voter_token ?? voterToken;
    const { data: updatedVote, error: updateVoteError } = await supabase
      .from("votes")
      .update({
        voter_name: voterName,
        voter_token: nextToken,
        created_at: new Date().toISOString(),
      })
      .eq("id", existingVote.id)
      .select("*")
      .single();

    throwDatabaseError(updateVoteError, "Không thể cập nhật vote");

    const updatedVoteRow = updatedVote as VoteRow;
    await replaceVoteSelections(updatedVoteRow.id, optionIds);

    return {
      ...mapVoteRow(updatedVoteRow),
      updated: true,
    };
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
    ...mapVoteRow(voteRow),
    updated: false,
  };
}

export async function deleteVote(pollId: string, voteId: string) {
  const supabase = getSupabaseAdmin();

  const { data: vote, error: findError } = await supabase
    .from("votes")
    .select("id")
    .eq("id", voteId)
    .eq("poll_id", pollId)
    .maybeSingle();

  throwDatabaseError(findError, "Không thể kiểm tra vote");

  if (!vote) {
    throw new ApiError("VOTE_NOT_FOUND", "Không tìm thấy vote", 404);
  }

  const { error: deleteError } = await supabase
    .from("votes")
    .delete()
    .eq("id", voteId)
    .eq("poll_id", pollId);

  throwDatabaseError(deleteError, "Không thể xóa vote");
}
