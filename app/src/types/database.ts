export interface Team {
  id: string
  name: string
  created_at: string
}

export interface User {
  id: string
  nickname: string
  team_id: string
  is_admin: boolean
  trees_earned: number
  special_tree_earned: boolean
  created_at: string
}

export interface BibleProgress {
  id: string
  user_id: string
  book_name: string
  chapter: number
  checked_at: string
}

export interface Tree {
  id: string
  user_id: string
  team_id: string
  tree_type: 'normal' | 'special'
  points: number
  is_planted: boolean
  x_ratio: number | null
  y_ratio: number | null
  obtained_at: string
  planted_at: string | null
}

export interface Challenge {
  id: string
  name: string
  start_date: string
  end_date: string
  is_active: boolean
  created_by: string | null
  created_at: string
}
