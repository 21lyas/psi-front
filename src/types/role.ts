import type { Division } from './division'
import type { PayRateLevel } from './payRateLevel'
import type { RoleBonusConfig } from './roleBonusConfig'
import type { PmBonusLevel } from './pmBonusLevel'

export interface Role {
  id: number
  division_id: number
  title: string
  pay_type: 'hourly' | 'hourly_bonus' | 'fix' | 'fix_bonus' | 'commission' | 'hourly_bonus_commission'
  cell_phone_reimbursement: number
  mileage_reimbursement: number
  has_additional_bonus_fix: boolean
  division?: Division
  payRateLevels?: PayRateLevel[]
  bonusConfigs?: RoleBonusConfig[]
  pmBonusLevels?: PmBonusLevel[]
}
