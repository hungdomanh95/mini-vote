import { NextResponse, type NextRequest } from "next/server";
import { assertAdminRequest } from "@/lib/admin-auth";
import { apiErrorResponse, requireJsonBody } from "@/lib/http";
import { pollIdSchema, pollInputSchema } from "@/lib/validators/poll.validator";
import { deletePoll, getAdminPollById, updatePoll } from "@/services/poll.service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    assertAdminRequest(request);
    const { id } = await context.params;
    const pollId = pollIdSchema.parse(id);
    const poll = await getAdminPollById(pollId);

    if (!poll) {
      return NextResponse.json(
        {
          success: false,
          code: "POLL_NOT_FOUND",
          message: "Không tìm thấy poll",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({ poll });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    assertAdminRequest(request);
    const { id } = await context.params;
    const pollId = pollIdSchema.parse(id);
    const rawBody = requireJsonBody(await request.json().catch(() => null));
    const payload = pollInputSchema.parse(rawBody);
    const poll = await updatePoll(pollId, payload);

    return NextResponse.json({ success: true, poll });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    assertAdminRequest(request);
    const { id } = await context.params;
    const pollId = pollIdSchema.parse(id);
    await deletePoll(pollId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
