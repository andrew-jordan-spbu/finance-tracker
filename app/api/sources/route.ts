import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const sourceSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
})

export async function GET() {
  try {
    const sources = await prisma.incomeSource.findMany({
      orderBy: {
        name: 'asc',
      },
    })
    return NextResponse.json(sources)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch income sources' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = sourceSchema.parse(body)
    
    const source = await prisma.incomeSource.create({
      data,
    })
    
    return NextResponse.json(source, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'Income source with this name already exists' },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to create income source' },
      { status: 500 }
    )
  }
}

