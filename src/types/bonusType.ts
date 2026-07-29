export interface BonusType {
  id: number
  code: string
  name: string
  formula: string | null
  description: string | null
  percentage: number | null
}
