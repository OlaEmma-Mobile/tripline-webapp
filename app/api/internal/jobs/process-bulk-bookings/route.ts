import { NextRequest, NextResponse } from 'next/server';
import { bulkBookingsService } from '@/lib/features/bulk-bookings/bulk-bookings.service';
import { errorResponse, jsonResponse } from '@/lib/utils/responses';

function assertCronSecret(request: NextRequest): void {
  const expected = process.env.CRON_SECRET;
  if (!expected || request.headers.get('x-cron-secret') !== expected) {
    throw new Error('FORBIDDEN');
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    assertCronSecret(request);
    const data = await bulkBookingsService.processPendingOccurrences();
    return jsonResponse(data, 'Bulk booking job processed', 'Pending bulk booking occurrences processed successfully');
  } catch (error) {
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return errorResponse('Forbidden', 'Cron secret is invalid', 403);
    }

    return errorResponse('Unable to process bulk bookings', 'Unexpected server error', 500);
  }
}
