import { createHash } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import { ApiError } from "./errors";

export const ADMIN_COOKIE_NAME = "mini_vote_admin";

function getAdminPassword() {
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    throw new ApiError("ADMIN_NOT_CONFIGURED", "Thiếu ADMIN_PASSWORD", 500);
  }

  return password;
}

function getAdminSecret() {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    "mini-vote-local-secret"
  );
}

export function getAdminSessionValue() {
  const password = getAdminPassword();

  return createHash("sha256")
    .update(`${password}:${getAdminSecret()}`)
    .digest("hex");
}

export function assertAdminRequest(request: NextRequest) {
  const session = request.cookies.get(ADMIN_COOKIE_NAME)?.value;

  if (!session || session !== getAdminSessionValue()) {
    throw new ApiError("UNAUTHORIZED", "Bạn cần đăng nhập admin", 401);
  }
}

export function verifyAdminPassword(password: string) {
  return password === getAdminPassword();
}

export function setAdminCookie(response: NextResponse) {
  response.cookies.set(ADMIN_COOKIE_NAME, getAdminSessionValue(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export function clearAdminCookie(response: NextResponse) {
  response.cookies.set(ADMIN_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
