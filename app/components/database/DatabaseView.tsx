'use client'

import { useEffect, useState } from 'react'

type Asset = {
  id: string
  filename: string
  url: string
  mimeType?: string | null
  size?: number | null
  createdAt: string
  note?: { id: string; title: string } | null
}

export default function DatabaseView() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    void refresh()
  }, [])

  async function refresh() {
    setLoading(true)
    const res = await fetch('/api/knowledge/files')
    setLoading(false)
    if (res.ok) {
      const data = await res.json()
      setAssets(data)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-gray-800">База данных: Файлы</h3>
        <button
          onClick={refresh}
          className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
        >
          Обновить
        </button>
      </div>

      {loading ? (
        <div className="text-gray-500">Загрузка...</div>
      ) : assets.length === 0 ? (
        <div className="text-gray-500">Файлы отсутствуют</div>
      ) : (
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600 border-b">
                <th className="py-2 pr-4">Имя файла</th>
                <th className="py-2 pr-4">Тип</th>
                <th className="py-2 pr-4">Размер</th>
                <th className="py-2 pr-4">Заметка</th>
                <th className="py-2 pr-4">Ссылка</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((a) => (
                <tr key={a.id} className="border-b last:border-b-0">
                  <td className="py-2 pr-4">{a.filename}</td>
                  <td className="py-2 pr-4">{a.mimeType || '—'}</td>
                  <td className="py-2 pr-4">{a.size ? `${(a.size / 1024).toFixed(1)} КБ` : '—'}</td>
                  <td className="py-2 pr-4">{a.note?.title || '—'}</td>
                  <td className="py-2 pr-4">
                    <a href={a.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                      Открыть
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}


