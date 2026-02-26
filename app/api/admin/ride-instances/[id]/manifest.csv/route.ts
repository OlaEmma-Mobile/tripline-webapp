import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/features/admin/admin-auth';
import { adminOpsService } from '@/lib/features/admin-ops/admin-ops.service';
import { AppError } from '@/lib/utils/errors';

/**
 * GET /api/admin/ride-instances/[id]/manifest.csv
 * Exports ride passenger manifest as CSV.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    requireAdminAuth(request);
    const { id } = await context.params;
    const csv = await adminOpsService.getManifestCsv(id);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="ride-manifest-${id}.csv"`,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        {
          hasError: true,
          data: null,
          message: error.message,
          description: error.status === 403 ? 'Only admin roles can access this resource' : 'Unable to export manifest',
          errors: {},
        },
        { status: error.status }
      );
    }

    return NextResponse.json(
      {
        hasError: true,
        data: null,
        message: 'Unable to export manifest',
        description: 'Unexpected server error',
        errors: {},
      },
      { status: 500 }
    );
  }
}
