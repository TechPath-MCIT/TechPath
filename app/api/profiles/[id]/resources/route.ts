// app/api/profiles/[id]/resources/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import * as profiles from '@/services/profiles';

interface RouteContext {
    params: Promise<{ id: string }>
}

/**
 * @swagger
 * /api/profiles/{id}/resources:
 *   get:
 *     tags:
 *       - Resources of Profiles
 *     summary: Get a profile's resources, optionally filtered by status
 *     description:
 *       Returns the resources associated with a profile (via profile_resource),
 *       including the underlying resource row and its linked status. Pass a
 *       statusId query param to filter to a single status.
 *     parameters:
 *        - name: id
 *          in: path
 *          required: true
 *          description: id of the profile to look up
 *          schema:
 *              type: string
 *        - name: statusId
 *          in: query
 *          required: false
 *          description: resource_status.status_id to filter by
 *          schema:
 *              type: number
 *        - name: type
 *          in: query
 *          required: false
 *          description: resource_type to filter by (e.g. "course")
 *          schema:
 *              type: string
 *     responses:
 *       200:
 *         description: Successfully fetched the profile's resources.
 *       400:
 *         description: Missing or invalid profile id (or statusId).
 *       500:
 *         description: Core internal server network execution block.
 */
export async function GET(request: NextRequest, context: RouteContext) {
    try {
        const resolved_params = await context.params;
        const profile_id = Number(resolved_params.id);
        if (!Number.isInteger(profile_id)) {
            return NextResponse.json({ success: false, error: "A valid profile id is required." }, { status: 400 });
        }

        const statusParam = request.nextUrl.searchParams.get("statusId");
        let statusId: number | undefined;

        if (statusParam !== null) {
            statusId = Number(statusParam);
            if (!Number.isInteger(statusId)) {
                return NextResponse.json({ success: false, error: "statusId must be a valid integer." }, { status: 400 });
            }
        }

        const resourceType = request.nextUrl.searchParams.get("type") ?? undefined;

        const resources = await profiles.getResourcesByProfile(profile_id, statusId, resourceType);

        return NextResponse.json({ success: true, data: resources }, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

/**
 * @swagger
 * /api/profiles/{id}/resources:
 *   put:
 *     tags:
 *       - Resources of Profiles
 *     summary: Set the status of a resource for a profile
 *     description:
 *       Upserts the profile_resource link for the given (profile, resource) pair,
 *       setting its status. Updates the row if it already exists, otherwise inserts it.
 *     parameters:
 *        - name: id
 *          in: path
 *          required: true
 *          description: id of the profile to update
 *          schema:
 *              type: string
 *        - name: resourceId
 *          in: query
 *          required: true
 *          description: id of the resource to set status for
 *          schema:
 *              type: string
 *        - name: statusId
 *          in: query
 *          required: true
 *          description: resource_status.status_id to set
 *          schema:
 *              type: number
 *        - name: complete
 *          in: query
 *          required: false
 *          description:
 *            When "true", also links the resource's associated skills to the
 *            profile (and appends their names to the profile's skills field)
 *            in addition to setting the status.
 *          schema:
 *              type: boolean
 *     responses:
 *       200:
 *         description: Successfully set the resource status for the profile.
 *       400:
 *         description: Missing or invalid profile id, resourceId, or statusId.
 *       500:
 *         description: Core internal server network execution block.
 */
export async function PUT(request: NextRequest, context: RouteContext) {
    try {
        const resolved_params = await context.params;
        const profile_id = Number(resolved_params.id);
        if (!Number.isInteger(profile_id)) {
            return NextResponse.json({ success: false, error: "A valid profile id is required." }, { status: 400 });
        }

        const resourceId = request.nextUrl.searchParams.get("resourceId");
        const statusParam = request.nextUrl.searchParams.get("statusId");
        const statusId = Number(statusParam);
        const complete = request.nextUrl.searchParams.get("complete") === "true";

        if (typeof resourceId !== "string" || resourceId.length === 0) {
            return NextResponse.json({ success: false, error: "resourceId is required." }, { status: 400 });
        }

        if (statusParam === null || !Number.isInteger(statusId)) {
            return NextResponse.json({ success: false, error: "statusId must be a valid integer." }, { status: 400 });
        }

        const result = complete
            ? await profiles.completeResourceForProfile(profile_id, resourceId, statusId)
            : await profiles.setResourceStatusForProfile(profile_id, resourceId, statusId);

        return NextResponse.json({ success: true, data: result }, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
