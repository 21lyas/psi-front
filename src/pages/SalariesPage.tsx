import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Calculator, ChevronRight } from 'lucide-react'
import Header from '../components/Layout/Header'
import { fetchAllEmployees } from '../api/endpoints/employees'
import { fetchRole } from '../api/endpoints/roles'
import type { Employee } from '../types/employee'
import { employeeDisplayName, employeeInitials } from '../utils/employeeName'
import type { Role } from '../types/role'
import type { RoleBonusConfig } from '../types/roleBonusConfig'

// ─── Types ────────────────────────────────────────────────────

type BaseInputs = {
  hours_worked: number
  miles_driven: number
  fixed_salary: number
  commission_revenue: number
  commission_pct: number
}

type BonusInputs = {
  lead_referral_revenue: number
  installation_sale_revenue: number
  service_work_profit: number
  installation_work_profit: number
  additional_performance_base: number
  additional_performance_pct: number
  kpi_fix_amount: number
  pm_bonus_level: number
  pm_bonus_jobs: number
}

const defaultBase = (): BaseInputs => ({
  hours_worked: 160, miles_driven: 0, fixed_salary: 0, commission_revenue: 0, commission_pct: 4,
})

const defaultBonus = (): BonusInputs => ({
  lead_referral_revenue: 0, installation_sale_revenue: 0, service_work_profit: 0,
  installation_work_profit: 0, additional_performance_base: 0, additional_performance_pct: 0,
  kpi_fix_amount: 0, pm_bonus_level: 1, pm_bonus_jobs: 0,
})

// ─── Calc ─────────────────────────────────────────────────────

function calcSalary(emp: Employee, role: Role, base: BaseInputs, bon: BonusInputs) {
  const pt = role.pay_type
  const rate = Number(role.payRateLevels?.find(l => l.level === emp.pay_level)?.hourly_rate ?? 0)

  const basePay =
    pt === 'hourly' || pt === 'hourly_bonus' || pt === 'hourly_bonus_commission'
      ? rate * base.hours_worked
      : pt === 'fix' || pt === 'fix_bonus'
      ? base.fixed_salary
      : 0

  const lines: { label: string; amount: number }[] = []

  for (const cfg of role.bonusConfigs ?? []) {
    if (!cfg.is_enabled) continue
    const code = cfg.bonusType?.code
    let amount = 0
    switch (code) {
      case 'lead_referral':
        amount = bon.lead_referral_revenue * 0.02
        break
      case 'installation_sale':
        amount = bon.installation_sale_revenue * 0.04
        break
      case 'service_work':
        amount = bon.service_work_profit * 0.20
        break
      case 'installation_work':
        amount = bon.installation_work_profit * 0.12
        break
      case 'additional_performance': {
        const cap = (cfg.max_percentage ?? 0) * 100
        const pct = Math.min(Math.max(0, bon.additional_performance_pct), cap)
        amount = bon.additional_performance_base * pct / 100
        break
      }
      case 'kpi_fix':
        amount = bon.kpi_fix_amount
        break
      case 'team_lead':
        amount = Number(cfg.fixed_amount ?? 2000)
        break
    }
    lines.push({ label: cfg.bonusType?.name ?? code ?? '', amount })
  }

  if ((role.pmBonusLevels?.length ?? 0) > 0) {
    const pmLvl = role.pmBonusLevels!.find(l => l.level === bon.pm_bonus_level)
    if (pmLvl) {
      lines.push({ label: `PM Bonus (Level ${bon.pm_bonus_level})`, amount: pmLvl.amount_per_job * bon.pm_bonus_jobs })
    }
  }

  const commission =
    pt === 'commission' || pt === 'hourly_bonus_commission'
      ? base.commission_revenue * base.commission_pct / 100
      : 0

  const cellPhone = Number(role.cell_phone_reimbursement)
  const mileage = Number(role.mileage_reimbursement) * base.miles_driven
  const totalBonuses = lines.reduce((s, l) => s + l.amount, 0)
  const total = basePay + totalBonuses + commission + cellPhone + mileage

  return { rate, basePay, lines, totalBonuses, commission, cellPhone, mileage, total }
}

// ─── Helpers ──────────────────────────────────────────────────

const PAY_TYPE_LABELS: Record<string, string> = {
  hourly: 'Hourly',
  hourly_bonus: 'Hourly + Bonus',
  fix: 'Fixed',
  fix_bonus: 'Fixed + Bonus',
  commission: 'Commission',
  hourly_bonus_commission: 'Hourly + Bonus + Com.',
}

const PAY_TYPE_COLORS: Record<string, string> = {
  hourly: 'bg-blue-50 text-blue-700',
  hourly_bonus: 'bg-purple-50 text-purple-700',
  fix: 'bg-emerald-50 text-emerald-700',
  fix_bonus: 'bg-teal-50 text-teal-700',
  commission: 'bg-orange-50 text-orange-700',
  hourly_bonus_commission: 'bg-rose-50 text-rose-700',
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ─── Sub-components ───────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{title}</p>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function NumInput({
  label, hint, value, onChange,
  prefix = '$', min = 0, max, step = 1,
}: {
  label: string; hint?: string; value: number; onChange: (v: number) => void
  prefix?: string; min?: number; max?: number; step?: number
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-800">{label}</p>
        {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
      </div>
      <div className="relative w-36 flex-shrink-0">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 select-none">{prefix}</span>
        )}
        <input
          type="number" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          className={`input-field py-1.5 text-sm text-right w-full ${prefix ? 'pl-6' : 'pl-3'}`}
        />
      </div>
    </div>
  )
}

function ResultRow({ label, amount, dim }: { label: string; amount: number; dim?: boolean }) {
  return (
    <div className={`flex justify-between items-center py-0.5 ${dim ? 'opacity-40' : ''}`}>
      <span className="text-sm text-gray-600 truncate mr-4">{label}</span>
      <span className="text-sm font-medium tabular-nums text-gray-900 flex-shrink-0">{fmt(amount)}</span>
    </div>
  )
}

function BonusInputField({ cfg, bon, setBn }: {
  cfg: RoleBonusConfig
  bon: BonusInputs
  setBn: (k: keyof BonusInputs, v: number) => void
}) {
  const code = cfg.bonusType?.code

  if (code === 'team_lead') {
    return (
      <div className="flex items-center justify-between py-0.5">
        <div>
          <p className="text-sm text-gray-800">Team Lead Bonus <span className="text-xs text-gray-400 ml-1">auto</span></p>
          <p className="text-xs text-gray-400">Fixed monthly</p>
        </div>
        <span className="text-sm font-semibold text-emerald-600">{fmt(Number(cfg.fixed_amount ?? 2000))}</span>
      </div>
    )
  }

  if (code === 'lead_referral') return (
    <NumInput
      label="Lead Referral Revenue"
      hint="Bonus: 2% of revenue"
      value={bon.lead_referral_revenue}
      onChange={v => setBn('lead_referral_revenue', v)}
      step={100}
    />
  )

  if (code === 'installation_sale') return (
    <NumInput
      label="Installation Sale Revenue"
      hint="Bonus: 4% of revenue"
      value={bon.installation_sale_revenue}
      onChange={v => setBn('installation_sale_revenue', v)}
      step={100}
    />
  )

  if (code === 'service_work') return (
    <NumInput
      label="Service Work Profit"
      hint="Bonus: 20% of profit"
      value={bon.service_work_profit}
      onChange={v => setBn('service_work_profit', v)}
      step={100}
    />
  )

  if (code === 'installation_work') return (
    <NumInput
      label="Installation Work Profit"
      hint="Bonus: 12% of profit"
      value={bon.installation_work_profit}
      onChange={v => setBn('installation_work_profit', v)}
      step={100}
    />
  )

  if (code === 'additional_performance') {
    const cap = (cfg.max_percentage ?? 0) * 100
    return (
      <>
        <NumInput
          label="Performance Revenue / Base"
          hint={`Max bonus: ${cap.toFixed(0)}% of this amount`}
          value={bon.additional_performance_base}
          onChange={v => setBn('additional_performance_base', v)}
          step={100}
        />
        <NumInput
          label="Performance %"
          hint={`Allowed: 0 – ${cap.toFixed(0)}%`}
          value={bon.additional_performance_pct}
          onChange={v => setBn('additional_performance_pct', Math.min(v, cap))}
          prefix="%" min={0} max={cap} step={0.5}
        />
      </>
    )
  }

  if (code === 'kpi_fix') return (
    <NumInput
      label="KPI Bonus"
      hint="Fixed amount"
      value={bon.kpi_fix_amount}
      onChange={v => setBn('kpi_fix_amount', v)}
      step={50}
    />
  )

  return null
}

// ─── Main Page ────────────────────────────────────────────────

export default function SalariesPage() {
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [base, setBase] = useState<BaseInputs>(defaultBase())
  const [bon, setBon] = useState<BonusInputs>(defaultBonus())

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'], queryFn: fetchAllEmployees,
  })

  const selectedEmp = employees.find(e => e.id === selectedId) ?? null

  const { data: role, isLoading: roleLoading } = useQuery({
    queryKey: ['role', selectedEmp?.role_id],
    queryFn: () => fetchRole(selectedEmp!.role_id!),
    enabled: !!selectedEmp?.role_id,
  })

  const selectEmp = (emp: Employee) => {
    setSelectedId(emp.id)
    setBase(defaultBase())
    setBon(defaultBonus())
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return employees
    const q = search.toLowerCase()
    return employees.filter(e =>
      employeeDisplayName(e).toLowerCase().includes(q) ||
      e.role?.title?.toLowerCase().includes(q) ||
      e.role?.division?.name?.toLowerCase().includes(q)
    )
  }, [employees, search])

  const result = selectedEmp && role ? calcSalary(selectedEmp, role, base, bon) : null

  const setB = (k: keyof BaseInputs, v: number) => setBase(p => ({ ...p, [k]: v }))
  const setBn = (k: keyof BonusInputs, v: number) => setBon(p => ({ ...p, [k]: v }))

  const pt = role?.pay_type
  const hasHourly = pt === 'hourly' || pt === 'hourly_bonus' || pt === 'hourly_bonus_commission'
  const hasFix = pt === 'fix' || pt === 'fix_bonus'
  const hasCommission = pt === 'commission' || pt === 'hourly_bonus_commission'
  const hasBonusSection = (role?.bonusConfigs?.filter(c => c.is_enabled).length ?? 0) > 0
  const hasPmBonus = (role?.pmBonusLevels?.length ?? 0) > 0

  return (
    <>
      <Header title="Salaries" subtitle="Employee salary calculator" />
      <div className="p-6">
        <div className="flex gap-5" style={{ height: 'calc(100vh - 130px)' }}>

          {/* ── Employee List ─────────────────────────────── */}
          <div className="w-72 flex-shrink-0 flex flex-col card overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  className="input-field pl-8 py-1.5 text-xs w-full"
                  placeholder="Search employee..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="overflow-y-auto flex-1">
              {isLoading && [...Array(8)].map((_, i) => (
                <div key={i} className="px-4 py-3 border-b border-gray-50">
                  <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4 mb-1.5" />
                  <div className="h-3 bg-gray-50 rounded animate-pulse w-1/2" />
                </div>
              ))}
              {filtered.map(emp => {
                const active = emp.id === selectedId
                return (
                  <button
                    key={emp.id}
                    onClick={() => selectEmp(emp)}
                    className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors flex items-center gap-2 ${active ? 'bg-primary-50 border-l-2 border-l-primary-500' : ''}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-medium truncate ${active ? 'text-primary-700' : 'text-gray-900'}`}>
                        {employeeDisplayName(emp)}
                      </p>
                      <p className="text-xs text-gray-400 truncate mt-0.5">{emp.role?.division?.name} · {emp.role?.title}</p>
                      <span className={`mt-1.5 inline-block text-xs px-1.5 py-0.5 rounded font-medium ${PAY_TYPE_COLORS[emp.role?.pay_type ?? ''] ?? 'bg-gray-100 text-gray-500'}`}>
                        {PAY_TYPE_LABELS[emp.role?.pay_type ?? ''] ?? emp.role?.pay_type}
                      </span>
                    </div>
                    {active && <ChevronRight size={14} className="text-primary-400 flex-shrink-0" />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Calculator ───────────────────────────────── */}
          <div className="flex-1 overflow-y-auto">
            {!selectedEmp ? (
              <div className="card h-full flex flex-col items-center justify-center text-center p-8">
                <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center mb-4">
                  <Calculator size={28} className="text-primary-400" />
                </div>
                <p className="text-base font-semibold text-gray-700">Select an employee</p>
                <p className="text-sm text-gray-400 mt-1 max-w-xs">Click an employee on the left to calculate their monthly salary</p>
              </div>
            ) : roleLoading ? (
              <div className="card p-6 space-y-3">
                {[...Array(6)].map((_, i) => <div key={i} className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: `${60 + (i * 13) % 35}%` }} />)}
              </div>
            ) : role ? (
              <div className="card overflow-hidden">

                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/60">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500/20 to-purple-500/20 flex items-center justify-center text-primary-600 text-base font-bold flex-shrink-0">
                      {employeeInitials(selectedEmp)}
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">
                        {employeeDisplayName(selectedEmp)}
                      </h3>
                      <p className="text-sm text-gray-500">{role.division?.name} · {role.title}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md font-medium">
                          Level {selectedEmp.pay_level}
                        </span>
                        {result && result.rate > 0 && (
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md">
                            ${result.rate.toFixed(2)}/h
                          </span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${PAY_TYPE_COLORS[role.pay_type]}`}>
                          {PAY_TYPE_LABELS[role.pay_type]}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 grid grid-cols-2 gap-8">

                  {/* ── Inputs column ── */}
                  <div className="space-y-6">

                    {hasHourly && (
                      <Section title="Base Pay">
                        <NumInput
                          label="Hours worked"
                          hint={result ? `× $${result.rate.toFixed(2)}/h = ${fmt(result.basePay)}` : undefined}
                          value={base.hours_worked}
                          onChange={v => setB('hours_worked', v)}
                          prefix="" min={0} step={0.5}
                        />
                      </Section>
                    )}

                    {hasFix && (
                      <Section title="Base Pay">
                        <NumInput
                          label="Fixed salary / month"
                          value={base.fixed_salary}
                          onChange={v => setB('fixed_salary', v)}
                          step={100}
                        />
                      </Section>
                    )}

                    {(hasBonusSection || hasPmBonus) && (
                      <Section title="Bonuses">
                        {(role.bonusConfigs ?? []).filter(c => c.is_enabled).map(cfg => (
                          <BonusInputField key={cfg.id} cfg={cfg} bon={bon} setBn={setBn} />
                        ))}

                        {hasPmBonus && (
                          <>
                            <div className="flex items-center gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-800">PM Bonus Level</p>
                                <p className="text-xs text-gray-400">
                                  {role.pmBonusLevels!.map(l => `Lv${l.level}: $${l.amount_per_job}`).join(' · ')}
                                </p>
                              </div>
                              <select
                                value={bon.pm_bonus_level}
                                onChange={e => setBn('pm_bonus_level', +e.target.value)}
                                className="input-field py-1.5 text-sm w-28 flex-shrink-0"
                              >
                                {role.pmBonusLevels!.map(l => (
                                  <option key={l.level} value={l.level}>Level {l.level}</option>
                                ))}
                              </select>
                            </div>
                            <NumInput
                              label="Number of jobs (PM)"
                              hint={`$${role.pmBonusLevels!.find(l => l.level === bon.pm_bonus_level)?.amount_per_job ?? 0} per job`}
                              value={bon.pm_bonus_jobs}
                              onChange={v => setBn('pm_bonus_jobs', v)}
                              prefix="" min={0}
                            />
                          </>
                        )}
                      </Section>
                    )}

                    {hasCommission && (
                      <Section title="Commission">
                        <NumInput
                          label="Revenue (deals)"
                          value={base.commission_revenue}
                          onChange={v => setB('commission_revenue', v)}
                          step={500}
                        />
                        <NumInput
                          label="Commission rate"
                          hint={result ? `= ${fmt(result.commission)}` : undefined}
                          value={base.commission_pct}
                          onChange={v => setB('commission_pct', v)}
                          prefix="%" min={0} max={100} step={0.5}
                        />
                      </Section>
                    )}

                    <Section title="Reimbursements">
                      <NumInput
                        label="Mileage (miles)"
                        hint={`× $${Number(role.mileage_reimbursement).toFixed(4)}/mi`}
                        value={base.miles_driven}
                        onChange={v => setB('miles_driven', v)}
                        prefix="" min={0} step={10}
                      />
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <p className="text-sm text-gray-800">Phone reimbursement <span className="text-xs text-gray-400 ml-1">auto</span></p>
                          <p className="text-xs text-gray-400">Monthly</p>
                        </div>
                        <span className="text-sm font-semibold text-emerald-600">{fmt(Number(role.cell_phone_reimbursement))}</span>
                      </div>
                    </Section>
                  </div>

                  {/* ── Results column ── */}
                  {result && (
                    <div className="space-y-5">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Breakdown</p>

                      <div className="bg-gray-50 rounded-xl p-4 space-y-1.5">
                        {hasHourly && (
                          <ResultRow
                            label={`Base (${base.hours_worked}h × $${result.rate.toFixed(2)})`}
                            amount={result.basePay}
                          />
                        )}
                        {hasFix && (
                          <ResultRow label="Fixed salary" amount={result.basePay} />
                        )}

                        {result.lines.map((l, i) => (
                          <ResultRow key={i} label={l.label} amount={l.amount} dim={l.amount === 0} />
                        ))}

                        {hasCommission && (
                          <ResultRow label={`Commission (${base.commission_pct}%)`} amount={result.commission} dim={result.commission === 0} />
                        )}

                        <div className="border-t border-gray-200 my-2" />

                        <ResultRow label={`Mileage (${base.miles_driven} mi)`} amount={result.mileage} dim={result.mileage === 0} />
                        <ResultRow label="Phone" amount={result.cellPhone} />

                        <div className="border-t border-gray-200 mt-3 pt-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-bold text-gray-900">Total / month</span>
                            <span className="text-2xl font-bold text-primary-600 tabular-nums">{fmt(result.total)}</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5 pt-2">
                          {result.basePay > 0 && (
                            <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">
                              Base {fmt(result.basePay)}
                            </span>
                          )}
                          {result.totalBonuses > 0 && (
                            <span className="text-xs px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full">
                              Bonuses {fmt(result.totalBonuses)}
                            </span>
                          )}
                          {result.commission > 0 && (
                            <span className="text-xs px-2 py-0.5 bg-orange-50 text-orange-600 rounded-full">
                              Commission {fmt(result.commission)}
                            </span>
                          )}
                          {(result.cellPhone + result.mileage) > 0 && (
                            <span className="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full">
                              Reimbursements {fmt(result.cellPhone + result.mileage)}
                            </span>
                          )}
                        </div>
                      </div>

                      {(role.payRateLevels?.length ?? 0) > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Pay Rate Table</p>
                          <div className="rounded-xl overflow-hidden border border-gray-100">
                            {role.payRateLevels!.map(lvl => {
                              const active = lvl.level === selectedEmp.pay_level
                              return (
                                <div
                                  key={lvl.id}
                                  className={`flex justify-between items-center px-4 py-2 text-sm border-b border-gray-50 last:border-0 ${active ? 'bg-primary-50' : 'bg-white hover:bg-gray-50'}`}
                                >
                                  <span className={`font-medium ${active ? 'text-primary-700' : 'text-gray-500'}`}>
                                    Level {lvl.level} {active ? '●' : ''}
                                  </span>
                                  <span className={`tabular-nums ${active ? 'text-primary-700 font-semibold' : 'text-gray-400'}`}>
                                    ${Number(lvl.hourly_rate).toFixed(2)}/h
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="card h-full flex flex-col items-center justify-center text-center p-8">
                <p className="text-sm text-gray-400 max-w-xs">This employee has no role assigned yet — set a role on their profile to calculate salary.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
