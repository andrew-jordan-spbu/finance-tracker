import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const recurrenceOptions = ['none', 'daily', 'weekly', 'monthly', 'yearly', 'custom'] as const

const eventSchema = z.object({
  title: z.string().min(1, 'Название обязательно'),
  start: z.string().datetime(),
  end: z.string().datetime().optional(),
  location: z.string().max(255).optional(),
  recurrence: z.enum(recurrenceOptions).optional(),
  reminderMinutes: z.number().int().nonnegative().optional(),
  knowledgeLink: z.string().max(255).optional(),
  dataLink: z.string().max(255).optional(),
  notes: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startParam = searchParams.get('start')
    const endParam = searchParams.get('end')

    const whereClause =
      startParam && endParam
        ? {
            start: {
              gte: new Date(startParam),
              lte: new Date(endParam),
            },
          }
        : {}

    const events = await prisma.calendarEvent.findMany({
      where: whereClause,
      orderBy: {
        start: 'asc',
      },
    })

    return NextResponse.json(events)
  } catch (error) {
    console.error('Failed to fetch calendar events:', error)
    return NextResponse.json(
      { error: 'Failed to fetch calendar events' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = eventSchema.parse(body)

    const event = await prisma.calendarEvent.create({
      data: {
        title: parsed.title,
        start: new Date(parsed.start),
        end: parsed.end ? new Date(parsed.end) : undefined,
        location: parsed.location,
        recurrence: parsed.recurrence && parsed.recurrence !== 'none' ? parsed.recurrence : null,
        reminderMinutes: parsed.reminderMinutes,
        knowledgeLink: parsed.knowledgeLink,
        dataLink: parsed.dataLink,
        notes: parsed.notes,
      },
    })

    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error('Failed to create calendar event:', error)
    return NextResponse.json(
      { error: 'Failed to create calendar event' },
      { status: 500 }
    )
  }
}

