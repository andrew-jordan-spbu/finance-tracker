import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { addMonths, addDays } from 'date-fns'

const depositSchema = z.object({
  name: z.string().min(1),
  initialAmount: z.number().positive(),
  interestRate: z.number().positive(),
  termMonths: z.number().int().positive(),
  startDate: z.string().datetime().optional(),
  capitalization: z.boolean().optional(),
  frequency: z.enum(['monthly', 'quarterly', 'annually']).optional(),
})

// Функция расчета процентов по депозиту
function calculateInterest(
  principal: number,
  rate: number,
  months: number,
  capitalization: boolean,
  frequency: 'monthly' | 'quarterly' | 'annually'
): { totalAmount: number; interest: number; breakdown: Array<{ month: number; principal: number; interest: number; total: number }> } {
  const annualRate = rate / 100
  let currentPrincipal = principal
  const breakdown: Array<{ month: number; principal: number; interest: number; total: number }> = []
  
  const periodsPerYear = frequency === 'monthly' ? 12 : frequency === 'quarterly' ? 4 : 1
  const ratePerPeriod = annualRate / periodsPerYear
  const totalPeriods = months / (12 / periodsPerYear)
  
  if (capitalization) {
    for (let period = 0; period < totalPeriods; period++) {
      const interest = currentPrincipal * ratePerPeriod
      currentPrincipal += interest
      
      if (frequency === 'monthly') {
        breakdown.push({
          month: period + 1,
          principal: currentPrincipal - interest,
          interest,
          total: currentPrincipal,
        })
      } else if (frequency === 'quarterly' && (period + 1) % 3 === 0) {
        breakdown.push({
          month: (period + 1) * 3,
          principal: currentPrincipal - interest,
          interest,
          total: currentPrincipal,
        })
      } else if (frequency === 'annually' && (period + 1) % 12 === 0) {
        breakdown.push({
          month: (period + 1) * 12,
          principal: currentPrincipal - interest,
          interest,
          total: currentPrincipal,
        })
      }
    }
  } else {
    const totalInterest = principal * annualRate * (months / 12)
    currentPrincipal = principal + totalInterest
    breakdown.push({
      month: months,
      principal,
      interest: totalInterest,
      total: currentPrincipal,
    })
  }
  
  return {
    totalAmount: currentPrincipal,
    interest: currentPrincipal - principal,
    breakdown,
  }
}

export async function GET() {
  try {
    const deposits = await prisma.deposit.findMany({
      include: {
        transactions: {
          orderBy: {
            date: 'desc',
          },
        },
        autoAccrual: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
    return NextResponse.json(deposits)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch deposits' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = depositSchema.parse(body)
    
    const startDate = data.startDate ? new Date(data.startDate) : new Date()
    const calculation = calculateInterest(
      data.initialAmount,
      data.interestRate,
      data.termMonths,
      data.capitalization ?? true,
      data.frequency ?? 'monthly'
    )
    
    const deposit = await prisma.deposit.create({
      data: {
        name: data.name,
        initialAmount: data.initialAmount,
        interestRate: data.interestRate,
        termMonths: data.termMonths,
        startDate,
        capitalization: data.capitalization ?? true,
        frequency: data.frequency ?? 'monthly',
        status: 'active',
      },
    })
    
    // Создаем настройки автоматического начисления
    const nextProcessDate = data.frequency === 'monthly' 
      ? addMonths(startDate, 1)
      : data.frequency === 'quarterly'
      ? addMonths(startDate, 3)
      : addMonths(startDate, 12)
    
    await prisma.autoAccrual.create({
      data: {
        depositId: deposit.id,
        isActive: true,
        nextProcessDate,
      },
    })
    
    return NextResponse.json({
      ...deposit,
      calculation,
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    return NextResponse.json(
      { error: 'Failed to create deposit' },
      { status: 500 }
    )
  }
}

// GET endpoint для расчета депозита
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { initialAmount, interestRate, termMonths, capitalization, frequency } = body
    
    if (!initialAmount || !interestRate || !termMonths) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }
    
    const calculation = calculateInterest(
      initialAmount,
      interestRate,
      termMonths,
      capitalization ?? true,
      frequency ?? 'monthly'
    )
    
    return NextResponse.json(calculation)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to calculate deposit' },
      { status: 500 }
    )
  }
}

