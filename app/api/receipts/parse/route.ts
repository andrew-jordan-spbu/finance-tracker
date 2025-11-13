import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Функция для парсинга QR-кода чека (российский формат ФНС)
function parseReceiptQR(qrCode: string) {
  try {
    // Формат: t=YYYYMMDDTHHMM&s=сумма&fn=фискальный номер&i=фискальный документ&fp=фискальный признак&n=тип чека
    // Пример: t=20231102120000&s=1500.00&fn=9289000100123456&i=12345&fp=9876543210&n=1
    
    const params = new URLSearchParams(qrCode)
    const dateStr = params.get('t')
    const amount = params.get('s')
    const fiscalNumber = params.get('fn')
    const fiscalDoc = params.get('i')
    
    if (!dateStr || !amount) {
      return null
    }
    
    // Парсим дату: YYYYMMDDTHHMM
    const year = parseInt(dateStr.substring(0, 4))
    const month = parseInt(dateStr.substring(4, 6)) - 1
    const day = parseInt(dateStr.substring(6, 8))
    const hour = parseInt(dateStr.substring(9, 11)) || 0
    const minute = parseInt(dateStr.substring(11, 13)) || 0
    
    const date = new Date(year, month, day, hour, minute)
    
    return {
      date,
      amount: parseFloat(amount),
      fiscalNumber,
      fiscalDoc,
      raw: qrCode,
    }
  } catch (error) {
    return null
  }
}

// Простая категоризация на основе ключевых слов (можно улучшить с помощью ML)
function categorizeExpense(description: string, amount: number) {
  const descriptionLower = description.toLowerCase()
  
  const categories = [
    { name: 'Продукты', keywords: ['продукты', 'еда', 'хлеб', 'молоко', 'мясо', 'рыба', 'овощи', 'фрукты'], default: true },
    { name: 'Транспорт', keywords: ['транспорт', 'такси', 'метро', 'автобус', 'бензин', 'заправка'] },
    { name: 'Кафе и рестораны', keywords: ['кафе', 'ресторан', 'столовая', 'пицца', 'бургер'] },
    { name: 'Одежда', keywords: ['одежда', 'обувь', 'магазин'] },
    { name: 'Развлечения', keywords: ['кино', 'театр', 'концерт', 'игра'] },
    { name: 'Здоровье', keywords: ['аптека', 'лекарство', 'врач', 'больница', 'медицина'] },
    { name: 'Коммунальные услуги', keywords: ['коммуналка', 'электричество', 'вода', 'газ', 'интернет'] },
    { name: 'Другое', keywords: [], default: true },
  ]
  
  for (const category of categories) {
    if (category.keywords.some(keyword => descriptionLower.includes(keyword))) {
      return category.name
    }
  }
  
  return categories.find(c => c.default)?.name || 'Другое'
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { qrCode } = body
    
    if (!qrCode) {
      return NextResponse.json(
        { error: 'QR code is required' },
        { status: 400 }
      )
    }
    
    const receiptData = parseReceiptQR(qrCode)
    
    if (!receiptData) {
      return NextResponse.json(
        { error: 'Invalid QR code format' },
        { status: 400 }
      )
    }
    
    // Определяем категорию
    const categoryName = categorizeExpense(receiptData.fiscalNumber || '', receiptData.amount)
    
    // Получаем или создаем категорию
    let category = await prisma.category.findFirst({
      where: { name: categoryName },
    })
    
    if (!category) {
      category = await prisma.category.create({
        data: {
          name: categoryName,
        },
      })
    }
    
    // Получаем первый банк (или создаем его, если нет)
    let bank = await prisma.bank.findFirst({
      orderBy: { createdAt: 'asc' },
    })
    
    if (!bank) {
      // Создаем Сбербанк по умолчанию, если нет банков
      bank = await prisma.bank.create({
        data: {
          name: 'Сбербанк',
          color: '#047857',
        },
      })
    }
    
    // Создаем расход на основе чека
    const expense = await prisma.expense.create({
      data: {
        amount: receiptData.amount,
        categoryId: category.id,
        bankId: bank.id,
        date: receiptData.date,
        description: `Чек №${receiptData.fiscalDoc} от ${receiptData.date.toLocaleDateString('ru-RU')}`,
        receiptQr: qrCode,
      },
      include: {
        category: true,
        bank: true,
      },
    })
    
    return NextResponse.json({
      expense,
      parsed: receiptData,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    return NextResponse.json(
      { error: 'Failed to parse receipt' },
      { status: 500 }
    )
  }
}

