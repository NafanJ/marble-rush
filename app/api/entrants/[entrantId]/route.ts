import { NextRequest, NextResponse } from 'next/server';
import { deleteEntrant } from '@/lib/db/entrants';

function checkAdmin(req: NextRequest): boolean {
  return req.headers.get('x-admin-password') === process.env.ADMIN_PASSWORD;
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { entrantId: string } }
) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const ok = await deleteEntrant(params.entrantId);
    if (!ok) {
      return NextResponse.json({ error: 'Failed to delete entrant' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
