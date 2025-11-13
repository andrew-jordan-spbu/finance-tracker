'use client'

import { useState } from 'react'
import { Calculator, TrendingUp } from 'lucide-react'
import { formatCurrency } from '@/lib/currency'

export default function DepositCalculator() {
  const [formData, setFormData] = useState({
    initialAmount: '',
    interestRate: '',
    termMonths: '',
    capitalization: true,
    frequency: 'monthly' as 'monthly' | 'quarterly' | 'annually',
  })
  const [calculation, setCalculation] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const handleCalculate = async () => {
    if (!formData.initialAmount || !formData.interestRate || !formData.termMonths) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/deposits', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initialAmount: parseFloat(formData.initialAmount),
          interestRate: parseFloat(formData.interestRate),
          termMonths: parseInt(formData.termMonths),
          capitalization: formData.capitalization,
          frequency: formData.frequency,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setCalculation(data)
      }
    } catch (error) {
      console.error('Failed to calculate:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-2 mb-6">
        <Calculator className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-800">Калькулятор вклада</h2>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Сумма вклада (₽)
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.initialAmount}
            onChange={(e) => setFormData({ ...formData, initialAmount: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            placeholder="100000"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Процентная ставка (% годовых)
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.interestRate}
            onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            placeholder="8.0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Срок (месяцев)
          </label>
          <input
            type="number"
            value={formData.termMonths}
            onChange={(e) => setFormData({ ...formData, termMonths: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            placeholder="12"
          />
        </div>

        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.capitalization}
              onChange={(e) => setFormData({ ...formData, capitalization: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Капитализация процентов</span>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Частота начисления
          </label>
          <select
            value={formData.frequency}
            onChange={(e) => setFormData({ ...formData, frequency: e.target.value as any })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
          >
            <option value="monthly">Ежемесячно</option>
            <option value="quarterly">Ежеквартально</option>
            <option value="annually">Ежегодно</option>
          </select>
        </div>

        <button
          onClick={handleCalculate}
          disabled={loading || !formData.initialAmount || !formData.interestRate || !formData.termMonths}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Расчет...' : 'Рассчитать'}
        </button>
      </div>

      {calculation && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-800">Результаты расчета</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Начальная сумма:</span>
              <span className="font-semibold">{formatCurrency(parseFloat(formData.initialAmount))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Начисленные проценты:</span>
              <span className="font-semibold text-green-600">
                +{formatCurrency(calculation.interest)}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-blue-200">
              <span className="text-gray-800 font-medium">Итоговая сумма:</span>
              <span className="font-bold text-blue-600 text-lg">
                {formatCurrency(calculation.totalAmount)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

