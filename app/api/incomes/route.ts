import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const incomeSchema = z.object({
  amount: z.number().positive(),
  sourceId: z.string(),
  bankId: z.string(),
  date: z.string().datetime().optional(),
  description: z.string().optional(),
})

export async function GET() {
  try {
    const incomes = await prisma.income.findMany({
      include: {
        source: true,
        bank: true,
      },
      orderBy: {
        date: 'desc',
      },
    })
    return NextResponse.json(incomes)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch incomes' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = incomeSchema.parse(body)
    
    const income = await prisma.income.create({
      data: {
        amount: data.amount,
        sourceId: data.sourceId,
        bankId: data.bankId,
        date: data.date ? new Date(data.date) : new Date(),
        description: data.description,
      },
      include: {
        source: true,
        bank: true,
      },
    })
    
    return NextResponse.json(income, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    return NextResponse.json(
      { error: 'Failed to create income' },
      { status: 500 }
    )
  }
}

