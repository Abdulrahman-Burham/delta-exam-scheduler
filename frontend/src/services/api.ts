import {
  User,
  Venue,
  ExamSession,
  ScheduleRun,
  ScheduleRunConfig,
  ScheduleAssignmentDetail,
  MatrixScheduleView,
  ScheduleAnalytics,
  AvailabilityConstraint,
  VenueSchedule,
  SubstituteCandidate,
} from '../types';

const API_BASE = '/api';

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMsg = `Error ${res.status}: ${res.statusText}`;
    try {
      const errObj = await res.json();
      if (errObj.detail) {
        errorMsg = typeof errObj.detail === 'string' ? errObj.detail : JSON.stringify(errObj.detail);
      }
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }
  return res.json();
}

/**
 * Enterprise client fetch wrapper ensuring credentials: "include"
 * on every single request for automatic HttpOnly cookie forwarding.
 */
async function secureFetch(url: string, init: RequestInit = {}): Promise<Response> {
  return fetch(url, {
    ...init,
    credentials: 'include',
    headers: {
      ...getAuthHeaders(),
      ...(init.headers || {}),
    },
  });
}

export const api = {
  // Authentication & Session
  auth: {
    login: async (email: string, password: string) => {
      const res = await secureFetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      return handleResponse<{
        access_token: string;
        token_type: string;
        expires_in: number;
        user: User;
      }>(res);
    },
    logout: async () => {
      const res = await secureFetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
      });
      return handleResponse<{ detail: string }>(res);
    },
    getMe: async () => {
      const res = await secureFetch(`${API_BASE}/auth/me`);
      return handleResponse<User>(res);
    },
    switchDemoUser: async (email: string) => {
      const res = await secureFetch(`${API_BASE}/auth/switch-demo-user?email=${encodeURIComponent(email)}`, {
        method: 'POST',
      });
      return handleResponse<{
        access_token: string;
        token_type: string;
        user_id: string | number;
        staff_id: string;
        email: string;
        full_name: string;
        role: string;
        department: string;
        user?: User;
      }>(res);
    },
    forgotPassword: async (email: string) => {
      const res = await secureFetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      return handleResponse<{
        success: boolean;
        detail: string;
        reset_token?: string;
        user_name?: string;
        email?: string;
      }>(res);
    },
    resetPassword: async (token: string, newPassword: string) => {
      const res = await secureFetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: newPassword }),
      });
      return handleResponse<{
        success: boolean;
        detail: string;
      }>(res);
    },
  },

  // Admin Specific Endpoints (/api/admin/*)
  admin: {
    getSystemStats: async () => {
      const res = await secureFetch(`${API_BASE}/admin/system-stats`);
      return handleResponse<any>(res);
    },
    reseed: async () => {
      const res = await secureFetch(`${API_BASE}/admin/reseed`, {
        method: 'POST',
      });
      return handleResponse<{
        status: string;
        message: string;
        total_users: number;
        total_venues: number;
        total_exam_sessions: number;
        total_assignments: number;
        schedule_run_id: number;
      }>(res);
    },
  },

  // Faculty & Staff
  users: {
    list: async (role?: string) => {
      const url = role ? `${API_BASE}/users?role=${role}` : `${API_BASE}/users`;
      const res = await secureFetch(url);
      return handleResponse<User[]>(res);
    },
    get: async (id: string | number) => {
      const res = await secureFetch(`${API_BASE}/users/${id}`);
      return handleResponse<User & { constraints: AvailabilityConstraint[] }>(res);
    },
    create: async (data: any) => {
      const res = await secureFetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return handleResponse<User>(res);
    },
    delete: async (id: string | number) => {
      const res = await secureFetch(`${API_BASE}/users/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete staff member');
      return true;
    },
    update: async (id: string | number, data: any) => {
      const res = await secureFetch(`${API_BASE}/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      return handleResponse<User>(res);
    },
    addConstraint: async (userId: string | number, constraint: any) => {
      const res = await secureFetch(`${API_BASE}/users/${userId}/constraints`, {
        method: 'POST',
        body: JSON.stringify(constraint),
      });
      return handleResponse<AvailabilityConstraint>(res);
    },
    deleteConstraint: async (constraintId: number) => {
      const res = await secureFetch(`${API_BASE}/users/constraints/${constraintId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete constraint');
      return true;
    },
  },

  // Venues
  venues: {
    list: async () => {
      const res = await secureFetch(`${API_BASE}/venues`);
      return handleResponse<Venue[]>(res);
    },
    create: async (data: any) => {
      const res = await secureFetch(`${API_BASE}/venues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return handleResponse<Venue>(res);
    },
    delete: async (id: number) => {
      const res = await secureFetch(`${API_BASE}/venues/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete venue');
      return true;
    },
    getSchedule: async (id: number) => {
      const res = await secureFetch(`${API_BASE}/schedules/venue/${id}`);
      return handleResponse<VenueSchedule>(res);
    },
  },

  // Exam Sessions
  exams: {
    list: async () => {
      const res = await secureFetch(`${API_BASE}/exams`);
      return handleResponse<ExamSession[]>(res);
    },
    create: async (data: any) => {
      const res = await secureFetch(`${API_BASE}/exams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return handleResponse<ExamSession>(res);
    },
    delete: async (id: number) => {
      const res = await secureFetch(`${API_BASE}/exams/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete exam session');
      return true;
    },
  },

  // Schedules & Engine Execution
  schedules: {
    generate: async (config: ScheduleRunConfig) => {
      const res = await secureFetch(`${API_BASE}/schedules/generate`, {
        method: 'POST',
        body: JSON.stringify(config),
      });
      return handleResponse<ScheduleRun>(res);
    },
    getCurrent: async () => {
      const res = await secureFetch(`${API_BASE}/schedules/current`);
      return handleResponse<ScheduleRun>(res);
    },
    getMatrix: async () => {
      const res = await secureFetch(`${API_BASE}/schedules/matrix`);
      return handleResponse<MatrixScheduleView>(res);
    },
    override: async (assignmentId: number, newUserId: string | number, notes?: string) => {
      const res = await secureFetch(`${API_BASE}/schedules/override`, {
        method: 'POST',
        body: JSON.stringify({ assignment_id: assignmentId, new_user_id: newUserId, notes }),
      });
      return handleResponse<ScheduleAssignmentDetail>(res);
    },
    toggleLock: async (assignmentId: number, isLocked: boolean) => {
      const res = await secureFetch(`${API_BASE}/schedules/lock`, {
        method: 'POST',
        body: JSON.stringify({ assignment_id: assignmentId, is_locked: isLocked }),
      });
      return handleResponse<{ status: string; assignment_id: number; is_locked: boolean }>(res);
    },
    lockAll: async (lock: boolean = true) => {
      const res = await secureFetch(`${API_BASE}/schedules/lock-all?lock=${lock}`, {
        method: 'POST',
      });
      return handleResponse<{ status: string; is_locked: boolean }>(res);
    },
    getUserSchedule: async (userId: string | number) => {
      const res = await secureFetch(`${API_BASE}/schedules/user/${userId}`);
      return handleResponse<ScheduleAssignmentDetail[]>(res);
    },
    createAssignment: async (data: {
      exam_session_id: number;
      user_id: string | number;
      role_in_exam?: string;
      is_locked?: boolean;
      override_notes?: string;
    }) => {
      const res = await secureFetch(`${API_BASE}/schedules/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return handleResponse<ScheduleAssignmentDetail>(res);
    },
    deleteAssignment: async (assignmentId: number) => {
      const res = await secureFetch(`${API_BASE}/schedules/assignments/${assignmentId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to remove invigilation assignment');
      return true;
    },
    getEligibleSubstitutes: async (
      sessionId: number,
      role: string = 'INVIGILATOR_TA',
      sameDayOnly: boolean = true
    ) => {
      const res = await secureFetch(
        `${API_BASE}/schedules/eligible-substitutes?session_id=${sessionId}&role=${role}&same_day_only=${sameDayOnly}`
      );
      return handleResponse<SubstituteCandidate[]>(res);
    },
  },

  // Analytics
  analytics: {
    getSummary: async () => {
      const res = await secureFetch(`${API_BASE}/analytics/summary`);
      return handleResponse<ScheduleAnalytics>(res);
    },
  },

  // Exports URLs
  exports: {
    getMasterPdfUrl: () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      return token ? `${API_BASE}/exports/pdf/master?token=${encodeURIComponent(token)}` : `${API_BASE}/exports/pdf/master`;
    },
    getPersonalPdfUrl: (userId: string | number) => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      return token ? `${API_BASE}/exports/pdf/personal/${userId}?token=${encodeURIComponent(token)}` : `${API_BASE}/exports/pdf/personal/${userId}`;
    },
    getPersonalIcsUrl: (userId: string | number) => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      return token ? `${API_BASE}/exports/ics/${userId}?token=${encodeURIComponent(token)}` : `${API_BASE}/exports/ics/${userId}`;
    },
    getCsvUrl: () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      return token ? `${API_BASE}/exports/csv?token=${encodeURIComponent(token)}` : `${API_BASE}/exports/csv`;
    },
  },
};
