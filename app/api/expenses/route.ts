import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const expenseSchema = z.object({
  amount: z.number().positive(),
  categoryId: z.string(),
  bankId: z.string(),
  date: z.string().datetime().optional(),
  description: z.string().optional(),
  receiptQr: z.string().optional(),
})

export async function GET() {
  try {
    const expenses = await prisma.expense.findMany({
      include: {
        category: true,
        bank: true,
      },
      orderBy: {
        date: 'desc',
      },
    })
    return NextResponse.json(expenses)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch expenses' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = expenseSchema.parse(body)
    
    const expense = await prisma.expense.create({
      data: {
        amount: data.amount,
        categoryId: data.categoryId,
        bankId: data.bankId,
        date: data.date ? new Date(data.date) : new Date(),
        description: data.description,
        receiptQr: data.receiptQr,
      },
      include: {
        category: true,
        bank: true,
      },
    })
    
    return NextResponse.json(expense, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    return NextResponse.json(
      { error: 'Failed to create expense' },
      { status: 500 }
    )
  }
}

