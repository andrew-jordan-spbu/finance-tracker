'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  isSameYear,
  parseISO,
  setHours,
  setMinutes,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
  subWeeks,
  subYears,
} from 'date-fns'
import { ru } from 'date-fns/locale'
import { Calendar, ChevronLeft, ChevronRight, Clock, MapPin } from 'lucide-react'
type CalendarViewType = 'day' | 'week' | 'month' | 'year'

type CalendarEvent = {
  id: string
  title: string
  start: string
  end?: string | null
  location?: string | null
  recurrence?: string | null
  reminderMinutes?: number | null
  knowledgeLink?: string | null
  dataLink?: string | null
  notes?: string | null
}

type GroupedEvents = Record<string, CalendarEvent[]>

const recurrenceLabels: Record<string, string> = {
  none: 'Не повторяется',
  daily: 'Ежедневно',
  weekly: 'Еженедельно',
  monthly: 'Ежемесячно',
  yearly: 'Ежегодно',
  custom: 'По расписанию',
}

function getViewRange(view: CalendarViewType, date: Date) {
  switch (view) {
    case 'day':
      return {
        start: startOfDay(date),
        end: addDays(startOfDay(date), 1),
      }
    case 'week': {
      const start = startOfWeek(date, { locale: ru, weekStartsOn: 1 })
      const end = endOfWeek(date, { locale: ru, weekStartsOn: 1 })
      return { start, end }
    }
    case 'month': {
      const start = startOfWeek(startOfMonth(date), { locale: ru, weekStartsOn: 1 })
      const end = endOfWeek(endOfMonth(date), { locale: ru, weekStartsOn: 1 })
      return { start, end }
    }
    case 'year': {
      const start = startOfYear(date)
      const end = endOfYear(date)
      return { start, end }
    }
    default:
      return { start: startOfDay(date), end: addDays(startOfDay(date), 1) }
  }
}

function groupEventsByDay(events: CalendarEvent[]) {
  return events.reduce<GroupedEvents>((acc, event) => {
    const startDate = format(parseISO(event.start), 'yyyy-MM-dd')
    if (!acc[startDate]) acc[startDate] = []
    acc[startDate].push(event)
    return acc
  }, {})
}

const defaultFormState = (currentDate: Date) => ({
  title: '',
  date: format(currentDate, 'yyyy-MM-dd'),
  startTime: '09:00',
  endTime: '10:00',
  location: '',
  recurrence: 'none',
  reminderMinutes: '30',
  knowledgeLink: '',
  dataLink: '',
  notes: '',
})

export default function CalendarView() {
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [view, setView] = useState<CalendarViewType>('month')
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState(defaultFormState(new Date()))
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const viewRange = useMemo(() => getViewRange(view, currentDate), [view, currentDate])

  useEffect(() => {
    void fetchEvents()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewRange.start.valueOf(), viewRange.end.valueOf()])

  async function fetchEvents() {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        start: viewRange.start.toISOString(),
        end: viewRange.end.toISOString(),
      })
      const response = await fetch(`/api/calendar/events?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Failed to load events')
      }
      const data = await response.json()
      setEvents(data)
    } catch (err) {
      console.error(err)
      setError('Не удалось загрузить события')
    } finally {
      setLoading(false)
    }
  }

  const groupedEvents = useMemo(() => groupEventsByDay(events), [events])

  const navigationLabel = useMemo(() => {
    switch (view) {
      case 'day':
        return format(currentDate, 'd MMMM yyyy', { locale: ru })
      case 'week': {
        const start = startOfWeek(currentDate, { locale: ru, weekStartsOn: 1 })
        const end = endOfWeek(currentDate, { locale: ru, weekStartsOn: 1 })
        return `${format(start, 'd MMM', { locale: ru })} – ${format(end, 'd MMM yyyy', { locale: ru })}`
      }
      case 'month':
        return format(currentDate, 'LLLL yyyy', { locale: ru })
      case 'year':
        return format(currentDate, 'yyyy', { locale: ru })
      default:
        return ''
    }
  }, [view, currentDate])

  function goToPrevious() {
    switch (view) {
      case 'day':
        setCurrentDate((prev) => subDays(prev, 1))
        break
      case 'week':
        setCurrentDate((prev) => subWeeks(prev, 1))
        break
      case 'month':
        setCurrentDate((prev) => subMonths(prev, 1))
        break
      case 'year':
        setCurrentDate((prev) => subYears(prev, 1))
        break
    }
  }

  function goToNext() {
    switch (view) {
      case 'day':
        setCurrentDate((prev) => addDays(prev, 1))
        break
      case 'week':
        setCurrentDate((prev) => addWeeks(prev, 1))
        break
      case 'month':
        setCurrentDate((prev) => addMonths(prev, 1))
        break
      case 'year':
        setCurrentDate((prev) => addYears(prev, 1))
        break
    }
  }

  function goToToday() {
    const now = new Date()
    setCurrentDate(now)
    setFormData((prev) => ({ ...prev, date: format(now, 'yyyy-MM-dd') }))
  }

  function getEventsForDay(date: Date) {
    const key = format(date, 'yyyy-MM-dd')
    return groupedEvents[key]?.slice().sort((a, b) => {
      const startA = parseISO(a.start)
      const startB = parseISO(b.start)
      return startA.getTime() - startB.getTime()
    }) ?? []
  }

  async function handleCreateEvent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const { title, date, startTime, endTime, location, recurrence, reminderMinutes, knowledgeLink, dataLink, notes } =
        formData

      if (!title.trim()) {
        setError('Укажите название события')
        return
      }

      const [startHour, startMinute] = startTime.split(':').map(Number)
      const startDate = setMinutes(setHours(new Date(date), startHour), startMinute)

      let endDate: Date | undefined
      if (endTime) {
        const [endHour, endMinute] = endTime.split(':').map(Number)
        endDate = setMinutes(setHours(new Date(date), endHour), endMinute)
        if (isBefore(endDate, startDate)) {
          setError('Время окончания должно быть позже начала')
          return
        }
      }

      const payload = {
        title: title.trim(),
        start: startDate.toISOString(),
        end: endDate?.toISOString(),
        location: location.trim() || undefined,
        recurrence: recurrence !== 'none' ? recurrence : undefined,
        reminderMinutes: reminderMinutes ? Number(reminderMinutes) : undefined,
        knowledgeLink: knowledgeLink.trim() || undefined,
        dataLink: dataLink.trim() || undefined,
        notes: notes.trim() || undefined,
      }

      const response = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error('Failed to create event')
      }

      setFormData(defaultFormState(new Date(date)))
      await fetchEvents()
    } catch (err) {
      console.error(err)
      setError('Не удалось создать событие')
    } finally {
      setSaving(false)
    }
  }

  function renderDayCell(date: Date) {
    const dayEvents = getEventsForDay(date)
    const isCurrentMonth = isSameMonth(date, currentDate)
    const isToday = isSameDay(date, new Date())

    return (
      <div
        key={date.toISOString()}
        className={`border border-gray-200 min-h-[120px] p-2 rounded-md ${
          isCurrentMonth ? 'bg-white' : 'bg-gray-50 text-gray-400'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className={`text-sm font-semibold ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
            {format(date, 'd', { locale: ru })}
          </span>
          {isToday && (
            <span className="text-xs text-blue-600 font-medium flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Сегодня
            </span>
          )}
        </div>
        <div className="space-y-1">
          {dayEvents.slice(0, 3).map((event) => (
            <div
              key={event.id}
              className="text-xs bg-blue-50 border border-blue-100 text-blue-700 rounded px-2 py-1 truncate"
            >
              <div className="font-semibold truncate">{event.title}</div>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>
                  {format(parseISO(event.start), 'HH:mm')}
                  {event.end ? ` – ${format(parseISO(event.end), 'HH:mm')}` : ''}
                </span>
              </div>
            </div>
          ))}
          {dayEvents.length > 3 && (
            <div className="text-xs text-gray-500 font-medium">Еще {dayEvents.length - 3}</div>
          )}
        </div>
      </div>
    )
  }

  function renderMonthView() {
    const { start, end } = viewRange
    const days: Date[] = []

    let day = start
    while (isBefore(day, end) || isSameDay(day, end)) {
      days.push(day)
      day = addDays(day, 1)
    }

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-gray-500 uppercase">
          {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((dayName) => (
            <div key={dayName}>{dayName}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">{days.map(renderDayCell)}</div>
      </div>
    )
  }

  function renderWeekView() {
    const { start } = viewRange
    const days = Array.from({ length: 7 }, (_, index) => addDays(start, index))

    return (
      <div className="grid grid-cols-7 gap-4">
        {days.map((date) => (
          <div key={date.toISOString()} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm text-gray-500">{format(date, 'EEEE', { locale: ru })}</div>
                <div className="text-lg font-semibold text-gray-800">{format(date, 'd MMM', { locale: ru })}</div>
              </div>
              {isSameDay(date, new Date()) && (
                <span className="text-xs text-blue-600 font-medium flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Сегодня
                </span>
              )}
            </div>
            <div className="space-y-3">
              {getEventsForDay(date).map((event) => (
                <div key={event.id} className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                  <div className="font-semibold text-blue-700">{event.title}</div>
                  <div className="text-xs text-blue-600 flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3" />
                    <span>
                      {format(parseISO(event.start), 'HH:mm')}
                      {event.end ? ` – ${format(parseISO(event.end), 'HH:mm')}` : ''}
                    </span>
                  </div>
                  {event.location && (
                    <div className="text-xs text-blue-500 flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" />
                      <span>{event.location}</span>
                    </div>
                  )}
                </div>
              ))}
              {getEventsForDay(date).length === 0 && (
                <div className="text-sm text-gray-400 text-center py-4 border border-dashed border-gray-200 rounded-lg">
                  Нет событий
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }

  function renderDayView() {
    const eventsForDay = getEventsForDay(currentDate)

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">
          {format(currentDate, 'EEEE, d MMMM yyyy', { locale: ru })}
        </h3>
        <div className="space-y-4">
          {eventsForDay.length === 0 && (
            <div className="text-sm text-gray-500 text-center py-6 border border-dashed border-gray-200 rounded-lg">
              На этот день событий нет
            </div>
          )}
          {eventsForDay.map((event) => (
            <div key={event.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-lg font-semibold text-gray-800">{event.title}</h4>
                  <div className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                    <Clock className="w-4 h-4 text-blue-500" />
                    <span>
                      {format(parseISO(event.start), 'HH:mm')}
                      {event.end ? ` – ${format(parseISO(event.end), 'HH:mm')}` : ''}
                    </span>
                  </div>
                </div>
                {event.recurrence && (
                  <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    {recurrenceLabels[event.recurrence] ?? 'Повтор'}
                  </span>
                )}
              </div>
              {event.location && (
                <div className="text-sm text-gray-600 flex items-center gap-2 mt-2">
                  <MapPin className="w-4 h-4 text-blue-500" />
                  <span>{event.location}</span>
                </div>
              )}
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                {event.reminderMinutes !== null && event.reminderMinutes !== undefined && (
                  <div>
                    <span className="font-medium text-gray-700">Напоминание:</span>{' '}
                    {event.reminderMinutes === 0
                      ? 'в момент события'
                      : `за ${event.reminderMinutes} мин.`}
                  </div>
                )}
                {event.knowledgeLink && (
                  <div>
                    <span className="font-medium text-gray-700">Заметка:</span>{' '}
                    <a href={event.knowledgeLink} className="text-blue-600 hover:underline" target="_blank" rel="noreferrer">
                      {event.knowledgeLink}
                    </a>
                  </div>
                )}
                {event.dataLink && (
                  <div>
                    <span className="font-medium text-gray-700">Запись:</span>{' '}
                    <a href={event.dataLink} className="text-blue-600 hover:underline" target="_blank" rel="noreferrer">
                      {event.dataLink}
                    </a>
                  </div>
                )}
                {event.notes && (
                  <div className="md:col-span-2">
                    <span className="font-medium text-gray-700">Заметки:</span> {event.notes}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  function renderYearView() {
    const months = Array.from({ length: 12 }, (_, index) => addMonths(startOfYear(currentDate), index))
    const today = new Date()

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {months.map((monthDate) => {
          const { start, end } = getViewRange('month', monthDate)
          const days: Date[] = []
          let day = start
          while (isBefore(day, end) || isSameDay(day, end)) {
            days.push(day)
            day = addDays(day, 1)
          }
          return (
            <div key={monthDate.toISOString()} className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                {format(monthDate, 'LLLL', { locale: ru })}
              </h3>
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase text-gray-400 mb-1">
                {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((dayName) => (
                  <div key={dayName}>{dayName}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-xs">
                {days.map((date) => {
                  const dayEvents = getEventsForDay(date)
                  const isCurrentMonth = isSameMonth(date, monthDate)
                  const isToday = isSameDay(date, today)
                  const hasEvents = dayEvents.length > 0
                  return (
                    <div
                      key={date.toISOString()}
                      className={`rounded-md py-1 ${
                        isCurrentMonth ? 'text-gray-700' : 'text-gray-400'
                      } ${isToday ? 'bg-blue-50 font-semibold text-blue-600' : ''}`}
                    >
                      <div>{format(date, 'd', { locale: ru })}</div>
                      {hasEvents && (
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mx-auto mt-0.5" />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={goToPrevious}
            className="p-2 rounded-md border border-gray-200 hover:bg-gray-100 transition"
            aria-label="Previous period"
          >
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <div className="text-lg font-semibold text-gray-800">{navigationLabel}</div>
          <button
            onClick={goToNext}
            className="p-2 rounded-md border border-gray-200 hover:bg-gray-100 transition"
            aria-label="Next period"
          >
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={goToToday}
            className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
          >
            Сегодня
          </button>
        </div>
        <div className="flex items-center gap-2">
          {(['day', 'week', 'month', 'year'] as CalendarViewType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setView(tab)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize ${
                view === tab ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {{
                day: 'День',
                week: 'Неделя',
                month: 'Месяц',
                year: 'Год',
              }[tab]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-gray-200 rounded-lg p-10 text-center text-gray-500">
          Загрузка календаря...
        </div>
      ) : (
        <>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">{error}</div>
          )}

          {view === 'month' && renderMonthView()}
          {view === 'week' && renderWeekView()}
          {view === 'day' && renderDayView()}
          {view === 'year' && renderYearView()}
        </>
      )}

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Добавить новое событие</h3>
        <form className="space-y-4" onSubmit={handleCreateEvent}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Название *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                placeholder="Например: Встреча с командой"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Дата *</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Время начала *</label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData((prev) => ({ ...prev, startTime: e.target.value }))}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Время окончания</label>
              <input
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData((prev) => ({ ...prev, endTime: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Место</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                placeholder="Например: Офис, Zoom"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Повторение</label>
              <select
                value={formData.recurrence}
                onChange={(e) => setFormData((prev) => ({ ...prev, recurrence: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              >
                <option value="none">Не повторяется</option>
                <option value="daily">Ежедневно</option>
                <option value="weekly">Еженедельно</option>
                <option value="monthly">Ежемесячно</option>
                <option value="yearly">Ежегодно</option>
                <option value="custom">По расписанию</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Напоминание</label>
              <select
                value={formData.reminderMinutes}
                onChange={(e) => setFormData((prev) => ({ ...prev, reminderMinutes: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              >
                <option value="0">В момент события</option>
                <option value="5">За 5 минут</option>
                <option value="10">За 10 минут</option>
                <option value="15">За 15 минут</option>
                <option value="30">За 30 минут</option>
                <option value="60">За 1 час</option>
                <option value="1440">За 1 день</option>
              </select>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Связь с базой знаний</label>
                <input
                  type="text"
                  value={formData.knowledgeLink}
                  onChange={(e) => setFormData((prev) => ({ ...prev, knowledgeLink: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  placeholder="Ссылка или идентификатор"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Связь с базой данных</label>
                <input
                  type="text"
                  value={formData.dataLink}
                  onChange={(e) => setFormData((prev) => ({ ...prev, dataLink: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  placeholder="Ссылка или идентификатор"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Заметки</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              placeholder="Дополнительная информация о событии"
            />
          </div>

          <div className="flex items-center justify-end gap-3">
            {error && <span className="text-sm text-red-600">{error}</span>}
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {saving ? 'Сохранение...' : 'Создать событие'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4 text-sm text-gray-500 flex items-center justify-between">
        <span>Планируйте события и связывайте их с заметками и данными.</span>
        <span className="font-medium text-gray-600">Ваш личный трекер</span>
      </div>
    </div>
  )
}

