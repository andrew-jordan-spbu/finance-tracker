'use client'

import { Download } from 'lucide-react'
import { useState } from 'react'

export default function ExportButton({ type = 'all' }: { type?: 'all' | 'incomes' | 'expenses' }) {
  const [loading, setLoading] = useState(false)

  const handleExport = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/export?type=${type}`)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${type}_${new Date().toISOString().split('T')[0]}.${type === 'all' ? 'json' : 'csv'}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Failed to export:', error)
      alert('Не удалось экспортировать данные')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2 disabled:opacity-50"
    >
      <Download className="w-4 h-4" />
      {loading ? 'Экспорт...' : 'Экспорт'}
    </button>
  )
}

