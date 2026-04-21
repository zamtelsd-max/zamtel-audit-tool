export type DeviceStatus =
  | 'IN_STOCK'
  | 'IN_TRANSIT'
  | 'ASSIGNED'
  | 'ACTIVE'
  | 'INACTIVE'
  | 'LOST'
  | 'STOLEN'
  | 'DAMAGED'
  | 'RETURNED'
  | 'WRITTEN_OFF';

export type UserRole =
  | 'ADMIN'
  | 'MARKET_MANAGEMENT'
  | 'TRADE_AUDITOR'
  | 'ASE'
  | 'TSE'
  | 'BDC'
  | 'TDR'
  | 'TEAM_LEAD'
  | 'AGENT'
  | 'RETAILER';

export interface User {
  id: string;
  staffId: string;
  name: string;
  role: UserRole;
  phone?: string;
  email?: string;
  province?: string;
  zone?: string;
  active: boolean;
  createdAt: string;
  _count?: { devices: number };
}

export interface Device {
  id: string;
  imei: string;
  serialNo?: string;
  assetTag: string;
  model: string;
  msisdn?: string;
  internalSim?: string;
  batchId?: string;
  status: DeviceStatus;
  currentCustodianId?: string;
  province?: string;
  district?: string;
  zone?: string;
  route?: string;
  outlet?: string;
  riskScore: number;
  riskFlags: string[];
  lastActivityAt?: string;
  createdAt: string;
  updatedAt: string;
  custodian?: User;
  transfers?: TransferLog[];
  activities?: ActivityLog[];
  auditCases?: AuditCase[];
}

export interface TransferLog {
  id: string;
  deviceId: string;
  fromUserId?: string;
  toUserId: string;
  timestamp: string;
  acknowledgedAt?: string;
  status: string;
  notes?: string;
  fromUser?: User;
  toUser?: User;
}

export interface ActivityLog {
  id: string;
  deviceId: string;
  date: string;
  totalRegistrations: number;
  offHoursCount: number;
  suspiciousFlags: string[];
}

export interface AuditCase {
  id: string;
  deviceId: string;
  auditorId: string;
  status: string;
  priority: string;
  reason: string;
  fieldNotes?: string;
  resolution?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  device?: Device;
  auditor?: User;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ExecutiveDashboard {
  totalDevices: number;
  active: number;
  inactive: number;
  lost: number;
  stolen: number;
  highRisk: number;
  avgProductivity: number;
  openCases: number;
  pendingAcknowledgements: number;
  byStatus: Record<string, number>;
  byProvince: { province: string | null; count: number }[];
}

export interface AuditorDashboard {
  openCases: number;
  criticalAlerts: number;
  devicesOverdue: number;
  pendingAcks: number;
  recentCases: AuditCase[];
  topAlerts: Device[];
}

export interface AuthState {
  token: string | null;
  user: {
    id: string;
    staffId: string;
    name: string;
    role: UserRole;
    province?: string;
    zone?: string;
  } | null;
  isAuthenticated: boolean;
}
