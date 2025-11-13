import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const linkSchema = z.object({
  sourceId: z.string().min(1),
  targetId: z.string().min(1),
  type: z.string().default('reference'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = linkSchema.parse(body)
    if (data.sourceId === data.targetId) {
      return NextResponse.json({ error: 'Cannot link note to itself' }, { status: 400 })
    }
    const link = await prisma.noteLink.create({
      data,
    })
    return NextResponse.json(link, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create link' }, { status: 500 })
  }
}


