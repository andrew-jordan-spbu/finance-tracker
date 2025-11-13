'use client'

import { useEffect, useMemo, useState } from 'react'
import { Link2, Upload, Plus, Save, Trash2, Paperclip } from 'lucide-react'
import { getLocalNote, setLocalNote, removeLocalNote } from '@/lib/knowledgeLocal'

type Note = {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
}

type Asset = {
  id: string
  filename: string
  url: string
  mimeType?: string | null
  size?: number | null
  noteId?: string | null
}

export default function KnowledgeWorkspace() {
  const [notes, setNotes] = useState<Note[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [allNotes, setAllNotes] = useState<Note[]>([])
  const [linkTarget, setLinkTarget] = useState<string>('')
  const [assets, setAssets] = useState<Asset[]>([])
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  const selectedNote = useMemo(() => notes.find((n) => n.id === selectedId) || null, [notes, selectedId])

  useEffect(() => {
    void refreshNotes()
    void refreshAssets()
  }, [])

  async function refreshNotes() {
    const res = await fetch('/api/knowledge/notes')
    if (res.ok) {
      const data = await res.json()
      setNotes(data)
      setAllNotes(data)
      if (!selectedId && data.length > 0) {
        onSelect(data[0])
      }
    }
  }

  async function refreshAssets() {
    const res = await fetch('/api/knowledge/files')
    if (res.ok) {
      const data = await res.json()
      setAssets(data)
    }
  }

  function onSelect(note: Note) {
    setSelectedId(note.id)
    setTitle(note.title)
    setContent(note.content)
    // Подтянуть локальный черновик, если он новее
    ;(async () => {
      try {
        const local = await getLocalNote(note.id)
        if (local && local.updatedAt > new Date(note.updatedAt).getTime()) {
          setTitle(local.title)
          setContent(local.content)
        }
      } catch {}
    })()
  }

  // Автосохранение в IndexedDB (дебаунс)
  useEffect(() => {
    if (!selectedId) return
    const timer = setTimeout(() => {
      void setLocalNote({
        id: selectedId,
        title,
        content,
        updatedAt: Date.now(),
      })
    }, 500)
    return () => clearTimeout(timer)
  }, [selectedId, title, content])

  async function createNote() {
    const res = await fetch('/api/knowledge/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Новая заметка', content: '' }),
    })
    if (res.ok) {
      await refreshNotes()
    }
  }

  async function saveNote() {
    if (!selectedId) return
    setSaving(true)
    const res = await fetch(`/api/knowledge/notes/${selectedId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content }),
    })
    setSaving(false)
    if (res.ok) {
      await refreshNotes()
      // После успешного сохранения можно очистить локальный черновик
      try {
        await removeLocalNote(selectedId)
      } catch {}
    }
  }

  async function deleteNote() {
    if (!selectedId) return
    if (!confirm('Удалить заметку?')) return
    const res = await fetch(`/api/knowledge/notes/${selectedId}`, {
      method: 'DELETE',
    })
    if (res.ok) {
      setSelectedId(null)
      setTitle('')
      setContent('')
      await refreshNotes()
    }
  }

  async function createLink() {
    if (!selectedId || !linkTarget || selectedId === linkTarget) return
    await fetch('/api/knowledge/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceId: selectedId, targetId: linkTarget, type: 'reference' }),
    })
    setLinkTarget('')
  }

  async function uploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    if (!selectedId) return
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const form = new FormData()
    form.append('file', file)
    form.append('noteId', selectedId)
    const res = await fetch('/api/knowledge/files', {
      method: 'POST',
      body: form,
    })
    setUploading(false)
    if (res.ok) {
      await refreshAssets()
    }
    e.target.value = ''
  }

  // Вставка Obsidian-ссылки по выделенному тексту
  function insertLinkToSelection(targetNoteId: string) {
    if (!selectedId) return
    const ta = document.querySelector<HTMLTextAreaElement>('textarea[data-kb-editor]')
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const original = content
    const selectedText = original.substring(start, end) || 'ссылка'
    // Синтаксис: [[noteId|выделенный текст]]
    const linked = `${original.substring(0, start)}[[${targetNoteId}|${selectedText}]]${original.substring(end)}`
    setContent(linked)
    // вернуть фокус и курсор
    setTimeout(() => {
      ta.focus()
      ta.selectionStart = ta.selectionEnd = start + 4 + targetNoteId.length + 1 + selectedText.length + 2
    }, 0)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Sidebar Notes */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-800">Заметки</h3>
          <button
            onClick={createNote}
            className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Новая
          </button>
        </div>
        <div className="space-y-2 max-h-[60vh] overflow-auto">
          {notes.map((note) => (
            <button
              key={note.id}
              onClick={() => onSelect(note)}
              className={`w-full text-left px-3 py-2 rounded-md border ${
                selectedId === note.id ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="font-medium text-gray-800 truncate">{note.title || 'Без названия'}</div>
              <div className="text-xs text-gray-500">Обновлено: {new Date(note.updatedAt).toLocaleString('ru-RU')}</div>
            </button>
          ))}
          {notes.length === 0 && <div className="text-sm text-gray-500">Заметок пока нет</div>}
        </div>
      </div>

      {/* Editor */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 lg:col-span-2">
        {selectedId ? (
          <>
            <div className="flex items-center gap-2 mb-3">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                placeholder="Заголовок"
              />
              <button
                onClick={saveNote}
                disabled={saving}
                className="px-3 py-2 rounded-md bg-green-600 text-white text-sm font-medium hover:bg-green-700 flex items-center gap-1 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button
                onClick={deleteNote}
                className="px-3 py-2 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 flex items-center gap-1"
              >
                <Trash2 className="w-4 h-4" />
                Удалить
              </button>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={16}
              data-kb-editor
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              placeholder="Текст заметки (Markdown поддерживается визуально позже)"
            />

            {/* Links and attachments */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Link2 className="w-4 h-4" />
                  Связи
                </h4>
                <div className="flex gap-2">
                  <select
                    value={linkTarget}
                    onChange={(e) => setLinkTarget(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  >
                    <option value="">Выберите заметку</option>
                    {allNotes
                      .filter((n) => n.id !== selectedId)
                      .map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.title || 'Без названия'}
                        </option>
                      ))}
                  </select>
                  <button
                    onClick={createLink}
                    disabled={!linkTarget}
                    className="px-3 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    Связать
                  </button>
                  <button
                    onClick={() => linkTarget && insertLinkToSelection(linkTarget)}
                    disabled={!linkTarget}
                    className="px-3 py-2 rounded-md bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
                    title="Вставить ссылку в выделенный текст"
                  >
                    Вставить в текст
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Граф связей будет добавлен отдельно; пока доступно создание связей между заметками.
                </p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Paperclip className="w-4 h-4" />
                  Вложения
                </h4>
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-gray-300 hover:bg-gray-50 cursor-pointer">
                    <Upload className="w-4 h-4 text-gray-600" />
                    <span className="text-sm text-gray-700">{uploading ? 'Загрузка...' : 'Загрузить файл'}</span>
                    <input type="file" className="hidden" onChange={uploadFile} disabled={uploading} />
                  </label>
                </div>
                <div className="mt-3 space-y-2 max-h-48 overflow-auto">
                  {assets
                    .filter((a) => a.noteId === selectedId)
                    .map((a) => (
                      <a
                        key={a.id}
                        href={a.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block text-sm text-blue-600 hover:underline"
                      >
                        {a.filename}
                      </a>
                    ))}
                  {assets.filter((a) => a.noteId === selectedId).length === 0 && (
                    <div className="text-sm text-gray-500">Вложений пока нет</div>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-gray-500 text-center py-16">Выберите заметку или создайте новую</div>
        )}
      </div>
    </div>
  )
}


