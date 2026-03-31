export interface Profile {
  id: string
  nome: string
  email: string
  accepted_terms_at: string | null
  created_at: string
}

export interface Turma {
  id: number
  user_id: string
  serie: string
  turma: string
  turno: string
  ativo: boolean
  created_at: string
}

export interface Aluno {
  id: number
  user_id: string
  turma_id: number
  nome: string
  apelido: string | null
  numero: number | null
  ativo: boolean
  created_at: string
}

export type CellType = 'carteira' | 'vazio' | 'bloqueado'

export interface GridCell {
  tipo: CellType
  alunoId: number | null
  blocoId?: string | null
  rotacao?: 0 | 90 | 180 | 270 // direcao da cadeira: 0=baixo, 90=esquerda, 180=cima, 270=direita
}

export type Grid = GridCell[][]

export type WallSide = 'top' | 'bottom' | 'left' | 'right'

export interface WallElement {
  id: string
  type: 'porta' | 'janela'
  wall: WallSide
  position: number // 0-100 (percentage along the wall)
  size: 1 | 2 | 3 // 1=pequeno, 2=medio, 3=grande
}

export interface RoomConfig {
  boardWall: 'top' | 'bottom'
  boardLabel: string
  teacherDesk: 'left' | 'center' | 'right' | 'none'
  wallElements: WallElement[]
}

export const DEFAULT_ROOM_CONFIG: RoomConfig = {
  boardWall: 'top',
  boardLabel: 'Quadro',
  teacherDesk: 'center',
  wallElements: [
    { id: 'porta-1', type: 'porta', wall: 'bottom', position: 10, size: 2 },
    { id: 'janela-1', type: 'janela', wall: 'left', position: 25, size: 2 },
    { id: 'janela-2', type: 'janela', wall: 'left', position: 50, size: 2 },
    { id: 'janela-3', type: 'janela', wall: 'left', position: 75, size: 2 },
  ],
}

export interface Mapa {
  id: number
  user_id: string
  turma_id: number
  nome: string
  linhas: number
  colunas: number
  layout_tipo: string
  grid: Grid
  mesa_professor: { linha: number; coluna: number } | null
  room_config: RoomConfig | null
  updated_at: string
  created_at: string
}

export interface MapaCompartilhamento {
  id: number
  mapa_id: number
  user_id: string
  share_code: string
  ativo: boolean
  created_at: string
}

export interface MapaHistorico {
  id: number
  mapa_id: number
  grid: Grid
  linhas: number
  colunas: number
  layout_tipo: string
  mesa_professor: { linha: number; coluna: number } | null
  room_config: RoomConfig | null
  created_at: string
}

// Compartilhamento de turma
export interface TurmaCompartilhamento {
  id: number
  turma_id: number
  user_id: string | null
  email: string
  papel: 'editor' | 'visualizador'
  status: 'pendente' | 'aceito'
  convite_token: string
  convidado_por: string
  created_at: string
}

// Escola / Workspace
export interface Escola {
  id: number
  nome: string
  codigo_convite: string
  logo_url: string | null
  criado_por: string
  created_at: string
}

export interface EscolaMembro {
  id: number
  escola_id: number
  user_id: string
  papel: 'coordenador' | 'professor'
  created_at: string
}

// Solicitação de acesso
export interface SolicitacaoAcesso {
  id: number
  turma_id: number
  user_id: string
  status: 'pendente' | 'aceito' | 'recusado'
  created_at: string
}

export interface PublicMapData {
  mapa: {
    id: number
    turma_id?: number
    nome: string
    linhas: number
    colunas: number
    layout_tipo: string
    grid: Grid
    mesa_professor: { linha: number; coluna: number } | null
    room_config: RoomConfig | null
    updated_at: string
  }
  turma: {
    serie: string
    turma: string
    turno: string
  }
  professor: {
    nome: string
  }
  alunos: Array<{ id: number; nome: string; numero: number }>
}
