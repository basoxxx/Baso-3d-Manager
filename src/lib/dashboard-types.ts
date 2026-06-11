export interface Kpis {
  open_orders: number
  month_revenue: number
  total_customers: number
  kg_consumed_month: number
}

export interface DailyTotal {
  date: string
  total: number
}

export interface UpcomingOrder {
  id: string
  customer_id: string
  customer_name: string
  status: string
  created_at: string
  total: number
}

export interface DashboardData {
  kpis: Kpis
  revenue_30d: DailyTotal[]
  upcoming: UpcomingOrder[]
}
