'use client'

import { useState, useEffect } from 'react'
import { Plus, DollarSign } from 'lucide-react'

interface IncomeSource {
  id: string
  name: string
  description?: string
}

interface Bank {
  id: string
  name: string
  color?: string
}

export default function IncomeForm({ onSuccess }: { onSuccess?: () => void }) {
  const [sources, setSources] = useState<IncomeSource[]>([])
  const [banks, setBanks] = useState<Bank[]>([])
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    amount: '',
    sourceId: '',
    bankId: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
  })
  const [newSourceName, setNewSourceName] = useState('')

  useEffect(() => {
    fetchSources()
    fetchBanks()
  }, [])

  const fetchSources = async () => {
    try {
      const response = await fetch('/api/sources')
      const data = await response.json()
      setSources(data)
      if (data.length > 0 && !formData.sourceId) {
        setFormData(prev => ({ ...prev, sourceId: data[0].id }))
      }
    } catch (error) {
      console.error('Failed to fetch sources:', error)
    }
  }

  const fetchBanks = async () => {
    try {
      const response = await fetch('/api/banks')
      const data = await response.json()
      setBanks(data)
      if (data.length > 0 && !formData.bankId) {
        setFormData(prev => ({ ...prev, bankId: data[0].id }))
      }
    } catch (error) {
      console.error('Failed to fetch banks:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/incomes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(formData.amount),
          sourceId: formData.sourceId,
          bankId: formData.bankId,
          date: new Date(formData.date).toISOString(),
          description: formData.description || undefined,
        }),
      })

      if (response.ok) {
        setFormData({
          amount: '',
          sourceId: sources[0]?.id || '',
          bankId: banks[0]?.id || '',
          date: new Date().toISOString().split('T')[0],
          description: '',
        })
        onSuccess?.()
      }
    } catch (error) {
      console.error('Failed to create income:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSource = async () => {
    if (!newSourceName.trim()) return

    try {
      const response = await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSourceName }),
      })

      if (response.ok) {
        const newSource = await response.json()
        setSources([...sources, newSource])
        setFormData(prev => ({ ...prev, sourceId: newSource.id }))
        setNewSourceName('')
      }
    } catch (error) {
      console.error('Failed to create source:', error)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-2 mb-6">
        <DollarSign className="w-6 h-6 text-green-600" />
        <h2 className="text-2xl font-bold text-gray-800">Добавить доход</h2>
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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Источник дохода *
          </label>
          <div className="flex gap-2">
            <select
              required
              value={formData.sourceId}
              onChange={(e) => setFormData({ ...formData, sourceId: e.target.value })}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            >
              {sources.length === 0 && (
                <option value="">Создайте источник дохода</option>
              )}
              {sources.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.name}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <input
                type="text"
                value={newSourceName}
                onChange={(e) => setNewSourceName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleCreateSource())}
                placeholder="Новый источник"
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              />
              <button
                type="button"
                onClick={handleCreateSource}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Банк *
          </label>
          <select
            required
            value={formData.bankId}
            onChange={(e) => setFormData({ ...formData, bankId: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
          >
            {banks.length === 0 && (
              <option value="">Сначала создайте банк</option>
            )}
            {banks.map((bank) => (
              <option key={bank.id} value={bank.id}>
                {bank.name}
              </option>
            ))}
          </select>
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
          disabled={loading}
          className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Сохранение...' : 'Добавить доход'}
        </button>
      </form>
    </div>
  )
}

