export interface Client {
  id: number
  client_type: 'individual' | 'business'
  company_name?: string
  contact_person: string
  phone: string
  email?: string
  address_street?: string
  address_postal_code?: string
  address_city?: string
  notes?: string
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

export interface ClientFormData {
  client_type: 'individual' | 'business'
  company_name?: string
  contact_person: string
  phone: string
  email?: string
  address_street?: string
  address_postal_code?: string
  address_city?: string
  notes?: string
}

export interface ClientFilters {
  search?: string
  type?: 'individual' | 'business' | 'all'
  status?: 'active' | 'inactive' | 'all'
} 