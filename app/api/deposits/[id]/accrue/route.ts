import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { addMonths, isBefore } from 'date-fns'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const deposit = await prisma.deposit.findUnique({
      where: { id },
      include: {
        transactions: true,
        autoAccrual: true,
      },
    })
    
    if (!deposit) {
      return NextResponse.json(
        { error: 'Deposit not found' },
        { status: 404 }
      )
    }
    
    if (deposit.status !== 'active') {
      return NextResponse.json(
        { error: 'Deposit is not active' },
        { status: 400 }
      )
    }
    
    const autoAccrual = deposit.autoAccrual
    if (!autoAccrual || !autoAccrual.isActive) {
      return NextResponse.json(
        { error: 'Auto accrual is not active' },
        { status: 400 }
      )
    }
    
    const now = new Date()
    if (autoAccrual.nextProcessDate && isBefore(now, autoAccrual.nextProcessDate)) {
      return NextResponse.json(
        { error: 'It is not time for next accrual yet' },
        { status: 400 }
      )
    }
    
    // Рассчитываем текущий баланс
    const currentBalance = deposit.transactions.reduce((sum: number, t: { type: string; amount: number }) => {
      return sum + (t.type === 'interest' ? t.amount : t.type === 'principal' ? t.amount : 0)
    }, deposit.initialAmount)
    
    // Рассчитываем проценты за период
    const annualRate = deposit.interestRate / 100
    const periodsPerYear = deposit.frequency === 'monthly' ? 12 
      : deposit.frequency === 'quarterly' ? 4 
      : 1
    const ratePerPeriod = annualRate / periodsPerYear
    const interestAmount = currentBalance * ratePerPeriod
    
    // Создаем транзакцию начисления процентов
    const transaction = await prisma.depositTransaction.create({
      data: {
        depositId: deposit.id,
        amount: interestAmount,
        type: 'interest',
        date: now,
        description: `Автоматическое начисление процентов (${deposit.frequency})`,
      },
    })
    
    // Обновляем дату следующего начисления
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
    
    return NextResponse.json({
      transaction,
      nextProcessDate,
      newBalance: currentBalance + interestAmount,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to accrue interest' },
      { status: 500 }
    )
  }
}

