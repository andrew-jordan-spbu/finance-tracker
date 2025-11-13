import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const noteSchema = z.object({
  title: z.string().min(1),
  content: z.string().default(''),
})

// [[noteId|label]] или [[Note Title]] или [[Note Title#Quote]]
function extractNoteRefs(content: string): Array<{ raw: string; id?: string; title?: string; quote?: string }> {
  const refs: Array<{ raw: string; id?: string; title?: string; quote?: string }> = []
  const idPattern = /\[\[([a-z0-9]+)\|([^\]]+)\]\]/gi
  const titlePattern = /\[\[([^\]\|#]+)(?:#([^\]]+))?\]\]/g
  let m: RegExpExecArray | null
  while ((m = idPattern.exec(content)) !== null) {
    refs.push({ raw: m[0], id: m[1] })
  }
  while ((m = titlePattern.exec(content)) !== null) {
    refs.push({ raw: m[0], title: m[1].trim(), quote: m[2]?.trim() })
  }
  return refs
}

export async function GET() {
  try {
    const db = prisma as any
    const notes = await db.note.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        assets: true,
        outgoing: true,
        incoming: true,
      },
    })
    return NextResponse.json(notes)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = noteSchema.parse(body)

    const note = await (prisma as any).$transaction(async (tx: any) => {
      const created = await tx.note.create({
        data: {
          title: data.title,
          content: data.content,
        },
      })
      // связи по контенту
      const refs = extractNoteRefs(data.content)
      for (const ref of refs) {
        let targetId: string | null = null
        if (ref.id) {
          targetId = ref.id
        } else if (ref.title) {
          const found = await tx.note.findFirst({ where: { title: ref.title } })
          if (found) targetId = found.id
        }
        if (targetId && targetId !== created.id) {
          await tx.noteLink.create({
            data: { sourceId: created.id, targetId, type: 'reference' },
          })
        }
      }
      return created
    })

    // Создаем событие в календаре о создании новой заметки
    try {
      await (prisma as any).calendarEvent.create({
        data: {
          title: `Новая заметка: ${note.title}`,
          start: new Date(),
          knowledgeLink: `/knowledge/${note.id}`,
          notes: 'Заметка создана в базе знаний',
        },
      })
    } catch (e) {
      // не валим запрос, если календарь недоступен
      console.warn('Failed to create calendar event for note:', e)
    }

    return NextResponse.json(note, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 })
  }
}


