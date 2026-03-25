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
  numero: number | null
  ativo: boolean
  created_at: string
}

export type CellType = 'carteira' | 'vazio' | 'bloqueado' | 'professor' | 'porta' | 'quadro' | 'janela'

export interface GridCell {
  tipo: CellType
  alunoId: number | null
}

export type Grid = GridCell[][]

export interface RoomConfig {
  doorPosition: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right'
  windowWall: 'left' | 'right' | 'none'
  windowCount: number
  boardLabel: string
}

export const DEFAULT_ROOM_CONFIG: RoomConfig = {
  doorPosition: 'bottom-left',
  windowWall: 'left',
  windowCount: 3,
  boardLabel: 'Quadro',
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
  created_at: string
}

export interface PublicMapData {
  mapa: {
    id: number
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
