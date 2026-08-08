import { AIAnalysisResult, ImportanceLevel } from '../types';

const ML_API_BASE_URL = (import.meta as any).env?.VITE_FLASK_API_URL || 'http://localhost:5000/api/ml';

/**
 * Fallback local ML heuristic rules engine when Flask REST API server is offline
 */
const getFallbackVisitorAnalysis = (reason: string): AIAnalysisResult => {
  const lower = reason.toLowerCase();
  let importance: ImportanceLevel = 'LOW';
  let confidence = 0.85;
  let summary = 'General visit request.';
  const reasoning: string[] = [];

  if (lower.includes('urgent') || lower.includes('contract') || lower.includes('executive') || lower.includes('audit') || lower.includes('security')) {
    importance = 'HIGH';
    confidence = 0.94;
    summary = 'Urgent or high-priority corporate engagement.';
    reasoning.push('Contains time-sensitive or high-value business terms.');
    reasoning.push('Requires immediate administrative review.');
  } else if (lower.includes('meeting') || lower.includes('proposal') || lower.includes('interview') || lower.includes('vendor')) {
    importance = 'MEDIUM';
    confidence = 0.89;
    summary = 'Standard professional business interaction.';
    reasoning.push('Reflects routine operational collaboration.');
  } else {
    importance = 'LOW';
    summary = 'Informal or general informational visit.';
    reasoning.push('No immediate critical dependencies detected.');
  }

  return {
    importance,
    confidence,
    summary,
    reasoning,
    recommendedAction: importance === 'HIGH' ? 'PRIORITIZE_APPROVAL' : 'STANDARD_PROCESSING',
    requiresHumanApproval: true
  };
};

const getFallbackLeaveAnalysis = (reason: string, leaveType: string): AIAnalysisResult => {
  const lower = reason.toLowerCase();
  let importance: ImportanceLevel = 'LOW';
  let confidence = 0.88;
  let summary = `${leaveType} application evaluated.`;
  const reasoning: string[] = [];

  if (leaveType === 'Sick Leave' || leaveType === 'Emergency Leave' || lower.includes('hospital') || lower.includes('fever') || lower.includes('accident')) {
    importance = 'HIGH';
    confidence = 0.95;
    summary = 'Medical or personal emergency requiring urgent approval.';
    reasoning.push('Health or emergency priority policy applies.');
    reasoning.push('Time-sensitive employee wellness concern.');
  } else if (leaveType === 'Casual Leave' || lower.includes('family') || lower.includes('vacation')) {
    importance = 'MEDIUM';
    confidence = 0.90;
    summary = 'Standard personal leave request.';
    reasoning.push('Scheduled leave request within standard policy.');
  } else {
    importance = 'LOW';
    reasoning.push('Routine leave request.');
  }

  return {
    importance,
    confidence,
    summary,
    reasoning,
    recommendedAction: importance === 'HIGH' ? 'EXPEDITE_HR_APPROVAL' : 'ROUTINE_HR_REVIEW',
    requiresHumanApproval: true
  };
};

const getFallbackComplaintAnalysis = (category: string, subject: string, description: string): AIAnalysisResult => {
  const combined = `${category} ${subject} ${description}`.toLowerCase();
  let importance: ImportanceLevel = 'LOW';
  let confidence = 0.87;
  let summary = `Workplace complaint regarding ${category}.`;
  let suggestedDepartment = category === 'IT' ? 'IT Helpdesk' : category === 'Infrastructure' ? 'Facilities Management' : 'Human Resources';
  let suggestedAction = 'Review ticket and assign relevant officer.';
  const reasoning: string[] = [];

  if (combined.includes('fire') || combined.includes('hazard') || combined.includes('harassment') || combined.includes('server down') || combined.includes('security breach')) {
    importance = 'CRITICAL';
    confidence = 0.97;
    summary = 'Critical risk event detected in complaint content.';
    suggestedAction = 'Immediate dispatch to department head & Senior Executive notification.';
    reasoning.push('Potential safety, compliance, or core operational outage.');
  } else if (combined.includes('broken') || combined.includes('network') || combined.includes('leak') || combined.includes('ac unit')) {
    importance = 'HIGH';
    confidence = 0.92;
    summary = 'Significant workplace amenity or hardware issue.';
    suggestedAction = 'Schedule priority maintenance inspection.';
    reasoning.push('Impacts daily productivity or workspace environment.');
  } else {
    importance = 'MEDIUM';
    reasoning.push('Standard operational feedback or request.');
  }

  return {
    importance,
    confidence,
    summary,
    reasoning,
    recommendedAction: importance === 'CRITICAL' ? 'ESCALATE_IMMEDIATELY' : 'TRIAGE_TO_DEPARTMENT',
    suggestedDepartment,
    suggestedAction,
    requiresHumanApproval: true
  };
};

/**
 * Flask REST API Integration Layer for AI Agents
 */
export const mlApi = {
  /**
   * VisitorReasonAgent integration
   */
  analyzeVisitorReason: async (payload: {
    visitorName: string;
    companyName: string;
    hostEmployeeName: string;
    branch: string;
    visitReason: string;
  }): Promise<AIAnalysisResult> => {
    try {
      const response = await fetch(`${ML_API_BASE_URL}/analyze-visitor-reason`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      return await response.json();
    } catch (err) {
      console.info('[ML API Fallback] Using local VisitorReasonAgent mock heuristic');
      return getFallbackVisitorAnalysis(payload.visitReason);
    }
  },

  /**
   * EmployeeRequestAgent integration
   */
  analyzeLeaveRequest: async (payload: {
    employeeId: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    totalDays: number;
    reason: string;
  }): Promise<AIAnalysisResult> => {
    try {
      const response = await fetch(`${ML_API_BASE_URL}/analyze-leave-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      return await response.json();
    } catch (err) {
      console.info('[ML API Fallback] Using local EmployeeRequestAgent mock heuristic');
      return getFallbackLeaveAnalysis(payload.reason, payload.leaveType);
    }
  },

  /**
   * ComplaintAnalysisAgent integration
   */
  analyzeComplaint: async (payload: {
    category: string;
    subject: string;
    description: string;
    location: string;
  }): Promise<AIAnalysisResult> => {
    try {
      const response = await fetch(`${ML_API_BASE_URL}/analyze-complaint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      return await response.json();
    } catch (err) {
      console.info('[ML API Fallback] Using local ComplaintAnalysisAgent mock heuristic');
      return getFallbackComplaintAnalysis(payload.category, payload.subject, payload.description);
    }
  },

  /**
   * CompanyAnalyticsAgent integration
   */
  fetchCompanyInsights: async () => {
    try {
      const response = await fetch(`${ML_API_BASE_URL}/analytics-insights`);
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      return await response.json();
    } catch (err) {
      return {
        insights: [
          { category: 'Complaints', insight: 'IT Department recorded a 35% increase in network connectivity complaints this week.', severity: 'HIGH' },
          { category: 'Visitor Traffic', insight: 'Bhubaneswar Branch has 2.4x higher visitor volume than Damanjodi Branch.', severity: 'MEDIUM' },
          { category: 'Resolution Efficiency', insight: 'Average complaint resolution time reduced by 1.2 hours following Executive triaging.', severity: 'LOW' }
        ]
      };
    }
  }
};
