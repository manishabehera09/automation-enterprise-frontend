export type Role = 'visitor' | 'employee' | 'admin' | 'executive';

export type ImportanceLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  mobile?: string;
  company?: string;
  department?: string;
  designation?: string;
  branch?: string;
}

export interface AIAnalysisResult {
  importance: ImportanceLevel;
  confidence: number;
  summary: string;
  reasoning: string[];
  recommendedAction: string;
  suggestedDepartment?: string;
  suggestedAction?: string;
  requiresHumanApproval: boolean;
}

export interface VisitorRequest {
  id: string;
  visitorName: string;
  visitorEmail: string;
  visitorPhone: string;
  companyName: string;
  branchId: string;
  branchName: string;
  hostEmployeeId: string;
  hostEmployeeName: string;
  hostDepartment: string;
  visitReason: string;
  visitDate: string;
  visitTime: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  aiAnalysis?: AIAnalysisResult;
  adminRemarks?: string;
  rejectionReason?: string;
  approvedBy?: string;
  approvalTimestamp?: string;
  qrVerificationId?: string;
  createdAt: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  leaveType: 'Casual Leave' | 'Sick Leave' | 'Earned Leave' | 'Emergency Leave' | 'Other';
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  documentUrl?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  aiAnalysis?: AIAnalysisResult;
  adminRemarks?: string;
  rejectionReason?: string;
  createdAt: string;
}

export interface Complaint {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  category: 'Infrastructure' | 'IT' | 'HR' | 'Transport' | 'Workplace' | 'Security' | 'Facilities' | 'Other';
  subject: string;
  description: string;
  location: string;
  priority: ImportanceLevel;
  attachmentUrl?: string;
  status: 'SUBMITTED' | 'AI_ANALYZED' | 'ADMIN_REVIEW' | 'SOLVED' | 'FORWARDED_TO_EXEC' | 'UNDER_EXEC_REVIEW' | 'RESOLVED';
  aiAnalysis?: AIAnalysisResult;
  adminResolution?: string;
  forwardingReason?: string;
  executiveResolution?: string;
  handledByAdminId?: string;
  handledByExecId?: string;
  updatedAt: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  role: Role;
  action: string;
  entityType: 'VISITOR' | 'LEAVE' | 'COMPLAINT' | 'AUTH';
  entityId: string;
  previousStatus?: string;
  newStatus: string;
  aiRecommendation?: string;
  humanDecision?: string;
  remarks?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  channel: 'email' | 'sms' | 'whatsapp' | 'push';
  read?: boolean;
}
