'use client'

import { useState, useEffect } from 'react'
import { Minus, Plus, Tag } from 'lucide-react'

interface Category {
  id: string
  name: string
  color?: string
}

interface Bank {
  id: string
  name: string
  color?: string
}

export default function ExpenseForm({ onSuccess }: { onSuccess?: () => void }) {
  const [categories, setCategories] = useState<Category[]>([])
  const [banks, setBanks] = useState<Bank[]>([])
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    amount: '',
    categoryId: '',
    bankId: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
  })
  const [newCategoryName, setNewCategoryName] = useState('')

  useEffect(() => {
    fetchCategories()
    fetchBanks()
  }, [])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      const data = await response.json()
      setCategories(data)
      if (data.length > 0 && !formData.categoryId) {
        setFormData(prev => ({ ...prev, categoryId: data[0].id }))
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error)
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
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(formData.amount),
          categoryId: formData.categoryId,
          bankId: formData.bankId,
          date: new Date(formData.date).toISOString(),
          description: formData.description || undefined,
        }),
      })

      if (response.ok) {
        setFormData({
          amount: '',
          categoryId: categories[0]?.id || '',
          bankId: banks[0]?.id || '',
          date: new Date().toISOString().split('T')[0],
          description: '',
        })
        onSuccess?.()
      }
    } catch (error) {
      console.error('Failed to create expense:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return

    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName }),
      })

      if (response.ok) {
        const newCategory = await response.json()
        setCategories([...categories, newCategory])
        setFormData(prev => ({ ...prev, categoryId: newCategory.id }))
        setNewCategoryName('')
      }
    } catch (error) {
      console.error('Failed to create category:', error)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-2 mb-6">
        <Minus className="w-6 h-6 text-red-600" />
        <h2 className="text-2xl font-bold text-gray-800">Добавить расход</h2>
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
            Категория *
          </label>
          <div className="flex gap-2">
            <select
              required
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            >
              {categories.length === 0 && (
                <option value="">Создайте категорию</option>
              )}
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleCreateCategory())}
                placeholder="Новая категория"
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              />
              <button
                type="button"
                onClick={handleCreateCategory}
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
          className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Сохранение...' : 'Добавить расход'}
        </button>
      </form>
    </div>
  )
}

