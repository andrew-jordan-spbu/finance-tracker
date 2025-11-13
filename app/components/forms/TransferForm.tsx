'use client'

import { useState, useEffect } from 'react'
import { ArrowRightLeft } from 'lucide-react'

interface Bank {
  id: string
  name: string
  color?: string
}

export default function TransferForm({ onSuccess }: { onSuccess?: () => void }) {
  const [banks, setBanks] = useState<Bank[]>([])
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    amount: '',
    fromBankId: '',
    toBankId: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
  })

  useEffect(() => {
    fetchBanks()
  }, [])

  const fetchBanks = async () => {
    try {
      const response = await fetch('/api/banks')
      const data = await response.json()
      setBanks(data)
      if (data.length >= 2 && !formData.fromBankId && !formData.toBankId) {
        setFormData(prev => ({ 
          ...prev, 
          fromBankId: data[0].id,
          toBankId: data[1].id
        }))
      }
    } catch (error) {
      console.error('Failed to fetch banks:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.fromBankId === formData.toBankId) {
      alert('Выберите разные банки для перевода')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(formData.amount),
          fromBankId: formData.fromBankId,
          toBankId: formData.toBankId,
          date: new Date(formData.date).toISOString(),
          description: formData.description || undefined,
        }),
      })

      if (response.ok) {
        setFormData({
          amount: '',
          fromBankId: banks[0]?.id || '',
          toBankId: banks[1]?.id || banks[0]?.id || '',
          date: new Date().toISOString().split('T')[0],
          description: '',
        })
        onSuccess?.()
      } else {
        const error = await response.json()
        alert(`Ошибка: ${error.error || 'Не удалось создать перевод'}`)
      }
    } catch (error) {
      console.error('Failed to create transfer:', error)
      alert('Не удалось создать перевод')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-2 mb-6">
        <ArrowRightLeft className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-800">Перевод между банками</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Сумма *
          </label>
          <input
            type="number"
            step="0.01"
            required
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            placeholder="0.00"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Откуда (с какого банка) *
            </label>
            <select
              required
              value={formData.fromBankId}
              onChange={(e) => setFormData({ ...formData, fromBankId: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            >
              {banks.length === 0 && (
                <option value="">Сначала создайте банки</option>
              )}
              {banks.map((bank) => (
                <option key={bank.id} value={bank.id} disabled={bank.id === formData.toBankId}>
                  {bank.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Куда (в какой банк) *
            </label>
            <select
              required
              value={formData.toBankId}
              onChange={(e) => setFormData({ ...formData, toBankId: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            >
              {banks.length === 0 && (
                <option value="">Сначала создайте банки</option>
              )}
              {banks.map((bank) => (
                <option key={bank.id} value={bank.id} disabled={bank.id === formData.fromBankId}>
                  {bank.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Дата *
          </label>
          <input
            type="date"
            required
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Описание
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            placeholder="Дополнительная информация..."
          />
        </div>

        <button
          type="submit"
          disabled={loading || banks.length < 2}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Сохранение...' : 'Создать перевод'}
        </button>
      </form>
    </div>
  )
}

