'use client'

import { useState, useEffect } from 'react'
import { Plus, TrendingUp, Calendar, DollarSign } from 'lucide-react'
import { formatCurrency } from '@/lib/currency'
import DepositCalculator from './DepositCalculator'

interface Deposit {
  id: string
  name: string
  initialAmount: number
  interestRate: number
  termMonths: number
  startDate: string
  capitalization: boolean
  frequency: string
  status: string
  transactions: Array<{
    id: string
    amount: number
    type: string
    date: string
  }>
}

export default function DepositManager() {
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const [showCalculator, setShowCalculator] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    initialAmount: '',
    interestRate: '',
    termMonths: '',
    capitalization: true,
    frequency: 'monthly' as 'monthly' | 'quarterly' | 'annually',
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchDeposits()
  }, [])

  const fetchDeposits = async () => {
    try {
      const response = await fetch('/api/deposits')
      const data = await response.json()
      setDeposits(data)
    } catch (error) {
      console.error('Failed to fetch deposits:', error)
    }
  }

  const handleCreateDeposit = async () => {
    if (!formData.name || !formData.initialAmount || !formData.interestRate || !formData.termMonths) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/deposits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          initialAmount: parseFloat(formData.initialAmount),
          interestRate: parseFloat(formData.interestRate),
          termMonths: parseInt(formData.termMonths),
        }),
      })

      if (response.ok) {
        await fetchDeposits()
        setFormData({
          name: '',
          initialAmount: '',
          interestRate: '',
          termMonths: '',
          capitalization: true,
          frequency: 'monthly',
        })
        setShowCalculator(false)
      }
    } catch (error) {
      console.error('Failed to create deposit:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAccrue = async (depositId: string) => {
    try {
      const response = await fetch(`/api/deposits/${depositId}/accrue`, {
        method: 'POST',
      })

      if (response.ok) {
        await fetchDeposits()
        alert('Проценты начислены успешно!')
      } else {
        const error = await response.json()
        alert(`Ошибка: ${error.error}`)
      }
    } catch (error) {
      console.error('Failed to accrue:', error)
      alert('Не удалось начислить проценты')
    }
  }

  const getCurrentBalance = (deposit: Deposit) => {
    return deposit.transactions.reduce((sum, t) => {
      return sum + (t.type === 'interest' || t.type === 'principal' ? t.amount : 0)
    }, deposit.initialAmount)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Мои вклады</h2>
        <button
          onClick={() => setShowCalculator(!showCalculator)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Создать вклад
        </button>
      </div>

      {showCalculator && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Создать новый вклад</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Название вклада
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                placeholder="Например: Депозит в Сбербанке"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Сумма (₽)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.initialAmount}
                  onChange={(e) => setFormData({ ...formData, initialAmount: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ставка (% годовых)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.interestRate}
                  onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
              </div>
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
              />
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.capitalization}
                  onChange={(e) => setFormData({ ...formData, capitalization: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Капитализация</span>
              </label>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Частота начисления
                </label>
                <select
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value as any })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                >
                  <option value="monthly">Ежемесячно</option>
                  <option value="quarterly">Ежеквартально</option>
                  <option value="annually">Ежегодно</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCreateDeposit}
                disabled={loading}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Создание...' : 'Создать вклад'}
              </button>
              <button
                onClick={() => setShowCalculator(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {deposits.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-600">У вас пока нет вкладов</p>
          </div>
        ) : (
          deposits.map((deposit) => {
            const currentBalance = getCurrentBalance(deposit)
            const totalInterest = deposit.transactions
              .filter(t => t.type === 'interest')
              .reduce((sum, t) => sum + t.amount, 0)

            return (
              <div key={deposit.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">{deposit.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Ставка: {deposit.interestRate}% годовых · Срок: {deposit.termMonths} мес.
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    deposit.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {deposit.status === 'active' ? 'Активен' : deposit.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Начальная сумма</p>
                    <p className="text-lg font-semibold text-gray-800">
                      {formatCurrency(deposit.initialAmount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Текущий баланс</p>
                    <p className="text-lg font-semibold text-blue-600">
                      {formatCurrency(currentBalance)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Начислено процентов</p>
                    <p className="text-lg font-semibold text-green-600">
                      +{formatCurrency(totalInterest)}
                    </p>
                  </div>
                </div>

                {deposit.status === 'active' && (
                  <button
                    onClick={() => handleAccrue(deposit.id)}
                    className="w-full bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 flex items-center justify-center gap-2"
                  >
                    <TrendingUp className="w-4 h-4" />
                    Начислить проценты
                  </button>
                )}

                {deposit.transactions.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">История начислений</h4>
                    <div className="space-y-2">
                      {deposit.transactions.slice(0, 5).map((transaction) => (
                        <div key={transaction.id} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600">
                              {new Date(transaction.date).toLocaleDateString('ru-RU')}
                            </span>
                            <span className="text-gray-500">· {transaction.type === 'interest' ? 'Проценты' : 'Тело вклада'}</span>
                          </div>
                          <span className={`font-medium ${transaction.type === 'interest' ? 'text-green-600' : 'text-blue-600'}`}>
                            +{formatCurrency(transaction.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

