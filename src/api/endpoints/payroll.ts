import { instance } from '../instance'

export interface GustoEmployee {
  uuid: string
  first_name: string
  last_name: string
  email: string
  department: string
  hourly_rate: number | null
  job_title: string | null
}

export interface PayrollDate {
  check_date: string
  pay_period_start_date: string
  pay_period_end_date: string
}

export interface EarningsSummary {
  employee: {
    uuid: string
    first_name: string
    last_name: string
    email: string
    department: string
  }
  company: { name: string; street_1: string; city: string; state: string; zip: string }
  job: { title: string; rate: number; payment_unit: string } | null
  period: {
    payPeriodStart: string
    payPeriodEnd: string
    checkDate: string
    paymentMethod: string
  }
  earnings: {
    regularHours: number
    regularAmount: number
    overtimeHours: number
    overtimeAmount: number
    sickHours: number
    sickAmount: number
    fixedComps: { name: string; amount: number }[]
    totalHours: number
    grossPay: number
  }
  ytd: {
    regularHours: number
    regularAmount: number
    overtimeHours: number
    overtimeAmount: number
    grossPay: number
    netPay: number
  }
  summary: {
    grossPay: number
    taxes: number
    netPay: number
    checkAmount: number
    netIsEstimated: boolean
    totalHoursWorked: number
  }
}

export const fetchGustoEmployees = (): Promise<GustoEmployee[]> =>
  instance.get('/payroll/employees').then(r => r.data)

export const fetchPayrollDates = (uuid: string): Promise<PayrollDate[]> =>
  instance.get(`/payroll/employees/${uuid}/payroll-dates`).then(r => r.data)

export const fetchEarningsSummary = (uuid: string, checkDate?: string): Promise<EarningsSummary> =>
  instance
    .get(`/payroll/earnings-statement/${uuid}/summary`, { params: checkDate ? { checkDate } : {} })
    .then(r => r.data)

export interface RangeEarnings {
  employee: { uuid: string; first_name: string; last_name: string; email: string; department: string }
  job: { title: string; rate: number } | null
  range: { from: string; to: string }
  periods: number
  earnings: {
    regularHours: number
    regularAmount: number
    overtimeHours: number
    overtimeAmount: number
    sickHours: number
    sickAmount: number
    vacationHours: number
    fixedComps: { name: string; amount: number }[]
    totalHours: number
    grossPay: number
  }
  summary: {
    grossPay: number
    taxes: number
    netPay: number
    netIsEstimated: boolean
    totalHoursWorked: number
  }
}

export const fetchEarningsByRange = (uuid: string, from: string, to: string): Promise<RangeEarnings> =>
  instance.get(`/payroll/earnings-statement/${uuid}/range`, { params: { from, to } }).then(r => r.data)

export const getEarningsStatementPdfUrl = (uuid: string, checkDate?: string) => {
  const base = instance.defaults.baseURL ?? 'http://localhost:3000/api'
  const params = checkDate ? `?checkDate=${checkDate}` : ''
  return `${base}/payroll/earnings-statement/${uuid}${params}`
}
