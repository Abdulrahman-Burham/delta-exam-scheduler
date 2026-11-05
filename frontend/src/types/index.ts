export type RoleEnum = 'ADMIN' | 'DOCTOR' | 'PROFESSOR' | 'TA';
export type VenueTypeEnum = 'HALL' | 'LAB';
export type AssignmentRoleEnum = 'LEAD_PROFESSOR' | 'INVIGILATOR_TA';

export interface User {
  id: string | number;
  staff_id: string;
  email: string;
  full_name: string;
  role: RoleEnum;
  department: string;
  title?: string;
  phone?: string;
  is_master_student?: boolean;
  max_daily_shifts: number;
  max_total_shifts: number;
  is_active: boolean;
  total_assigned_shifts?: number;
  total_assigned_hours?: number;
}

export interface Venue {
  id: number;
  name: string;
  venue_type: VenueTypeEnum;
  building: string;
  floor: number;
  capacity: number;
  is_active: boolean;
}

export interface ExamSession {
  id: number;
  course_code: string;
  course_name: string;
  department: string;
  date: string;
  start_time: string;
  end_time: string;
  student_headcount: number;
  venue_id: number;
  required_professors: number;
  required_tas: number;
  status: string;
  venue?: Venue;
}

export interface AvailabilityConstraint {
  id: number;
  user_id: string | number;
  date: string;
  start_time?: string;
  end_time?: string;
  constraint_type: 'UNAVAILABLE' | 'PREFERENCE_AVOID' | 'PREFERENCE_PREFER';
  reason?: string;
}

export interface ScheduleAssignmentDetail {
  id: number;
  schedule_run_id: number;
  exam_session_id: number;
  user_id: string | number;
  role_in_exam: AssignmentRoleEnum;
  is_locked: boolean;
  is_manual_override: boolean;
  override_notes?: string;
  user: User;
  exam_session: ExamSession;
}

export interface ScheduleRun {
  id: number;
  created_at?: string;
  status: string;
  algorithm_used: string;
  solve_time_ms: number;
  objective_value: number;
  workload_balance_weight: number;
  rest_interval_weight: number;
  building_proximity_weight: number;
  department_match_weight: number;
  total_sessions_count: number;
  total_assignments_count: number;
  is_current_active: boolean;
  notes?: string;
  assignments: ScheduleAssignmentDetail[];
}

export interface MatrixSlotItem {
  session_id: number;
  course_code: string;
  course_name: string;
  department: string;
  venue_id: number;
  venue_name: string;
  venue_building: string;
  venue_type: string;
  student_headcount: number;
  lead_professor?: User;
  tas: User[];
  is_fully_staffed: boolean;
  is_locked: boolean;
}

export interface MatrixScheduleView {
  dates: string[];
  time_slots: string[];
  venues: Array<{ id: number; name: string; building: string; type: string; capacity: number }>;
  cells: MatrixSlotItem[];
}

export interface UserWorkloadStat {
  user_id: string | number;
  full_name: string;
  role: RoleEnum;
  department: string;
  assigned_shifts_count: number;
  assigned_hours: number;
  target_hours: number;
  variance: number;
}

export interface ScheduleAnalytics {
  total_exam_sessions: number;
  total_venues: number;
  total_faculty: number;
  total_tas: number;
  total_assignments: number;
  coverage_rate_percent: number;
  fairness_index_percent: number;
  average_shifts_per_ta: number;
  average_shifts_per_prof: number;
  workload_distribution: UserWorkloadStat[];
  solver_status: string;
  algorithm_used: string;
}

export interface ScheduleRunConfig {
  workload_balance_weight: number;
  rest_interval_weight: number;
  building_proximity_weight: number;
  department_match_weight: number;
  honor_existing_locks: boolean;
}
