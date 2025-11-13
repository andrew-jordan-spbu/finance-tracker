import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Создаем банки по умолчанию
  const banks = [
    { name: 'Сбербанк', color: '#047857' },
    { name: 'Т-банк', color: '#F59E0B' },
    { name: 'Альфа банк', color: '#EF4444' },
  ]

  let defaultBank = await prisma.bank.findFirst({
    where: { name: 'Сбербанк' },
  })

  if (!defaultBank) {
    defaultBank = await prisma.bank.create({
      data: banks[0],
    })
    console.log('✓ Создан банк "Сбербанк"')
  }

  // Обновляем существующие доходы
  const incomesWithoutBank = await prisma.income.findMany({
    where: {
      bankId: null as any,
    },
  })

  if (incomesWithoutBank.length > 0) {
    console.log(`Обновление ${incomesWithoutBank.length} доходов...`)
    for (const income of incomesWithoutBank) {
      await prisma.income.update({
        where: { id: income.id },
        data: { bankId: defaultBank.id },
      })
    }
    console.log('✓ Доходы обновлены')
  }

  // Обновляем существующие расходы
  const expensesWithoutBank = await prisma.expense.findMany({
    where: {
      bankId: null as any,
    },
  })

  if (expensesWithoutBank.length > 0) {
    console.log(`Обновление ${expensesWithoutBank.length} расходов...`)
    for (const expense of expensesWithoutBank) {
      await prisma.expense.update({
        where: { id: expense.id },
        data: { bankId: defaultBank.id },
      })
    }
    console.log('✓ Расходы обновлены')
  }

  // Создаем остальные банки
  for (let i = 1; i < banks.length; i++) {
    await prisma.bank.upsert({
      where: { name: banks[i].name },
      update: {},
      create: banks[i],
    })
    console.log(`✓ Банк "${banks[i].name}" создан или уже существует`)
  }

  console.log('✓ Миграция завершена')
}

main()
  .catch((e) => {
    console.error('Ошибка миграции:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

