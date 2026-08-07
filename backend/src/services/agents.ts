import { DBService, VisitorRequest, AuditLog } from "./db";
import { GoogleGenAI } from "@google/generative-ai";

// Initialize Gemini if key is provided
let geminiModel: any = null;
if (process.env.GEMINI_API_KEY) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    geminiModel = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
  } catch (e) {
    console.error("Failed to initialize Google Gemini API:", e);
  }
}

// Notification queue for demo mode on-screen display
export interface DemoNotification {
  id: string;
  requestId?: string;
  recipientEmail: string;
  channel: "email" | "sms" | "whatsapp" | "push";
  title: string;
  message: string;
  timestamp: string;
}

let notificationQueue: DemoNotification[] = [];

export function getDemoNotifications(): DemoNotification[] {
  return notificationQueue;
}

export function clearDemoNotifications() {
  notificationQueue = [];
}

// --- Agent 1: Document Verification Agent ---
export async function runDocumentVerificationAgent(
  visitorName: string,
  govIdUrl: string,
  govIdType: string
): Promise<{
  extractedName: string;
  extractedId: string;
  confidence: number;
  documentVerified: boolean;
}> {
  // If Gemini API is available and it's a real file upload, we'd query it.
  // In demo/mock mode, we simulate OCR parsing with deterministic rules based on inputs.
  return new Promise((resolve) => {
    setTimeout(() => {
      // Create slightly normalized/simulated OCR outcomes
      const nameParts = visitorName.trim().toUpperCase().split(" ");
      const extractedName = nameParts.join(" ");
      let extractedId = "1111-2222-3333";
      
      if (govIdType === "pan") {
        extractedId = "ABCDE1234F";
      }

      resolve({
        extractedName,
        extractedId,
        confidence: 0.98,
        documentVerified: true,
      });
    }, 1000);
  });
}

// --- Agent 2: Risk Analysis Agent ---
export async function runRiskAnalysisAgent(
  visitorName: string,
  company: string,
  govIdNumber: string,
  purpose: string
): Promise<{
  riskScore: "low" | "medium" | "high";
  riskReasoning: string;
  evidenceUsed: string;
  confidenceScore: number;
}> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const blacklist = DBService.getBlacklist();
      const normName = visitorName.trim().toLowerCase();
      const normDocId = govIdNumber.replace(/[\s-]/g, "").toLowerCase();

      // Check blacklist match
      const matchedBanned = blacklist.find(b => {
        if (b.name.toLowerCase() === normName) return true;
        if (b.idNumber && b.idNumber.replace(/[\s-]/g, "").toLowerCase() === normDocId) return true;
        return false;
      });

      if (matchedBanned) {
        resolve({
          riskScore: "high",
          riskReasoning: `Visitor "${visitorName}" matches security blacklist item "${matchedBanned.name}". Access strictly restricted.`,
          evidenceUsed: `System blacklist db contains name: "${matchedBanned.name}" or document ID matching: "${govIdNumber}"`,
          confidenceScore: 1.0,
        });
        return;
      }

      // Check purpose of visit risk flags
      const highRiskKeywords = ["server room", "datacenter", "mainframe", "wiring closet", "vault"];
      const containsHighRiskKeyword = highRiskKeywords.some(keyword => purpose.toLowerCase().includes(keyword));

      if (containsHighRiskKeyword) {
        resolve({
          riskScore: "medium",
          riskReasoning: "Visitor is requesting access to a high-security restricted area (Server Room / Datacenter). Requires escalation to Executive Security.",
          evidenceUsed: `Purpose contains restricted keyword: "${purpose}"`,
          confidenceScore: 0.85,
        });
        return;
      }

      // Default low risk
      resolve({
        riskScore: "low",
        riskReasoning: "No matches in security blacklist. Destination is standard office space. Normal business collaboration purpose.",
        evidenceUsed: "Identity checks clean. Blacklist scan returned zero results.",
        confidenceScore: 0.95,
      });
    }, 1000);
  });
}

// --- Agent 3: Approval Recommendation Agent ---
export async function runApprovalRecommendationAgent(
  verificationSuccess: boolean,
  riskScore: "low" | "medium" | "high",
  department: string
): Promise<{
  recommendation: "approve" | "reject" | "escalate";
  confidenceScore: number;
  evidence: string;
}> {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (!verificationSuccess) {
        resolve({
          recommendation: "reject",
          confidenceScore: 0.99,
          evidence: "Identity document verification failed standard formatting or integrity tests.",
        });
        return;
      }

      if (riskScore === "high") {
        resolve({
          recommendation: "reject",
          confidenceScore: 0.95,
          evidence: "Visitor flagged as HIGH RISK due to system blacklist validation matches.",
        });
        return;
      }

      if (riskScore === "medium") {
        resolve({
          recommendation: "escalate",
          confidenceScore: 0.90,
          evidence: "Risk vector is MEDIUM. Requires Senior Executive review due to sensitive destination department or purpose.",
        });
        return;
      }

      // Low Risk + Verified
      resolve({
        recommendation: "approve",
        confidenceScore: 0.96,
        evidence: "Document OCR verified. Risk analysis is Low. Recommended for instant Employee approval.",
      });
    }, 1000);
  });
}

// --- Agent 4: Scheduling Agent ---
export async function runSchedulingAgent(
  employeeId: string,
  scheduledTimeStr: string,
  durationMinutes: number
): Promise<{
  roomAllocated: string;
  conflictDetected: boolean;
  alternativeTimes: string[];
}> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const scheduledTime = new Date(scheduledTimeStr);
      const requests = DBService.getRequests();
      
      // Filter active requests for this employee at same time
      const conflict = requests.some(req => {
        if (req.meetingDetails.employeeId !== employeeId) return false;
        if (req.status === "rejected" || req.status === "checked_out") return false;

        const reqStart = new Date(req.meetingDetails.scheduledTime);
        const reqEnd = new Date(reqStart.getTime() + req.meetingDetails.durationMinutes * 60 * 1000);
        const newStart = scheduledTime;
        const newEnd = new Date(newStart.getTime() + durationMinutes * 60 * 1000);

        // Check overlapping interval
        return newStart < reqEnd && newEnd > reqStart;
      });

      const rooms = ["Conference Room A", "Boardroom B", "Innovation Hub", "Meeting Pod 2", "Executive Suite 4"];
      const roomAllocated = rooms[Math.floor(Math.random() * rooms.length)];

      if (conflict) {
        const alt1 = new Date(scheduledTime.getTime() + 60 * 60 * 1000).toISOString(); // +1 hour
        const alt2 = new Date(scheduledTime.getTime() + 2 * 60 * 60 * 1000).toISOString(); // +2 hours
        resolve({
          roomAllocated,
          conflictDetected: true,
          alternativeTimes: [alt1, alt2],
        });
      } else {
        resolve({
          roomAllocated,
          conflictDetected: false,
          alternativeTimes: [],
        });
      }
    }, 1000);
  });
}

// --- Agent 5: Notification Agent ---
export async function runNotificationAgent(
  requestId: string,
  recipientEmail: string,
  title: string,
  message: string,
  channels: ("email" | "sms" | "whatsapp" | "push")[]
): Promise<{
  sentChannels: string[];
  deliveryStatus: string;
}> {
  return new Promise((resolve) => {
    setTimeout(() => {
      channels.forEach(channel => {
        notificationQueue.push({
          id: `noti-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          requestId,
          recipientEmail,
          channel,
          title,
          message,
          timestamp: new Date().toISOString(),
        });
      });

      resolve({
        sentChannels: channels,
        deliveryStatus: "delivered",
      });
    }, 500);
  });
}

// --- Agent 6: Audit Agent ---
export function runAuditAgent(
  userId: string,
  userEmail: string,
  role: string,
  action: string,
  previousState: any,
  newState: any,
  ipAddress: string,
  userAgent: string,
  aiDecision: any | null = null,
  humanApproval: boolean | null = null,
  status: "success" | "failure" = "success"
): AuditLog {
  const log = DBService.createAuditLog({
    userId,
    userEmail,
    role,
    action,
    previousState,
    newState,
    ipAddress,
    userAgent,
    aiDecision,
    humanApproval,
    status,
  });
  return log;
}
