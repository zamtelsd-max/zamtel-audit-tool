import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from './index';
import type {
  Device,
  User,
  AuditCase,
  ExecutiveDashboard,
  AuditorDashboard,
  Pagination,
} from '../types';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_URL,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.token;
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

// Auto-clear stale/invalid tokens on 401/403
async function baseQueryWithReauth(
  args: Parameters<typeof rawBaseQuery>[0],
  api: Parameters<typeof rawBaseQuery>[1],
  extraOptions: Parameters<typeof rawBaseQuery>[2]
) {
  const result = await rawBaseQuery(args, api, extraOptions);
  if (result.error && (result.error.status === 401 || result.error.status === 403)) {
    localStorage.removeItem('zamtel_token');
    localStorage.removeItem('zamtel_user');
    // Force reload to login screen
    if (window.location.hash !== '#/login' && !window.location.hash.includes('login')) {
      window.location.hash = '#/login';
      window.location.reload();
    }
  }
  return result;
}

export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Device', 'Case', 'User', 'Dashboard'],
  endpoints: (builder) => ({
    // Auth
    login: builder.mutation<{ token: string; user: User }, { staffId: string; password: string }>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
    }),

    // Devices
    getDevices: builder.query<
      { devices: Device[]; pagination: Pagination },
      { status?: string; province?: string; zone?: string; riskMin?: number; search?: string; page?: number; limit?: number }
    >({
      query: (params) => ({ url: '/devices', params }),
      providesTags: ['Device'],
    }),

    getDevice: builder.query<Device, string>({
      query: (id) => `/devices/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Device', id }],
    }),

    createDevice: builder.mutation<Device, Partial<Device>>({
      query: (body) => ({ url: '/devices', method: 'POST', body }),
      invalidatesTags: ['Device'],
    }),

    bulkImportDevices: builder.mutation<{ created: number; skipped: number; errors: string[] }, Partial<Device>[]>({
      query: (body) => ({ url: '/devices/bulk', method: 'POST', body }),
      invalidatesTags: ['Device'],
    }),

    updateDevice: builder.mutation<Device, { id: string; data: Partial<Device> }>({
      query: ({ id, data }) => ({ url: `/devices/${id}`, method: 'PATCH', body: data }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Device', id }, 'Device'],
    }),

    transferDevice: builder.mutation<void, { id: string; toUserId: string; notes?: string }>({
      query: ({ id, ...body }) => ({ url: `/devices/${id}/transfer`, method: 'POST', body }),
      invalidatesTags: ['Device'],
    }),

    acknowledgeTransfer: builder.mutation<void, string>({
      query: (id) => ({ url: `/devices/${id}/acknowledge`, method: 'POST' }),
      invalidatesTags: ['Device'],
    }),

    reportLost: builder.mutation<void, string>({
      query: (id) => ({ url: `/devices/${id}/report-lost`, method: 'POST' }),
      invalidatesTags: ['Device', 'Case'],
    }),

    getDeviceHistory: builder.query<{ transfers: unknown[]; activities: unknown[] }, string>({
      query: (id) => `/devices/${id}/history`,
    }),

    // Dashboard
    getExecutiveDashboard: builder.query<ExecutiveDashboard, void>({
      query: () => '/dashboard/executive',
      providesTags: ['Dashboard'],
    }),

    getAuditorDashboard: builder.query<AuditorDashboard, void>({
      query: () => '/dashboard/auditor',
      providesTags: ['Dashboard'],
    }),

    // Cases
    getCases: builder.query<
      { cases: AuditCase[]; pagination: Pagination },
      { status?: string; priority?: string; auditorId?: string; deviceId?: string; page?: number; limit?: number }
    >({
      query: (params) => ({ url: '/cases', params }),
      providesTags: ['Case'],
    }),

    getCase: builder.query<AuditCase, string>({
      query: (id) => `/cases/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Case', id }],
    }),

    createCase: builder.mutation<AuditCase, Partial<AuditCase>>({
      query: (body) => ({ url: '/cases', method: 'POST', body }),
      invalidatesTags: ['Case'],
    }),

    updateCase: builder.mutation<AuditCase, { id: string; data: Partial<AuditCase> }>({
      query: ({ id, data }) => ({ url: `/cases/${id}`, method: 'PATCH', body: data }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Case', id }, 'Case'],
    }),

    // Users
    getUsers: builder.query<User[], { role?: string; province?: string; active?: boolean }>({
      query: (params) => ({ url: '/users', params }),
      providesTags: ['User'],
    }),

    createUser: builder.mutation<User, Partial<User> & { password: string }>({
      query: (body) => ({ url: '/users', method: 'POST', body }),
      invalidatesTags: ['User'],
    }),

    updateUser: builder.mutation<User, { id: string; data: Partial<User> }>({
      query: ({ id, data }) => ({ url: `/users/${id}`, method: 'PATCH', body: data }),
      invalidatesTags: ['User'],
    }),

    resetPassword: builder.mutation<void, { id: string; password: string }>({
      query: ({ id, password }) => ({ url: `/users/${id}/password`, method: 'PATCH', body: { password } }),
    }),

    // Reports
    getProductivityReport: builder.query<unknown[], void>({
      query: () => '/reports/productivity',
    }),

    getLostStolenReport: builder.query<Device[], void>({
      query: () => '/reports/lost-stolen',
    }),

    getBatchReport: builder.query<unknown, string>({
      query: (batchId) => `/reports/batch/${batchId}`,
    }),

    getRiskWatchlist: builder.query<Device[], void>({
      query: () => '/reports/risk-watchlist',
    }),
  }),
});

export const {
  useLoginMutation,
  useGetDevicesQuery,
  useGetDeviceQuery,
  useCreateDeviceMutation,
  useBulkImportDevicesMutation,
  useUpdateDeviceMutation,
  useTransferDeviceMutation,
  useAcknowledgeTransferMutation,
  useReportLostMutation,
  useGetDeviceHistoryQuery,
  useGetExecutiveDashboardQuery,
  useGetAuditorDashboardQuery,
  useGetCasesQuery,
  useGetCaseQuery,
  useCreateCaseMutation,
  useUpdateCaseMutation,
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useResetPasswordMutation,
  useGetProductivityReportQuery,
  useGetLostStolenReportQuery,
  useGetBatchReportQuery,
  useGetRiskWatchlistQuery,
} = api;
