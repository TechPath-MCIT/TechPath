import { type NextRequest, NextResponse } from "next/server";
import { getResources } from "@/services/resources";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const type = request.nextUrl.searchParams.get("type") ?? undefined;
    const source = request.nextUrl.searchParams.get("source") ?? undefined;

    const limitParam = request.nextUrl.searchParams.get("limit");
    const limit = limitParam === null ? 50 : Number(limitParam);

    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      return NextResponse.json(
        {
          success: false,
          error: "limit must be an integer between 1 and 100.",
        },
        { status: 400 },
      );
    }

    const resources = await getResources({
      type,
      source,
      limit,
    });

    return NextResponse.json(
      {
        success: true,
        count: resources.length,
        data: resources,
      },
      { status: 200 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch resources.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 },
    );
  }
}