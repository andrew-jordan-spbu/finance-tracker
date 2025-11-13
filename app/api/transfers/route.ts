import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const transferSchema = z.object({
  amount: z.number().positive(),
  fromBankId: z.string(),
  toBankId: z.string(),
  date: z.string().datetime().optional(),
  description: z.string().optional(),
}).refine((data) => data.fromBankId !== data.toBankId, {
  message: "From and to banks must be different",
  path: ["toBankId"],
})

export async function GET() {
  try {
    const transfers = await prisma.transfer.findMany({
      include: {
        fromBank: true,
        toBank: true,
      },
      orderBy: {
        date: 'desc',
      },
    })
    return NextResponse.json(transfers)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch transfers' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = transferSchema.parse(body)
    
    // Создаем перевод в транзакции
    const transfer = await prisma.$transaction(async (tx) => {
      // Проверяем существование банков
      const fromBank = await tx.bank.findUnique({
        where: { id: data.fromBankId },
      })
      const toBank = await tx.bank.findUnique({
        where: { id: data.toBankId },
      })

      if (!fromBank || !toBank) {
        throw new Error('One or both banks not found')
      }

      // Создаем перевод
      return await tx.transfer.create({
        data: {
          amount: data.amount,
          fromBankId: data.fromBankId,
          toBankId: data.toBankId,
          date: data.date ? new Date(data.date) : new Date(),
          description: data.description,
        },
        include: {
          fromBank: true,
          toBank: true,
        },
      })
    })
    
    return NextResponse.json(transfer, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create transfer' },
      { status: 500 }
    )
  }
}

