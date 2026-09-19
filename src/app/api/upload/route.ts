// ============================================
// SpotFish! — Photo Upload API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { getCurrentUser } from '@/lib/auth';
import { randomUUID } from 'crypto';

// Allowed image types
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const spotId = formData.get('spot_id') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'File type not allowed. Use JPEG, PNG, WebP, or GIF' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum 5MB' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `${Date.now()}-${randomUUID().substring(0, 8)}.${ext}`;
    
    // Create upload directory for this spot or general
    const uploadDir = spotId 
      ? join(process.cwd(), 'public', 'uploads', 'spots', spotId)
      : join(process.cwd(), 'public', 'uploads', 'spots');
    
    await mkdir(uploadDir, { recursive: true });

    // Convert file to buffer and write
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    const filepath = join(uploadDir, filename);
    await writeFile(filepath, buffer);

    // Return the public URL
    const url = spotId
      ? `/uploads/spots/${spotId}/${filename}`
      : `/uploads/spots/${filename}`;

    return NextResponse.json({
      url,
      filename,
      size: file.size,
      type: file.type,
    }, { status: 201 });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}

// DELETE /api/upload?url=xxx — Delete uploaded file
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Security: only allow deleting files from our uploads directory
    if (!url.startsWith('/uploads/')) {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    // Convert URL to file path
    const filepath = join(process.cwd(), 'public', url);

    // Security: resolve to ensure no path traversal
    const resolvedPath = filepath.replace(/\/+/g, '/');
    const publicDir = join(process.cwd(), 'public', 'uploads');
    if (!resolvedPath.startsWith(publicDir)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    // Delete file
    const { unlink } = await import('fs/promises');
    try {
      await unlink(filepath);
    } catch {
      // File might not exist, that's ok
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}
