import { NextResponse, type NextRequest } from "next/server";
import { assertAdminRequest } from "@/lib/admin-auth";
import { apiErrorResponse } from "@/lib/http";
import { pollIdSchema } from "@/lib/validators/poll.validator";
import { getAdminPollResultById } from "@/services/result.service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    assertAdminRequest(request);
    const { id } = await context.params;
    const pollId = pollIdSchema.parse(id);
    const result = await getAdminPollResultById(pollId);

    if (!result) {
      return NextResponse.json(
        {
          success: false,
          code: "POLL_NOT_FOUND",
          message: "Không tìm thấy poll",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({ result });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
