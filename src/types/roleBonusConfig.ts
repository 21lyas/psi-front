import type { BonusType } from './bonusType'
import type { Role } from './role'

export interface RoleBonusConfig {
  id: number
  role_id: number
  bonus_type_id: number
  is_enabled: boolean
  max_percentage: number | null
  fixed_amount: number | null
  bonusType?: BonusType
  role?: Role
}
