/**
 * Форматирует число в рубли согласно русской локали
 * @param amount - сумма для форматирования
 * @returns отформатированная строка (например: "1 234,56 ₽")
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

