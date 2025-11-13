import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData()
    const file = form.get('file') as File | null
    const noteId = form.get('noteId') as string | null

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 })
    }

    // Сохраняем файл в /public/uploads
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const uploadsDir = join(process.cwd(), 'public', 'uploads')
    await mkdir(uploadsDir, { recursive: true })

    const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const filepath = join(uploadsDir, safeName)
    await writeFile(filepath, buffer)

    const url = `/uploads/${safeName}`
    const asset = await prisma.asset.create({
      data: {
        noteId: noteId || undefined,
        filename: file.name,
        mimeType: file.type,
        size: file.size,
        url,
      },
    })

    return NextResponse.json(asset, { status: 201 })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const assets = await prisma.asset.findMany({
      orderBy: { createdAt: 'desc' },
      include: { note: true },
    })
    return NextResponse.json(assets)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch files' }, { status: 500 })
  }
}


