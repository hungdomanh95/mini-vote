import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { assertAdminRequest } from "@/lib/admin-auth";
import { ApiError } from "@/lib/errors";
import { apiErrorResponse } from "@/lib/http";
import { getSupabaseAdmin } from "@/lib/supabase/server";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_SIZE = 2 * 1024 * 1024;
const BUCKET = "poll-options";

function cleanFileName(fileName: string) {
  return fileName.toLowerCase().replace(/[^a-z0-9.\-_]+/g, "-");
}

export async function POST(request: NextRequest) {
  try {
    assertAdminRequest(request);

    const formData = await request.formData();
    const file = formData.get("file");
    const pollId = String(formData.get("pollId") || "draft");

    if (!(file instanceof File)) {
      throw new ApiError("FILE_REQUIRED", "Bạn cần chọn file hình", 422);
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      throw new ApiError("INVALID_FILE_TYPE", "Chỉ hỗ trợ JPEG, PNG hoặc WebP", 422);
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new ApiError("FILE_TOO_LARGE", "File không được vượt quá 2MB", 422);
    }

    const extension = cleanFileName(file.name).split(".").pop() || "png";
    const storagePath = `${pollId}/${randomUUID()}.${extension}`;
    const supabase = getSupabaseAdmin();
    const bytes = Buffer.from(await file.arrayBuffer());
    const { error } = await supabase.storage.from(BUCKET).upload(storagePath, bytes, {
      contentType: file.type,
      upsert: false,
    });

    if (error) {
      throw new ApiError("UPLOAD_FAILED", error.message, 500);
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

    return NextResponse.json({
      success: true,
      path: storagePath,
      publicUrl: data.publicUrl,
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
