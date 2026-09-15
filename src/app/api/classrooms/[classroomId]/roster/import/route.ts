import { NextResponse } from "next/server";

import { apiError, notFound, unauthorized } from "#/lib/api-error";
import { getClassroomRole, getCurrentUser } from "#/lib/auth";
import { importRoster } from "#/services/roster-service";

export async function POST(request: Request, { params }: { params: Promise<{ classroomId: string }> }) {
  const { classroomId: classroomIdParam } = await params;
  const classroomId = Number(classroomIdParam);

  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const role = await getClassroomRole(classroomId, user.id);
  if (role !== "INSTRUCTOR") return notFound("Classroom not found.");

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof Blob)) {
    return apiError(400, "INVALID_BODY", "file is required (multipart/form-data).");
  }

  const csvText = await file.text();
  const result = await importRoster(classroomId, csvText);

  if (result.errors.length > 0) {
    // FR-CLASS-02: atomic — nothing was written, every bad row is reported.
    return apiError(400, "IMPORT_INVALID", "CSV มีข้อผิดพลาด ไม่มีการนำเข้าข้อมูลใด ๆ", result.errors);
  }

  return NextResponse.json(result, { status: 201 });
}
