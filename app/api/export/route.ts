import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all' // all, incomes, expenses, deposits

    let data: any = {}

    if (type === 'all' || type === 'incomes') {
      const incomes = await prisma.income.findMany({
        include: {
          source: true,
        },
        orderBy: {
          date: 'desc',
        },
      })
      data.incomes = incomes
    }

    if (type === 'all' || type === 'expenses') {
      const expenses = await prisma.expense.findMany({
        include: {
          category: true,
        },
        orderBy: {
          date: 'desc',
        },
      })
      data.expenses = expenses
    }

    if (type === 'all' || type === 'deposits') {
      const deposits = await prisma.deposit.findMany({
        include: {
          transactions: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
      data.deposits = deposits
    }

    // Формируем CSV
    if (type === 'incomes') {
      const csv = [
        ['Дата', 'Источник', 'Сумма', 'Описание'].join(','),
        ...data.incomes.map((income: any) =>
          [
            new Date(income.date).toLocaleDateString('ru-RU'),
            income.source.name,
            income.amount,
            income.description || '',
          ].join(',')
        ),
      ].join('\n')

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="incomes_${new Date().toISOString().split('T')[0]}.csv"`,
        },
      })
    }

    if (type === 'expenses') {
      const csv = [
        ['Дата', 'Категория', 'Сумма', 'Описание'].join(','),
        ...data.expenses.map((expense: any) =>
          [
            new Date(expense.date).toLocaleDateString('ru-RU'),
            expense.category.name,
            expense.amount,
            expense.description || '',
          ].join(',')
        ),
      ].join('\n')

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="expenses_${new Date().toISOString().split('T')[0]}.csv"`,
        },
      })
    }

    // По умолчанию возвращаем JSON
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    )
  }
}

