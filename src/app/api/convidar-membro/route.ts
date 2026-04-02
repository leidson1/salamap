import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { email, papel, turmaId, escolaId } = body as {
      email: string
      papel: 'editor' | 'visualizador'
      turmaId?: number
      escolaId?: number
    }

    if (!email?.trim()) {
      return NextResponse.json({ error: 'Email obrigatório' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()

    // Verificar se o email já tem conta
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, nome')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (existingProfile) {
      // CENÁRIO 1: Usuário já existe → adicionar direto
      if (turmaId) {
        // Compartilhar turma
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
            return NextResponse.json({ tipo: 'ja_membro', user: { nome: existingProfile.nome, email: normalizedEmail } })
          }
          throw error
        }
      }

      if (escolaId) {
        // Adicionar à escola
        await supabase.from('escola_membros').insert({
          escola_id: escolaId,
          user_id: existingProfile.id,
          papel: papel === 'editor' ? 'coordenador' : 'professor',
        })
        // ignora erro se já é membro
      }

      return NextResponse.json({
        tipo: 'adicionado',
        user: { nome: existingProfile.nome, email: normalizedEmail },
      })
    }

    // CENÁRIO 2: Usuário não existe → gerar convite com token
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789'
    let token = ''
    const randomBytes = new Uint8Array(12)
    crypto.getRandomValues(randomBytes)
    for (const byte of randomBytes) {
      token += chars[byte % chars.length]
    }

    if (turmaId) {
      await supabase.from('turma_compartilhamentos').insert({
        turma_id: turmaId,
        email: normalizedEmail,
        papel,
        user_id: null,
        status: 'pendente',
        convite_token: token,
        convidado_por: user.id,
      })
    }

    if (escolaId) {
      // Salvar convite pra escola (usa a mesma tabela ou cria quando aceitar)
    }

    const appUrl = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || ''
    const link = `${appUrl}/signup?convite=${token}`

    // Buscar nome da escola pra mensagem
    let escolaNome = 'uma equipe'
    if (escolaId) {
      const { data: escolaData } = await supabase.from('escolas').select('nome').eq('id', escolaId).maybeSingle()
      if (escolaData) escolaNome = escolaData.nome
    }

    return NextResponse.json({
      tipo: 'convite',
      token,
      link,
      whatsappMsg: `Olá! Você foi convidado(a) para *${escolaNome}* no SalaMap.\n\nCrie sua conta e entre na equipe:\n${link}`,
    })
  } catch (err) {
    console.error('[SalaMap] Invite error:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
