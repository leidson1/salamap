export interface Profile {
  id: string
  nome: string
  email: string
  accepted_terms_at: string | null
  created_at: string
}

export interface Workspace {
  id: number
  nome: string
  nome_instituicao: string | null
  logo_url: string | null
  created_by: string
  created_at: string
}

export interface WorkspaceMember {
  id: number
  workspace_id: number
  user_id: string
  role: 'dono' | 'corretor'
  created_at: string
  workspace?: Workspace
  profile?: Profile
}

export interface Turma {
  id: number
  user_id: string
  workspace_id: number
  serie: string
  turma: string
  turno: string | null
  ativo: boolean
  created_at: string
}

export interface Aluno {
  id: number
  user_id: string
  workspace_id: number
  turma_id: number
  nome: string
  numero: number | null
  ativo: boolean
  created_at: string
}

export type CellType = 'carteira' | 'vazio' | 'bloqueado' | 'professor'

export interface GridCell {
  tipo: CellType
  alunoId: number | null
}

export type Grid = GridCell[][]

export interface Mapa {
  id: number
  user_id: string
  workspace_id: number
  turma_id: number
  nome: string
  linhas: number
  colunas: number
  layout_tipo: string
  grid: Grid
  mesa_professor: { linha: number; coluna: number } | null
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
