'use client'

import { useState, useEffect } from 'react'
import { DollarSign, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import IncomeForm from './components/forms/IncomeForm'
import ExpenseForm from './components/forms/ExpenseForm'
import TransferForm from './components/forms/TransferForm'
import DepositManager from './components/deposits/DepositManager'
import QRScanner from './components/receipts/QRScanner'
import StatsCard from './components/dashboard/StatsCard'
import ExportButton from './components/dashboard/ExportButton'
import { formatCurrency } from '@/lib/currency'

export default function Home() {
  const [stats, setStats] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'income' | 'expense' | 'transfer' | 'deposit' | 'receipt'>('dashboard')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    fetchStats()
  }, [refreshKey])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/stats?period=month')
      if (!response.ok) {
        console.error('Failed to fetch stats:', response.statusText)
        return
      }
      const data = await response.json()
      if (data.error) {
        console.error('API error:', data.error)
        return
      }
      setStats(data)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  const handleQRScan = async (qrCode: string) => {
    try {
      const response = await fetch('/api/receipts/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrCode }),
      })

      if (response.ok) {
        const data = await response.json()
        alert(`Чек обработан! Создан расход на сумму ${formatCurrency(data.expense.amount)} в категории "${data.expense.category.name}"`)
        setRefreshKey(prev => prev + 1)
        setActiveTab('dashboard')
      } else {
        const error = await response.json()
        alert(`Ошибка: ${error.error}`)
      }
    } catch (error) {
      console.error('Failed to parse receipt:', error)
      alert('Не удалось обработать чек')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Система учета финансов</h1>
            <p className="text-gray-600 mt-1">Управляйте доходами, расходами и депозитами</p>
          </div>
          <ExportButton type="all" />
        </div>
      </header>

      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 overflow-x-auto">
            {[
              { id: 'dashboard', label: 'Дашборд' },
              { id: 'income', label: 'Доходы' },
              { id: 'expense', label: 'Расходы' },
              { id: 'transfer', label: 'Переводы' },
              { id: 'deposit', label: 'Вклады' },
              { id: 'receipt', label: 'Чеки' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-3 font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {stats && stats.summary ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatsCard
                    title="Доходы"
                    value={formatCurrency(stats.summary.totalIncome || 0)}
                    icon={TrendingUp}
                    color="bg-green-500"
                  />
                  <StatsCard
                    title="Расходы"
                    value={formatCurrency(stats.summary.totalExpenses || 0)}
                    icon={TrendingDown}
                    color="bg-red-500"
                  />
                  <StatsCard
                    title="Баланс"
                    value={formatCurrency(stats.summary.balance || 0)}
                    icon={Wallet}
                    color={`${(stats.summary.balance || 0) >= 0 ? 'bg-blue-500' : 'bg-orange-500'}`}
                  />
                  <StatsCard
                    title="Транзакций"
                    value={stats.summary.transactionCount || 0}
                    icon={DollarSign}
                    color="bg-purple-500"
                  />
                </div>

                {stats.expensesByCategory && stats.expensesByCategory.length > 0 && (
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Расходы по категориям</h2>
                    <div className="space-y-3">
                      {stats.expensesByCategory.map((cat: any, index: number) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: cat.color }}
                            />
                            <span className="font-medium text-gray-700">{cat.name}</span>
                            <span className="text-sm text-gray-500">({cat.count})</span>
                          </div>
                          <span className="font-semibold text-gray-800">
                            {formatCurrency(cat.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-gray-500">
                Загрузка статистики...
              </div>
            )}
          </div>
        )}

        {activeTab === 'income' && (
          <div className="max-w-2xl mx-auto">
            <IncomeForm onSuccess={() => setRefreshKey(prev => prev + 1)} />
          </div>
        )}

        {activeTab === 'expense' && (
          <div className="max-w-2xl mx-auto">
            <ExpenseForm onSuccess={() => setRefreshKey(prev => prev + 1)} />
          </div>
        )}

        {activeTab === 'transfer' && (
          <div className="max-w-2xl mx-auto">
            <TransferForm onSuccess={() => setRefreshKey(prev => prev + 1)} />
          </div>
        )}

        {activeTab === 'deposit' && (
          <div>
            <DepositManager />
          </div>
        )}

        {activeTab === 'receipt' && (
          <div className="max-w-2xl mx-auto">
            <QRScanner onScan={handleQRScan} />
          </div>
        )}
      </main>
    </div>
  )
}
