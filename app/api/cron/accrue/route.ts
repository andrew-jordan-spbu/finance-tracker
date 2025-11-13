import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { addMonths, isBefore } from 'date-fns'

/**
 * API endpoint для автоматического начисления процентов
 * Можно вызывать через cron job или по расписанию
 */
export async function POST(request: NextRequest) {
  try {
    // Проверка секретного ключа (для безопасности)
    const authHeader = request.headers.get('authorization')
    const secret = process.env.CRON_SECRET || 'secret-key-change-in-production'
    
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const deposits = await prisma.deposit.findMany({
      where: {
        status: 'active',
      },
      include: {
        autoAccrual: true,
        transactions: true,
      },
    })

    const now = new Date()
    let processedCount = 0

    for (const deposit of deposits) {
      const autoAccrual = deposit.autoAccrual

      if (!autoAccrual || !autoAccrual.isActive) {
        continue
      }

      if (autoAccrual.nextProcessDate && isBefore(now, autoAccrual.nextProcessDate)) {
        continue
      }

      const currentBalance = deposit.transactions.reduce((sum: number, t: { type: string; amount: number }) => {
        return sum + (t.type === 'interest' || t.type === 'principal' ? t.amount : 0)
      }, deposit.initialAmount)

      const annualRate = deposit.interestRate / 100
      const periodsPerYear = deposit.frequency === 'monthly' ? 12 
        : deposit.frequency === 'quarterly' ? 4 
        : 1
      const ratePerPeriod = annualRate / periodsPerYear
      const interestAmount = currentBalance * ratePerPeriod

      await prisma.depositTransaction.create({
        data: {
          depositId: deposit.id,
          amount: interestAmount,
          type: 'interest',
          date: now,
          description: `Автоматическое начисление процентов (${deposit.frequency})`,
        },
      })

      const nextProcessDate = deposit.frequency === 'monthly'
        ? addMonths(now, 1)
        : deposit.frequency === 'quarterly'
        ? addMonths(now, 3)
        : addMonths(now, 12)

      await prisma.autoAccrual.update({
        where: { id: autoAccrual.id },
        data: {
          lastProcessed: now,
          nextProcessDate,
        },
      })

      processedCount++
    }

    return NextResponse.json({
      success: true,
      processedCount,
      timestamp: now.toISOString(),
    })
  } catch (error) {
    console.error('Ошибка при начислении процентов:', error)
    return NextResponse.json(
      { error: 'Failed to accrue deposits' },
      { status: 500 }
    )
  }
}

// GET для тестирования (без авторизации в dev режиме)
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
  }

  // Тестовый вызов в dev режиме
  return POST(new NextRequest('http://localhost/api/cron/accrue', {
    method: 'POST',
    headers: {
      'authorization': `Bearer ${process.env.CRON_SECRET || 'secret-key-change-in-production'}`,
    },
  }))
}

