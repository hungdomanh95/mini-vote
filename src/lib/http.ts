import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ApiError, isApiError } from "./errors";

export function apiErrorResponse(error: unknown) {
  if (isApiError(error)) {
    return NextResponse.json(
      {
        success: false,
        code: error.code,
        message: error.message,
      },
      { status: error.status },
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        success: false,
        code: "VALIDATION_ERROR",
        message: error.issues[0]?.message ?? "Dữ liệu không hợp lệ",
      },
      { status: 422 },
    );
  }

  console.error(error);

  return NextResponse.json(
    {
      success: false,
      code: "INTERNAL_ERROR",
      message: "Có lỗi xảy ra. Vui lòng thử lại sau.",
    },
    { status: 500 },
  );
}

export function requireJsonBody(value: unknown) {
  if (!value || typeof value !== "object") {
    throw new ApiError("INVALID_JSON", "Body JSON không hợp lệ", 400);
  }

  return value;
}
