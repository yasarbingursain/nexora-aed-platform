/**
 * Organizations API
 * Handles all organization-related API calls
 */

import { apiClient } from './client';

export interface Organization {
  id: string;
  name: string;
  plan: string;
  status: 'active' | 'trial' | 'suspended' | 'inactive';
  users: number;
  entities: number;
  threats: number;
  revenue: number;
  riskScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationsResponse {
  organizations: Organization[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Fetch organizations with pagination
 * NO FALLBACK - Backend API must be available
 */
export async function fetchOrganizations(
  page: number = 1,
  pageSize: number = 25
): Promise<OrganizationsResponse> {
  // Direct backend API call - NO MOCK DATA, NO FALLBACK
  const response = await apiClient.get<OrganizationsResponse>(
    `/admin/organizations?page=${page}&pageSize=${pageSize}`
  );
  return response;
}

/**
 * Fetch single organization by ID
 * NO FALLBACK - Backend API must be available
 */
export async function fetchOrganization(id: string): Promise<Organization> {
  // Direct backend API call - NO MOCK DATA, NO FALLBACK
  return await apiClient.get<Organization>(`/admin/organizations/${id}`);
}

// NO DEMO DATA - ALL DATA MUST COME FROM BACKEND API

/**
 * Create new organization
 */
export async function createOrganization(data: Partial<Organization>): Promise<Organization> {
  return apiClient.post<Organization>('/admin/organizations', data);
}

/**
 * Update organization
 */
export async function updateOrganization(id: string, data: Partial<Organization>): Promise<Organization> {
  return apiClient.put<Organization>(`/admin/organizations/${id}`, data);
}

/**
 * Delete organization
 */
export async function deleteOrganization(id: string): Promise<void> {
  return apiClient.delete<void>(`/admin/organizations/${id}`);
}
