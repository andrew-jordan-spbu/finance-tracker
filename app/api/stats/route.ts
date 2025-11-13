import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'month' // month, year, all
    
    const now = new Date()
    let startDate: Date
    let endDate: Date = now
    
    switch (period) {
      case 'month':
        startDate = startOfMonth(now)
        endDate = endOfMonth(now)
        break
      case 'year':
        startDate = startOfYear(now)
        endDate = endOfYear(now)
        break
      default:
        startDate = new Date(0) // Все время
    }
    
    // Получаем доходы за период
    let incomes: Array<{ amount: number }> = []
    try {
      incomes = await prisma.income.findMany({
        where: {
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
      })
    } catch (err) {
      console.error('Error fetching incomes:', err)
    }
    
    // Получаем расходы за период
    let expenses: Array<{ amount: number; category: { name: string; color?: string } | null }> = []
    try {
      expenses = await prisma.expense.findMany({
        where: {
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          category: true,
        },
      })
    } catch (err) {
      console.error('Error fetching expenses:', err)
    }
    
    // Рассчитываем статистику
    const totalIncome = incomes.reduce((sum: number, income: { amount: number }) => sum + income.amount, 0)
    const totalExpenses = expenses.reduce((sum: number, expense: { amount: number }) => sum + expense.amount, 0)
    const balance = totalIncome - totalExpenses
    
    // Расходы по категориям
    const expensesByCategory = expenses.reduce((acc: Record<string, { name: string; amount: number; color: string; count: number }>, expense) => {
      if (!expense.category) {
        return acc
      }
      const categoryName = expense.category.name
      if (!acc[categoryName]) {
        acc[categoryName] = {
          name: categoryName,
          amount: 0,
          color: expense.category.color || '#3b82f6',
          count: 0,
        }
      }
      acc[categoryName].amount += expense.amount
      acc[categoryName].count += 1
      return acc
    }, {} as Record<string, { name: string; amount: number; color: string; count: number }>)
    
    // Доходы по источникам
    let sourceDetails: Array<{ name: string; amount: number; count: number }> = []
    try {
      const incomesBySource = await prisma.income.groupBy({
        by: ['sourceId'],
        where: {
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        _sum: {
          amount: true,
        },
        _count: {
          id: true,
        },
      })
      
      sourceDetails = await Promise.all(
        incomesBySource.map(async (item) => {
          const source = await prisma.incomeSource.findUnique({
            where: { id: item.sourceId },
          })
          return {
            name: source?.name || 'Unknown',
            amount: item._sum.amount || 0,
            count: item._count.id,
          }
        })
      )
    } catch (groupByError) {
      console.warn('Failed to group incomes by source, continuing without this data:', groupByError)
      sourceDetails = []
    }
    
    return NextResponse.json({
      period,
      summary: {
        totalIncome,
        totalExpenses,
        balance,
        transactionCount: incomes.length + expenses.length,
      },
      expensesByCategory: Object.values(expensesByCategory),
      incomesBySource: sourceDetails,
      trends: {
        // Можно добавить тренды по месяцам
      },
    })
  } catch (error) {
    console.error('Stats API error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch statistics',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

