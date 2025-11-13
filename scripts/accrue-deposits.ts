/**
 * Скрипт для автоматического начисления процентов по депозитам
 * Запускать периодически (например, через cron) для обработки всех активных депозитов
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function accrueAllDeposits() {
  try {
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

      // Проверяем, нужно ли начислять проценты
      if (autoAccrual.nextProcessDate && autoAccrual.nextProcessDate > now) {
        continue
      }

      // Рассчитываем текущий баланс
      const currentBalance = deposit.transactions.reduce((sum, t) => {
        return sum + (t.type === 'interest' || t.type === 'principal' ? t.amount : 0)
      }, deposit.initialAmount)

      // Рассчитываем проценты за период
      const annualRate = deposit.interestRate / 100
      const periodsPerYear = deposit.frequency === 'monthly' ? 12 
        : deposit.frequency === 'quarterly' ? 4 
        : 1
      const ratePerPeriod = annualRate / periodsPerYear
      const interestAmount = currentBalance * ratePerPeriod

      // Создаем транзакцию начисления процентов
      await prisma.depositTransaction.create({
        data: {
          depositId: deposit.id,
          amount: interestAmount,
          type: 'interest',
          date: now,
          description: `Автоматическое начисление процентов (${deposit.frequency})`,
        },
      })

      // Обновляем дату следующего начисления
      const nextProcessDate = new Date(now)
      if (deposit.frequency === 'monthly') {
        nextProcessDate.setMonth(nextProcessDate.getMonth() + 1)
      } else if (deposit.frequency === 'quarterly') {
        nextProcessDate.setMonth(nextProcessDate.getMonth() + 3)
      } else {
        nextProcessDate.setFullYear(nextProcessDate.getFullYear() + 1)
      }

      await prisma.autoAccrual.update({
        where: { id: autoAccrual.id },
        data: {
          lastProcessed: now,
          nextProcessDate,
        },
      })

      processedCount++
      console.log(`Начислены проценты по депозиту "${deposit.name}": ${interestAmount.toFixed(2)} ₽`)
    }

    console.log(`Обработано депозитов: ${processedCount}`)
  } catch (error) {
    console.error('Ошибка при начислении процентов:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Запуск скрипта
accrueAllDeposits()
  .then(() => {
    console.log('Автоматическое начисление завершено')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Ошибка:', error)
    process.exit(1)
  })

