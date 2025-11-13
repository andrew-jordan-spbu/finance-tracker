import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const bankSchema = z.object({
  name: z.string().min(1),
  color: z.string().optional(),
})

export async function GET() {
  try {
    const banks = await prisma.bank.findMany({
      orderBy: {
        name: 'asc',
      },
    })
    return NextResponse.json(banks)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch banks' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = bankSchema.parse(body)
    
    const bank = await prisma.bank.create({
      data,
    })
    
    return NextResponse.json(bank, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'Bank with this name already exists' },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to create bank' },
      { status: 500 }
    )
  }
}

