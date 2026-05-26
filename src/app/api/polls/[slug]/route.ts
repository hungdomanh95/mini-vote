import { NextResponse, type NextRequest } from "next/server";
import { apiErrorResponse } from "@/lib/http";
import { slugSchema } from "@/lib/validators/vote.validator";
import { getPublicPoll } from "@/services/poll.service";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const parsedSlug = slugSchema.parse(slug);
    const poll = await getPublicPoll(parsedSlug);

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

    return NextResponse.json(poll);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
