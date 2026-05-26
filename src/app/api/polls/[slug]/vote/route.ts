import { NextResponse, type NextRequest } from "next/server";
import { apiErrorResponse, requireJsonBody } from "@/lib/http";
import { submitVoteSchema, slugSchema } from "@/lib/validators/vote.validator";
import { submitVote } from "@/services/vote.service";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const parsedSlug = slugSchema.parse(slug);
    const rawBody = requireJsonBody(await request.json().catch(() => null));
    const body = submitVoteSchema.parse(rawBody);
    const vote = await submitVote(parsedSlug, body);

    return NextResponse.json({
      success: true,
      voteId: vote.id,
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
