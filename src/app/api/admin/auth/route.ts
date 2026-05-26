import { NextResponse, type NextRequest } from "next/server";
import { clearAdminCookie, setAdminCookie, verifyAdminPassword } from "@/lib/admin-auth";
import { ApiError } from "@/lib/errors";
import { apiErrorResponse, requireJsonBody } from "@/lib/http";
import { adminLoginSchema } from "@/lib/validators/admin.validator";

export async function POST(request: NextRequest) {
  try {
    const rawBody = requireJsonBody(await request.json().catch(() => null));
    const { password } = adminLoginSchema.parse(rawBody);

    if (!verifyAdminPassword(password)) {
      throw new ApiError("INVALID_PASSWORD", "Mật khẩu admin không đúng", 401);
    }

    const response = NextResponse.json({ success: true });
    setAdminCookie(response);

    return response;
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  clearAdminCookie(response);

  return response;
}
