import { NextResponse, type NextRequest } from "next/server";
import { assertAdminRequest } from "@/lib/admin-auth";
import { apiErrorResponse } from "@/lib/http";
import { pollIdSchema } from "@/lib/validators/poll.validator";
import { voteIdSchema } from "@/lib/validators/vote.validator";
import { deleteVote } from "@/services/vote.service";

type RouteContext = {
  params: Promise<{ id: string; voteId: string }>;
};

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    assertAdminRequest(request);
    const { id, voteId } = await context.params;
    const pollId = pollIdSchema.parse(id);
    const parsedVoteId = voteIdSchema.parse(voteId);

    await deleteVote(pollId, parsedVoteId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
