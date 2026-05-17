import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { updateEntrantTexture } from '@/lib/db/entrants';
import { MAX_IMAGE_SIZE_BYTES, ALLOWED_IMAGE_TYPES } from '@/lib/constants';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const raceId = formData.get('raceId') as string | null;
    const entrantId = formData.get('entrantId') as string | null;

    if (!file || !raceId || !entrantId) {
      return NextResponse.json(
        { error: 'file, raceId, and entrantId are required' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Only JPEG, PNG, or WebP images are allowed' },
        { status: 400 }
      );
    }

    // No SVG
    if (file.type.includes('svg')) {
      return NextResponse.json({ error: 'SVG files are not allowed' }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'Image must be under 2MB' },
        { status: 400 }
      );
    }

    // Determine extension
    const extMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    };
    const ext = extMap[file.type] ?? 'jpg';
    const timestamp = Date.now();
    const path = `${raceId}/${entrantId}/${timestamp}.${ext}`;

    // Upload to Supabase Storage
    const buffer = await file.arrayBuffer();
    const { error: uploadError } = await supabaseAdmin.storage
      .from('marble-textures')
      .upload(path, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload image' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('marble-textures')
      .getPublicUrl(path);

    const publicUrl = urlData.publicUrl;

    // Update entrant record
    await updateEntrantTexture(entrantId, publicUrl);

    return NextResponse.json({ url: publicUrl });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
