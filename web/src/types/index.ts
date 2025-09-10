import { Database } from './database.types'

export type Company = Database['public']['Tables']['companies']['Row']
export type CompanyInsert = Database['public']['Tables']['companies']['Insert']
export type CompanyUpdate = Database['public']['Tables']['companies']['Update']

export type User = Database['public']['Tables']['users']['Row']
export type UserInsert = Database['public']['Tables']['users']['Insert']
export type UserUpdate = Database['public']['Tables']['users']['Update']

export type Plan = Database['public']['Tables']['plans']['Row']
export type PlanInsert = Database['public']['Tables']['plans']['Insert']
export type PlanUpdate = Database['public']['Tables']['plans']['Update']

export type Subscription = Database['public']['Tables']['subscriptions']['Row']
export type SubscriptionInsert = Database['public']['Tables']['subscriptions']['Insert']
export type SubscriptionUpdate = Database['public']['Tables']['subscriptions']['Update']

export type AnalyticsSnapshot = Database['public']['Tables']['analytics_snapshots']['Row']
export type AnalyticsSnapshotInsert = Database['public']['Tables']['analytics_snapshots']['Insert']
export type AnalyticsSnapshotUpdate = Database['public']['Tables']['analytics_snapshots']['Update']

export type AIInsight = Database['public']['Tables']['ai_insights']['Row']
export type AIInsightInsert = Database['public']['Tables']['ai_insights']['Insert']
export type AIInsightUpdate = Database['public']['Tables']['ai_insights']['Update']

export type CompanyDashboard = Database['public']['Views']['company_dashboard']['Row']

// Custom types for the app
export interface UserWithCompany extends User {
  company: Company | null
}

export interface PlanWithFeatures extends Plan {
  features: string[]
  yearlyDiscount?: number
}

export interface SubscriptionWithPlan extends Subscription {
  plan: Plan
}

export interface CompanyWithSubscription extends Company {
  subscription: SubscriptionWithPlan | null
  team_members: User[]
}

// Auth types
export interface AuthUser {
  id: string
  email: string
  name?: string
  company_id?: string
}

// Onboarding types
export interface OnboardingStep {
  id: string
  title: string
  description: string
  completed: boolean
}

// Billing types
export interface CheckoutSession {
  sessionId: string
  url: string
}

export interface BillingPortalSession {
  url: string
}

// Analytics types
export interface TrafficData {
  date: string
  users: number
  pageviews: number
}

export interface FunnelStep {
  step: string
  users: number
  conversion_rate?: number
}

export interface DeviceBreakdown {
  device: string
  percentage: number
  users: number
}

export interface GeoData {
  country: string
  users: number
  percentage: number
}

// Email types
export interface EmailDigestData {
  company: Company
  snapshot: AnalyticsSnapshot
  insights: AIInsight | null
  period: string
}

// Feature flags
export type FeatureFlag = 
  | 'ai_insights'
  | 'slack_integration'
  | 'email_digest'
  | 'priority_support'
  | 'white_label_export'

// Error types
export interface AppError {
  message: string
  code?: string
  statusCode?: number
}

// API Response types
export interface ApiResponse<T = any> {
  data?: T
  error?: AppError
  success: boolean
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
