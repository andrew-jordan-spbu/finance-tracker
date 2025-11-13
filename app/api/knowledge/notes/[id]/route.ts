import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().optional(),
})

// та же функция извлечения ссылок
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

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const note = await (prisma as any).note.findUnique({
      where: { id: params.id },
      include: {
        assets: true,
        outgoing: true,
        incoming: true,
      },
    })
    if (!note) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json(note)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch note' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const data = updateSchema.parse(body)
    const note = await (prisma as any).$transaction(async (tx: any) => {
      const updated = await tx.note.update({
        where: { id: params.id },
        data,
      })
      if (data.content !== undefined) {
        // Пересоздадим связи "reference" для этой заметки
        await tx.noteLink.deleteMany({ where: { sourceId: params.id, type: 'reference' } })
        const refs = extractNoteRefs(data.content)
        for (const ref of refs) {
          let targetId: string | null = null
          if (ref.id) {
            targetId = ref.id
          } else if (ref.title) {
            const found = await tx.note.findFirst({ where: { title: ref.title } })
            if (found) targetId = found.id
          }
          if (targetId && targetId !== params.id) {
            await tx.noteLink.create({
              data: { sourceId: params.id, targetId, type: 'reference' },
            })
          }
        }
      }
      return updated
    })
    return NextResponse.json(note)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to update note' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await (prisma as any).note.delete({
      where: { id: params.id },
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 })
  }
}


