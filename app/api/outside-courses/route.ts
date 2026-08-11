import { type NextRequest, NextResponse } from "next/server";
import { getOutsideCourses } from "@/services/outsideCourses";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const limitParam = request.nextUrl.searchParams.get("limit");
    const limit = limitParam === null ? 150 : Number(limitParam);

    if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
      return NextResponse.json(
        {
          success: false,
          error: "limit must be an integer between 1 and 500.",
        },
        { status: 400 },
      );
    }

    const data = await getOutsideCourses({ limit });

    return NextResponse.json(
      {
        success: true,
        count: data.length,
        data,
      },
      { status: 200 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch outside courses.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
