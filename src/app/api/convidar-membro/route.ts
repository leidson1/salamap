import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateShareCode } from '@/lib/map/utils'

async function ensureActiveShareForTurma(
  supabase: Awaited<ReturnType<typeof createClient>>,
  turmaId: number
) {
  const { data: mapa } = await supabase
    .from('mapas')
    .select('id, user_id')
    .eq('turma_id', turmaId)
    .maybeSingle()

  if (!mapa) return null

  const { data: existingShares } = await supabase
    .from('mapa_compartilhamentos')
    .select('id, share_code, ativo')
    .eq('mapa_id', mapa.id)
    .order('ativo', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)

  const existingShare = existingShares?.[0]
  if (existingShare?.ativo) return existingShare

  if (existingShare) {
    const { data: reactivatedShare, error } = await supabase
      .from('mapa_compartilhamentos')
      .update({ ativo: true })
      .eq('id', existingShare.id)
      .select('id, share_code, ativo')
      .single()

    if (error) throw error
    return reactivatedShare
  }

  const { data: createdShare, error } = await supabase
    .from('mapa_compartilhamentos')
    .insert({
      mapa_id: mapa.id,
      user_id: mapa.user_id,
      share_code: generateShareCode(),
      ativo: true,
    })
    .select('id, share_code, ativo')
    .single()

  if (error) throw error
  return createdShare
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { email, papel, turmaId, escolaId } = body as {
      email: string
      papel: 'editor' | 'visualizador'
      turmaId?: number
      escolaId?: number
    }

    if (!email?.trim()) {
      return NextResponse.json({ error: 'Email obrigatorio' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()

    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, nome')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (existingProfile) {
      if (turmaId) {
        const { data: existingShare } = await supabase
          .from('turma_compartilhamentos')
          .select('id')
          .eq('turma_id', turmaId)
          .eq('user_id', existingProfile.id)
          .eq('status', 'aceito')
          .limit(1)

        if (existingShare && existingShare.length > 0) {
          await ensureActiveShareForTurma(supabase, turmaId)
          return NextResponse.json({
            tipo: 'ja_membro',
            user: { nome: existingProfile.nome, email: normalizedEmail },
          })
        }

        const { error } = await supabase.from('turma_compartilhamentos').insert({
          turma_id: turmaId,
          email: normalizedEmail,
          papel,
          user_id: existingProfile.id,
          status: 'aceito',
          convidado_por: user.id,
        })

        if (error) {
          if (error.message.includes('duplicate') || error.message.includes('unique')) {
            await ensureActiveShareForTurma(supabase, turmaId)
            return NextResponse.json({
              tipo: 'ja_membro',
              user: { nome: existingProfile.nome, email: normalizedEmail },
            })
          }

          throw error
        }

        await ensureActiveShareForTurma(supabase, turmaId)
      }

      if (escolaId) {
        await supabase.from('escola_membros').insert({
          escola_id: escolaId,
          user_id: existingProfile.id,
          papel: papel === 'editor' ? 'coordenador' : 'professor',
        })
      }

      return NextResponse.json({
        tipo: 'adicionado',
        user: { nome: existingProfile.nome, email: normalizedEmail },
      })
    }

    const chars = 'abcdefghjkmnpqrstuvwxyz23456789'
    let token = ''
    const randomBytes = new Uint8Array(12)
    crypto.getRandomValues(randomBytes)
    for (const byte of randomBytes) {
      token += chars[byte % chars.length]
    }

    if (turmaId) {
      const { error } = await supabase.from('turma_compartilhamentos').insert({
        turma_id: turmaId,
        email: normalizedEmail,
        papel,
        user_id: null,
        status: 'pendente',
        convite_token: token,
        convidado_por: user.id,
      })

      if (error) {
        if (error.message.includes('duplicate') || error.message.includes('unique')) {
          return NextResponse.json({ tipo: 'ja_membro', user: { nome: normalizedEmail, email: normalizedEmail } })
        }

        throw error
      }
    }

    const appUrl = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || ''
    const link = `${appUrl}/signup?convite=${token}`

    let escolaNome = 'uma equipe'
    if (escolaId) {
      const { data: escolaData } = await supabase
        .from('escolas')
        .select('nome')
        .eq('id', escolaId)
        .maybeSingle()

      if (escolaData) escolaNome = escolaData.nome
    }

    return NextResponse.json({
      tipo: 'convite',
      token,
      link,
      whatsappMsg: `Ola! Voce foi convidado(a) para *${escolaNome}* no SalaMap.\n\nCrie sua conta e entre na equipe:\n${link}`,
    })
  } catch (err) {
    console.error('[SalaMap] Invite error:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
