import { ApiError } from "@/lib/errors";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type {
  Poll,
  PollInput,
  PollOption,
  PollOptionInput,
  PollOptionRow,
  PollRow,
  PublicPoll,
} from "@/types/poll.type";

type PollWithOptionsRow = PollRow & {
  poll_options?: PollOptionRow[];
};

function mapPoll(row: PollRow): Poll {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    slug: row.slug,
    allowMultiple: row.allow_multiple,
    maxSelections: row.max_selections,
    status: row.status,
    showResultAfterVote: row.show_result_after_vote,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapOption(row: PollOptionRow): PollOption {
  return {
    id: row.id,
    pollId: row.poll_id,
    label: row.label,
    imageUrl: row.image_url,
    orderIndex: row.order_index,
  };
}

function mapPublicPoll(row: PollWithOptionsRow): PublicPoll {
  const options = [...(row.poll_options ?? [])]
    .sort((a, b) => a.order_index - b.order_index)
    .map(mapOption);

  return {
    ...mapPoll(row),
    options,
  };
}

function normalizeOptions(options: PollOptionInput[]) {
  return options.map((option, index) => ({
    id: option.id,
    label: option.label.trim(),
    image_url: option.imageUrl || null,
    order_index: option.orderIndex ?? index,
  }));
}

function throwSupabaseError(error: { code?: string; message?: string } | null, fallback: string) {
  if (!error) {
    return;
  }

  if (error.code === "23505") {
    throw new ApiError("SLUG_ALREADY_EXISTS", "Slug này đã được dùng", 409);
  }

  throw new ApiError("DATABASE_ERROR", error.message ?? fallback, 500);
}

export async function getPublicPoll(slug: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("polls")
    .select("*, poll_options(*)")
    .eq("slug", slug)
    .maybeSingle();

  throwSupabaseError(error, "Không thể lấy poll");

  if (!data) {
    return null;
  }

  return mapPublicPoll(data as PollWithOptionsRow);
}

export async function getAdminPollById(id: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("polls")
    .select("*, poll_options(*)")
    .eq("id", id)
    .maybeSingle();

  throwSupabaseError(error, "Không thể lấy poll");

  if (!data) {
    return null;
  }

  return mapPublicPoll(data as PollWithOptionsRow);
}

export async function getOptionsByPollId(pollId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("poll_options")
    .select("*")
    .eq("poll_id", pollId)
    .order("order_index", { ascending: true });

  throwSupabaseError(error, "Không thể lấy options");

  return ((data ?? []) as PollOptionRow[]).map(mapOption);
}

export async function listAdminPolls() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("polls")
    .select("*")
    .order("created_at", { ascending: false });

  throwSupabaseError(error, "Không thể lấy danh sách poll");

  return ((data ?? []) as PollRow[]).map(mapPoll);
}

export async function createPoll(payload: PollInput) {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  const { data: poll, error: pollError } = await supabase
    .from("polls")
    .insert({
      title: payload.title,
      description: payload.description || null,
      slug: payload.slug,
      allow_multiple: payload.allowMultiple,
      max_selections: payload.maxSelections ?? null,
      status: payload.status,
      show_result_after_vote: payload.showResultAfterVote,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  throwSupabaseError(pollError, "Không thể tạo poll");

  const optionRows = normalizeOptions(payload.options).map((option) => ({
    poll_id: (poll as PollRow).id,
    label: option.label,
    image_url: option.image_url,
    order_index: option.order_index,
    created_at: now,
    updated_at: now,
  }));

  const { error: optionError } = await supabase.from("poll_options").insert(optionRows);

  if (optionError) {
    await supabase.from("polls").delete().eq("id", (poll as PollRow).id);
    throwSupabaseError(optionError, "Không thể tạo options");
  }

  const createdPoll = await getAdminPollById((poll as PollRow).id);

  if (!createdPoll) {
    throw new ApiError("POLL_NOT_FOUND", "Không tìm thấy poll vừa tạo", 500);
  }

  return createdPoll;
}

export async function updatePoll(id: string, payload: PollInput) {
  const supabase = getSupabaseAdmin();
  const existingPoll = await getAdminPollById(id);
  const now = new Date().toISOString();

  if (!existingPoll) {
    throw new ApiError("POLL_NOT_FOUND", "Không tìm thấy poll", 404);
  }

  const { error: pollError } = await supabase
    .from("polls")
    .update({
      title: payload.title,
      description: payload.description || null,
      slug: payload.slug,
      allow_multiple: payload.allowMultiple,
      max_selections: payload.maxSelections ?? null,
      status: payload.status,
      show_result_after_vote: payload.showResultAfterVote,
      updated_at: now,
    })
    .eq("id", id);

  throwSupabaseError(pollError, "Không thể cập nhật poll");

  const existingOptions = existingPoll.options;
  const existingIds = new Set(existingOptions.map((option) => option.id));
  const incomingExistingIds = new Set(
    payload.options
      .map((option) => option.id)
      .filter((optionId): optionId is string => Boolean(optionId)),
  );

  for (const option of payload.options) {
    if (option.id && !existingIds.has(option.id)) {
      throw new ApiError("INVALID_OPTION", "Option không thuộc poll này", 400);
    }
  }

  for (const option of existingOptions) {
    if (!incomingExistingIds.has(option.id)) {
      const { error } = await supabase
        .from("poll_options")
        .delete()
        .eq("id", option.id)
        .eq("poll_id", id);

      if (error?.code === "23503") {
        throw new ApiError(
          "OPTION_IN_USE",
          "Không thể xóa option đã có vote. Bạn có thể đổi tên hoặc đóng poll.",
          409,
        );
      }

      throwSupabaseError(error, "Không thể xóa option");
    }
  }

  const normalizedOptions = normalizeOptions(payload.options);

  for (const option of normalizedOptions) {
    if (option.id) {
      const { error } = await supabase
        .from("poll_options")
        .update({
          label: option.label,
          image_url: option.image_url,
          order_index: option.order_index,
          updated_at: now,
        })
        .eq("id", option.id)
        .eq("poll_id", id);

      throwSupabaseError(error, "Không thể cập nhật option");
    } else {
      const { error } = await supabase.from("poll_options").insert({
        poll_id: id,
        label: option.label,
        image_url: option.image_url,
        order_index: option.order_index,
        created_at: now,
        updated_at: now,
      });

      throwSupabaseError(error, "Không thể thêm option");
    }
  }

  const updatedPoll = await getAdminPollById(id);

  if (!updatedPoll) {
    throw new ApiError("POLL_NOT_FOUND", "Không tìm thấy poll sau khi cập nhật", 500);
  }

  return updatedPoll;
}

export async function deletePoll(id: string) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("polls").delete().eq("id", id);

  if (error?.code === "23503") {
    throw new ApiError(
      "POLL_HAS_DEPENDENCIES",
      "Không thể xóa poll vì dữ liệu vote còn ràng buộc",
      409,
    );
  }

  throwSupabaseError(error, "Không thể xóa poll");
}
