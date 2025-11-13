import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Создаем банки по умолчанию
  const banks = [
    { name: 'Сбербанк', color: '#047857' },
    { name: 'Т-банк', color: '#F59E0B' },
    { name: 'Альфа банк', color: '#EF4444' },
  ]

  for (const bankData of banks) {
    try {
      await prisma.bank.upsert({
        where: { name: bankData.name },
        update: {},
        create: bankData,
      })
      console.log(`✓ Банк "${bankData.name}" создан или уже существует`)
    } catch (error) {
      console.error(`✗ Ошибка при создании банка "${bankData.name}":`, error)
    }
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

