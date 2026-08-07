import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { DBService, VisitorRequest, AuditLog } from "../services/db";
import {
  runDocumentVerificationAgent,
  runApprovalRecommendationAgent,
  runSchedulingAgent,
  runNotificationAgent,
  runAuditAgent,
  getDemoNotifications,
  clearDemoNotifications
} from "../services/agents";
import { callFlaskRiskAnalysis } from "../services/mlBridge";

const JWT_SECRET = process.env.JWT_SECRET || "super_secure_jwt_secret_key_12345";

// JWT authentication middleware helper (internal verification)
export const authenticateToken = (req: any, res: Response, next: any) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ error: "Access token missing." });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: "Invalid or expired session token." });
    req.user = user;
    next();
  });
};

// --- Create Visit Booking (AI Workflow Trigger) ---
export const createBooking = async (req: any, res: Response) => {
  const {
    visitorId,
    visitorName,
    visitorEmail,
    visitorMobile,
    company,
    photoUrl,
    govIdUrl,
    govIdType,
    govIdNumber,
    employeeId,
    purpose,
    scheduledTime,
    durationMinutes
  } = req.body;

  const ip = req.ip || "127.0.0.1";
  const userAgent = req.headers["user-agent"] || "Unknown";

  if (!visitorId || !employeeId || !scheduledTime || !purpose) {
    return res.status(400).json({ error: "Missing required booking details." });
  }

  // Look up employee
  const hostEmployee = DBService.getUserById(employeeId);
  if (!hostEmployee || hostEmployee.role !== "employee") {
    return res.status(400).json({ error: "Valid host employee is required." });
  }

  try {
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

    // 1. Trigger Agent 1: OCR Document Verification
    const ocrResult = await runDocumentVerificationAgent(visitorName, govIdUrl, govIdType);

    // 2. Trigger Agent 2: Risk Analysis (via Flask ML bridge with fallback)
    const riskResult = await callFlaskRiskAnalysis({ visitorName, company, govIdNumber, purpose });

    // 3. Trigger Agent 3: Approval Recommendation
    const recommendResult = await runApprovalRecommendationAgent(
      ocrResult.documentVerified,
      riskResult.riskScore,
      hostEmployee.details?.department || "General"
    );

    // 4. Trigger Agent 4: Scheduling & Conflict Check
    const scheduleResult = await runSchedulingAgent(employeeId, scheduledTime, Number(durationMinutes || 60));

    // Determine initial status based on recommendations
    let initialStatus: VisitorRequest["status"] = "pending_approval";
    if (recommendResult.recommendation === "reject") {
      initialStatus = "rejected";
    }

    const newRequest: VisitorRequest = {
      id: requestId,
      visitorId,
      visitorName,
      visitorEmail,
      visitorMobile,
      company,
      photoUrl: photoUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200",
      govIdUrl: govIdUrl || "https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?auto=format&fit=crop&q=80&w=400",
      status: initialStatus,
      meetingDetails: {
        employeeId,
        employeeName: hostEmployee.name,
        department: hostEmployee.details?.department || "General",
        purpose,
        scheduledTime,
        durationMinutes: Number(durationMinutes || 60),
        roomAllocation: scheduleResult.roomAllocated,
      },
      ocrData: {
        extractedName: ocrResult.extractedName,
        extractedId: ocrResult.extractedId,
        confidence: ocrResult.confidence,
        documentVerified: ocrResult.documentVerified,
      },
      aiAnalysis: {
        riskScore: riskResult.riskScore,
        riskReasoning: riskResult.riskReasoning,
        recommendation: recommendResult.recommendation,
        confidenceScore: recommendResult.confidenceScore,
        timestamp: new Date().toISOString(),
      },
      approvals: {
        employeeApproved: null,
        employeeNotes: "",
        executiveApproved: null,
        adminApproved: null,
      },
      createdAt: new Date().toISOString()
    };

    // If there is a scheduling conflict, notify immediately in logs
    if (scheduleResult.conflictDetected) {
      newRequest.meetingDetails.purpose += " [SCHEDULE CONFLICT DETECTED]";
    }

    DBService.createRequest(newRequest);

    // 5. Trigger Agent 5: Notifications
    await runNotificationAgent(
      requestId,
      hostEmployee.email,
      "New Visitor Booking Request",
      `Visitor ${visitorName} from ${company} has booked a visit with you scheduled for ${new Date(scheduledTime).toLocaleString()}. AI Recommendation: ${recommendResult.recommendation.toUpperCase()}`,
      ["email", "push"]
    );

    // 6. Trigger Agent 6: Audit Logging
    runAuditAgent(
      visitorId,
      visitorEmail,
      "visitor",
      "VISIT_BOOKING_CREATED",
      null,
      newRequest,
      ip,
      userAgent,
      newRequest.aiAnalysis,
      null,
      "success"
    );

    return res.status(201).json({
      success: true,
      message: "Visit booked successfully and AI verification complete.",
      request: newRequest,
      scheduling: scheduleResult
    });
  } catch (error: any) {
    console.error("Booking error:", error);
    return res.status(500).json({ error: "Failed to process booking." });
  }
};

// --- Update Request Approval Status (Human in the Loop) ---
export const updateApprovalStatus = async (req: any, res: Response) => {
  const { requestId, approved, notes, role } = req.body;
  const ip = req.ip || "127.0.0.1";
  const userAgent = req.headers["user-agent"] || "Unknown";

  if (!requestId || approved === undefined || !role) {
    return res.status(400).json({ error: "Missing parameter fields." });
  }

  const existingRequest = DBService.getRequestById(requestId);
  if (!existingRequest) {
    return res.status(404).json({ error: "Request not found." });
  }

  const oldStatus = existingRequest.status;
  let newStatus = oldStatus;
  const approvals = { ...existingRequest.approvals };

  // Apply approval logic per role
  if (role === "employee") {
    approvals.employeeApproved = approved;
    approvals.employeeNotes = notes || "";
    
    if (!approved) {
      newStatus = "rejected";
    } else {
      // If AI recommends escalation or risk is Medium/High, route to Executive
      const aiRecommendation = existingRequest.aiAnalysis?.recommendation;
      const riskScore = existingRequest.aiAnalysis?.riskScore;

      if (aiRecommendation === "escalate" || riskScore === "high" || riskScore === "medium") {
        newStatus = "pending_approval"; // Remains pending, escalates flag
        // Log Escalation alert
        await runNotificationAgent(
          requestId,
          "exec@securegate.ai",
          "Escalated Priority Visitor Request",
          `Request for ${existingRequest.visitorName} requires executive override approval due to high risk rating.`,
          ["email", "push"]
        );
      } else {
        newStatus = "approved";
      }
    }
  } else if (role === "executive") {
    approvals.executiveApproved = approved;
    newStatus = approved ? "approved" : "rejected";
  } else if (role === "admin") {
    approvals.adminApproved = approved;
    newStatus = approved ? "approved" : "rejected";
  }

  // If status is approved, generate secure QR Token
  let qrToken = existingRequest.qrToken;
  if (newStatus === "approved" && oldStatus !== "approved") {
    qrToken = jwt.sign(
      {
        requestId: existingRequest.id,
        visitorId: existingRequest.visitorId,
        visitorName: existingRequest.visitorName,
        photoUrl: existingRequest.photoUrl,
        exp: Math.floor(new Date(existingRequest.meetingDetails.scheduledTime).getTime() / 1000) + 24 * 60 * 60 // 24hr validity
      },
      JWT_SECRET
    );

    // Notify Visitor
    await runNotificationAgent(
      requestId,
      existingRequest.visitorEmail,
      "Visit Approved - Access QR Generated",
      `Hi ${existingRequest.visitorName}, your visit has been approved! Open your dashboard to view/download your QR Access Pass.`,
      ["email", "sms", "whatsapp", "push"]
    );
  }

  const updatedRequest = DBService.updateRequest(requestId, {
    status: newStatus,
    approvals,
    qrToken
  });

  // Log to audit log
  runAuditAgent(
    req.user.uid,
    req.user.email,
    req.user.role,
    approved ? "VISIT_REQUEST_APPROVED" : "VISIT_REQUEST_REJECTED",
    { status: oldStatus },
    { status: newStatus },
    ip,
    userAgent,
    existingRequest.aiAnalysis,
    approved
  );

  return res.json({
    success: true,
    message: `Request status updated to ${newStatus}.`,
    request: updatedRequest
  });
};

// --- Security Gate Check-In & Check-Out ---
export const gateCheckIn = async (req: any, res: Response) => {
  const { qrToken } = req.body;
  const ip = req.ip || "127.0.0.1";
  const userAgent = req.headers["user-agent"] || "Unknown";

  if (!qrToken) return res.status(400).json({ error: "QR Token is required." });

  try {
    const decoded = jwt.verify(qrToken, JWT_SECRET) as any;
    const request = DBService.getRequestById(decoded.requestId);
    
    if (!request) return res.status(404).json({ error: "Visitor request record not found." });
    if (request.status !== "approved") return res.status(400).json({ error: "QR code is not in approved status." });

    const updated = DBService.updateRequest(request.id, {
      status: "checked_in",
      checkInTime: new Date().toISOString()
    });

    runAuditAgent(
      req.user.uid,
      req.user.email,
      req.user.role,
      "SECURITY_VISITOR_CHECK_IN",
      { status: "approved" },
      { status: "checked_in" },
      ip,
      userAgent
    );

    return res.json({ success: true, message: "Visitor checked in successfully.", request: updated });
  } catch (e) {
    return res.status(400).json({ error: "Invalid, altered, or expired QR code." });
  }
};

export const gateCheckOut = async (req: any, res: Response) => {
  const { requestId } = req.body;
  const ip = req.ip || "127.0.0.1";
  const userAgent = req.headers["user-agent"] || "Unknown";

  if (!requestId) return res.status(400).json({ error: "Request ID is required." });

  const request = DBService.getRequestById(requestId);
  if (!request) return res.status(404).json({ error: "Request record not found." });

  const updated = DBService.updateRequest(request.id, {
    status: "checked_out",
    checkOutTime: new Date().toISOString()
  });

  runAuditAgent(
    req.user.uid,
    req.user.email,
    req.user.role,
    "SECURITY_VISITOR_CHECK_OUT",
    { status: "checked_in" },
    { status: "checked_out" },
    ip,
    userAgent
  );

  return res.json({ success: true, message: "Visitor checked out successfully.", request: updated });
};

// --- Emergency Trigger (Panic Lockout) ---
export const triggerEmergencyAlert = async (req: any, res: Response) => {
  const { level, description } = req.body; // level: 'medium' | 'critical'
  const ip = req.ip || "127.0.0.1";
  const userAgent = req.headers["user-agent"] || "Unknown";

  await runNotificationAgent(
    "emergency",
    "all-security@securegate.ai",
    `EMERGENCY ALERT: ${level.toUpperCase()}`,
    `Lockdown triggered: ${description}`,
    ["email", "push"]
  );

  runAuditAgent(
    req.user.uid,
    req.user.email,
    req.user.role,
    "EMERGENCY_LOCKDOWN_TRIGGERED",
    null,
    { level, description },
    ip,
    userAgent
  );

  return res.json({ success: true, message: "Emergency alert sent and incident logged." });
};

// --- Blacklist & Whitelist Operations ---
export const getSystemLists = (req: Request, res: Response) => {
  return res.json({
    blacklist: DBService.getBlacklist(),
    whitelist: DBService.getWhitelist()
  });
};

export const updateBlacklist = (req: any, res: Response) => {
  const { name, idNumber, action } = req.body; // action: 'add' | 'remove'
  if (action === "add") {
    DBService.addBlacklist({ name, idNumber });
  } else {
    DBService.removeBlacklist(name);
  }
  return res.json({ success: true, blacklist: DBService.getBlacklist() });
};

export const updateWhitelist = (req: any, res: Response) => {
  const { entry, action } = req.body; // action: 'add' | 'remove'
  if (action === "add") {
    DBService.addWhitelist(entry);
  } else {
    DBService.removeWhitelist(entry);
  }
  return res.json({ success: true, whitelist: DBService.getWhitelist() });
};

// --- Config Management ---
export const getSystemConfigRoute = (req: Request, res: Response) => {
  return res.json(DBService.getConfig());
};

export const updateSystemConfigRoute = (req: any, res: Response) => {
  const config = DBService.updateConfig(req.body);
  return res.json({ success: true, config });
};

// --- Analytics Feed (Feeds Charts) ---
export const getAnalytics = (req: Request, res: Response) => {
  const requests = DBService.getRequests();
  
  // 1. Counts
  const total = requests.length;
  const approved = requests.filter(r => r.status === "approved" || r.status === "checked_in" || r.status === "checked_out").length;
  const rejected = requests.filter(r => r.status === "rejected").length;
  const pending = requests.filter(r => r.status === "pending_approval" || r.status === "pending_verification").length;

  // 2. Risk Distribution
  const riskCounts = { low: 0, medium: 0, high: 0 };
  requests.forEach(r => {
    if (r.aiAnalysis?.riskScore) {
      riskCounts[r.aiAnalysis.riskScore]++;
    } else {
      riskCounts.low++; // default
    }
  });

  // 3. Visitor Traffic (by day of week - mock representation from dates)
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const traffic = [0, 0, 0, 0, 0, 0, 0];
  requests.forEach(r => {
    const d = new Date(r.createdAt).getDay();
    traffic[d]++;
  });

  // 4. Department Counts
  const departments: Record<string, number> = {};
  requests.forEach(r => {
    const dept = r.meetingDetails.department || "General";
    departments[dept] = (departments[dept] || 0) + 1;
  });

  return res.json({
    summary: { total, approved, rejected, pending },
    riskDistribution: riskCounts,
    weeklyTraffic: { labels: days, data: traffic },
    departmentDistribution: {
      labels: Object.keys(departments),
      data: Object.values(departments)
    }
  });
};

// --- Audit logs route ---
export const getAuditLogsRoute = (req: Request, res: Response) => {
  const { search, role, status } = req.query;
  let logs = DBService.getAuditLogs();

  if (search) {
    const q = (search as string).toLowerCase();
    logs = logs.filter(l => 
      l.userEmail.toLowerCase().includes(q) || 
      l.action.toLowerCase().includes(q) ||
      (l.userId && l.userId.toLowerCase().includes(q))
    );
  }

  if (role) {
    logs = logs.filter(l => l.role === role);
  }

  if (status) {
    logs = logs.filter(l => l.status === status);
  }

  return res.json(logs);
};

// --- Demo Notifications feed ---
export const getNotificationsRoute = (req: Request, res: Response) => {
  const notis = getDemoNotifications();
  // Option to clear after fetching to keep UI polling clean
  return res.json(notis);
};

export const clearNotificationsRoute = (req: Request, res: Response) => {
  clearDemoNotifications();
  return res.json({ success: true });
};

// --- Get Requests List (Helper for Dashboards) ---
export const getRequestsList = (req: Request, res: Response) => {
  return res.json(DBService.getRequests());
};

// --- Get Users List (Helper for Admin Management) ---
export const getUsersList = (req: Request, res: Response) => {
  return res.json(DBService.getUsers());
};

// --- Update User Role/Status (Admin Management) ---
export const updateUser = (req: any, res: Response) => {
  const { uid } = req.params;
  const { role, status } = req.body;
  const ip = req.ip || "127.0.0.1";
  const userAgent = req.headers["user-agent"] || "Unknown";

  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Only admins can modify users." });
  }

  const updates: any = {};
  if (role) updates.role = role;
  if (status) updates.status = status;

  try {
    const updated = DBService.updateUser(uid, updates);
    runAuditAgent(
      req.user.uid,
      req.user.email,
      req.user.role,
      "USER_UPDATED",
      null,
      { uid, role, status },
      ip,
      userAgent
    );
    return res.json({ success: true, user: updated });
  } catch (e: any) {
    return res.status(404).json({ error: e.message });
  }
};

// --- HR Tickets ---
export const createTicket = async (req: any, res: Response) => {
  const { type, message, requestId } = req.body;
  
  if (!type || !message || !requestId) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const request = DBService.getRequestById(requestId);
  if (!request) {
    return res.status(404).json({ error: "Visitor request not found" });
  }

  const ticket = DBService.createTicket({
    type,
    message,
    requestId,
    raisedBy: req.user.uid
  });

  return res.status(201).json({ success: true, ticket });
};

export const getTickets = (req: any, res: Response) => {
  let tickets = DBService.getTickets();

  // If not admin/executive, only return their own tickets
  if (req.user.role !== "admin" && req.user.role !== "executive") {
    tickets = tickets.filter(t => t.raisedBy === req.user.uid);
  }

  return res.json(tickets);
};

export const resolveTicket = (req: any, res: Response) => {
  const { id } = req.params;
  const { status } = req.body; // 'resolved' or 'closed'
  
  if (req.user.role !== "admin" && req.user.role !== "executive") {
    return res.status(403).json({ error: "Unauthorized to resolve tickets." });
  }

  try {
    const updated = DBService.updateTicket(id, {
      status,
      resolvedBy: req.user.uid
    });
    return res.json({ success: true, ticket: updated });
  } catch (e: any) {
    return res.status(404).json({ error: e.message });
  }
};

// --- Chatbot Controller ---
export const handleChatRequest = async (req: Request, res: Response) => {
  const { message, role, userId } = req.body;
  if (!message) return res.status(400).json({ error: "Message is required." });

  const query = message.toLowerCase();
  let responseText = "I am the SecureGate AI Assistant. How can I help you manage security, check-ins, or visitor details today?";

  try {
    const requests = DBService.getRequests();

    if (query.includes("summarize") || query.includes("summary")) {
      // e.g. "summarize visitor John"
      const match = requests.find(r => 
        query.includes(r.visitorName.toLowerCase()) || 
        query.includes(r.id.toLowerCase())
      );
      if (match) {
        responseText = `### Visitor Summary: ${match.visitorName}\n` +
          `- **Company**: ${match.company}\n` +
          `- **Appointment**: ${new Date(match.meetingDetails.scheduledTime).toLocaleString()}\n` +
          `- **Host Employee**: ${match.meetingDetails.employeeName} (${match.meetingDetails.department})\n` +
          `- **Status**: **${match.status.toUpperCase()}**\n` +
          `- **AI Risk Score**: **${match.aiAnalysis?.riskScore.toUpperCase()}** (${match.aiAnalysis?.riskReasoning})`;
      } else {
        responseText = "I couldn't find a matching visitor in the active request logs to summarize. Please specify a name or request ID.";
      }
    } else if (query.includes("history") || query.includes("log") || query.includes("list")) {
      const historySummary = requests.slice(0, 5).map(r => 
        `- **${r.visitorName}** (${r.company}) | Host: ${r.meetingDetails.employeeName} | Status: ${r.status}`
      ).join("\n");
      responseText = `### Recent Visitor Requests:\n${historySummary || "No requests found."}`;
    } else if (query.includes("explain") || query.includes("why")) {
      const match = requests.find(r => 
        query.includes(r.visitorName.toLowerCase()) || 
        query.includes(r.id.toLowerCase())
      );
      if (match && match.aiAnalysis) {
        responseText = `### AI Decision Explanation for ${match.visitorName}:\n` +
          `- **Decision Recommendation**: ${match.aiAnalysis.recommendation.toUpperCase()}\n` +
          `- **Confidence Score**: ${Math.round(match.aiAnalysis.confidenceScore * 100)}%\n` +
          `- **Risk Classification**: ${match.aiAnalysis.riskScore.toUpperCase()}\n` +
          `- **Reasoning**: ${match.aiAnalysis.riskReasoning}`;
      } else {
        responseText = "Could not find a matching visitor request to explain the AI decisions. Please provide the visitor's name.";
      }
    } else {
      // General safety instructions
      responseText = `Hello! As a SecureGate AI Assistant, I can help you:
1. **Summarize visitor profiles** (e.g. "summarize John Visitor")
2. **Review booking history** (e.g. "show visitor history")
3. **Explain AI decisions** (e.g. "explain decision for John")
4. **Guide portal operations** for Visitors, Employees, and Security Guards.

Let me know how I can assist!`;
    }

    return res.json({ response: responseText });
  } catch (e) {
    return res.status(500).json({ error: "Failed to process chat conversation." });
  }
};
