import { NextResponse, type NextRequest } from "next/server";
import { assertAdminRequest } from "@/lib/admin-auth";
import { apiErrorResponse, requireJsonBody } from "@/lib/http";
import { pollInputSchema } from "@/lib/validators/poll.validator";
import { createPoll, listAdminPolls } from "@/services/poll.service";

export async function GET(request: NextRequest) {
  try {
    assertAdminRequest(request);
    const polls = await listAdminPolls();

    return NextResponse.json({ polls });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    assertAdminRequest(request);
    const rawBody = requireJsonBody(await request.json().catch(() => null));
    const payload = pollInputSchema.parse(rawBody);
    const poll = await createPoll(payload);

    return NextResponse.json({ success: true, poll }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
