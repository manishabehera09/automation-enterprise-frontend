import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

// Database filepath for offline mode
const DB_FILE = path.join(__dirname, "../../../db.json");

export interface User {
  uid: string;
  name: string;
  email: string;
  mobile: string;
  role: "visitor" | "employee" | "executive" | "admin";
  passwordHash: string;
  status: "active" | "locked" | "blacklisted";
  failedAttempts: number;
  details?: {
    company?: string;
    govIdType?: string;
    govIdNumber?: string;
    vehicleNumber?: string;
    laptopDetails?: string;
    employeeId?: string;
    department?: string;
    designation?: string;
    photoUrl?: string;
    govIdUrl?: string;
  };
  createdAt: string;
}

export interface VisitorRequest {
  id: string;
  visitorId: string;
  visitorName: string;
  visitorEmail: string;
  visitorMobile: string;
  company: string;
  photoUrl: string;
  govIdUrl: string;
  ocrData?: {
    extractedName: string;
    extractedId: string;
    confidence: number;
    documentVerified: boolean;
  };
  meetingDetails: {
    employeeId: string;
    employeeName: string;
    department: string;
    purpose: string;
    scheduledTime: string;
    durationMinutes: number;
    roomAllocation: string;
  };
  aiAnalysis?: {
    riskScore: "low" | "medium" | "high";
    riskReasoning: string;
    recommendation: "approve" | "reject" | "escalate";
    confidenceScore: number;
    timestamp: string;
  };
  status: "pending_verification" | "pending_approval" | "approved" | "rejected" | "checked_in" | "checked_out";
  approvals: {
    employeeApproved: boolean | null;
    employeeNotes: string;
    executiveApproved: boolean | null;
    adminApproved: boolean | null;
  };
  qrToken?: string;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userEmail: string;
  role: string;
  action: string;
  previousState: any | null;
  newState: any | null;
  ipAddress: string;
  userAgent: string;
  aiDecision: any | null;
  humanApproval: boolean | null;
  status: "success" | "failure";
}

export interface SystemConfig {
  riskThreshold: number;
  autoEscalateHighRisk: boolean;
  mfaEnabled: boolean;
  sessionTimeoutMs: number;
}

export interface Ticket {
  id: string;
  type: "info_request" | "reschedule" | "flag_visitor" | "escalate";
  message: string;
  requestId: string;
  raisedBy: string;
  status: "open" | "resolved" | "closed";
  resolvedBy?: string;
  createdAt: string;
  updatedAt: string;
}

interface DBStructure {
  users: User[];
  requests: VisitorRequest[];
  auditLogs: AuditLog[];
  config: SystemConfig;
  blacklist: { name: string; idNumber?: string }[];
  whitelist: string[]; // Whitelisted emails or names
  tickets: Ticket[];
}

// Default DB seed
const initialConfig: SystemConfig = {
  riskThreshold: 0.65,
  autoEscalateHighRisk: true,
  mfaEnabled: true,
  sessionTimeoutMs: 900000,
};

function seedDatabase(): DBStructure {
  const salt = bcrypt.genSaltSync(10);
  const data: DBStructure = {
    users: [
      {
        uid: "admin-uid",
        name: "Enterprise Admin",
        email: "admin@securegate.ai",
        mobile: "+15550100",
        role: "admin",
        passwordHash: bcrypt.hashSync("Admin@12345", salt),
        status: "active",
        failedAttempts: 0,
        details: {
          employeeId: "ADM-909",
          department: "IT Security",
          designation: "Chief Security Officer",
        },
        createdAt: new Date().toISOString(),
      },
      {
        uid: "exec-uid",
        name: "Senior Executive Director",
        email: "exec@securegate.ai",
        mobile: "+15550200",
        role: "executive",
        passwordHash: bcrypt.hashSync("Exec@12345", salt),
        status: "active",
        failedAttempts: 0,
        details: {
          employeeId: "EXE-101",
          department: "Executive Board",
          designation: "Managing Director",
        },
        createdAt: new Date().toISOString(),
      },
      {
        uid: "employee-uid",
        name: "Jane Host Employee",
        email: "employee@securegate.ai",
        mobile: "+15550300",
        role: "employee",
        passwordHash: bcrypt.hashSync("Employee@12345", salt),
        status: "active",
        failedAttempts: 0,
        details: {
          employeeId: "EMP-404",
          department: "Research & Development",
          designation: "Lead Project Engineer",
        },
        createdAt: new Date().toISOString(),
      },
      {
        uid: "visitor-uid",
        name: "John Visitor",
        email: "visitor@securegate.ai",
        mobile: "+15550400",
        role: "visitor",
        passwordHash: bcrypt.hashSync("Visitor@12345", salt),
        status: "active",
        failedAttempts: 0,
        details: {
          company: "Partner Corp",
          govIdType: "aadhaar",
          govIdNumber: "1111-2222-3333",
        },
        createdAt: new Date().toISOString(),
      },
    ],
    requests: [],
    auditLogs: [],
    config: initialConfig,
    blacklist: [
      { name: "Malicious Hacker", idNumber: "9999-8888-7777" },
      { name: "Banned Spammer" },
    ],
    whitelist: ["trusted-partner.com", "gov.in", "partner@securegate.ai"],
    tickets: [],
  };

  // Seed sample requests for dashboards to look beautiful immediately
  const sampleRequest: VisitorRequest = {
    id: "req-sample-1",
    visitorId: "visitor-uid",
    visitorName: "John Visitor",
    visitorEmail: "visitor@securegate.ai",
    visitorMobile: "+15550400",
    company: "Partner Corp",
    photoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
    govIdUrl: "https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?auto=format&fit=crop&q=80&w=400",
    status: "approved",
    meetingDetails: {
      employeeId: "employee-uid",
      employeeName: "Jane Host Employee",
      department: "Research & Development",
      purpose: "Project Collaboration Sprint Planning",
      scheduledTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
      durationMinutes: 60,
      roomAllocation: "Innovation Lab A",
    },
    ocrData: {
      extractedName: "JOHN VISITOR",
      extractedId: "1111-2222-3333",
      confidence: 0.97,
      documentVerified: true,
    },
    aiAnalysis: {
      riskScore: "low",
      riskReasoning: "OCR details verified perfectly. Visitor has a clean historical log with the company.",
      recommendation: "approve",
      confidenceScore: 0.94,
      timestamp: new Date().toISOString(),
    },
    approvals: {
      employeeApproved: true,
      employeeNotes: "Pre-approved for design alignment.",
      executiveApproved: null,
      adminApproved: null,
    },
    qrToken: "MOCK_QR_JWT_TOKEN_ABC123",
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  };

  data.requests.push(sampleRequest);

  // Add a sample audit log for this approval
  data.auditLogs.push({
    id: "log-sample-1",
    timestamp: new Date().toISOString(),
    userId: "employee-uid",
    userEmail: "employee@securegate.ai",
    role: "employee",
    action: "VISITOR_APPROVAL",
    previousState: { status: "pending_approval" },
    newState: { status: "approved" },
    ipAddress: "127.0.0.1",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    aiDecision: { recommendation: "approve", confidenceScore: 0.94 },
    humanApproval: true,
    status: "success",
  });

  return data;
}

export class DBService {
  private static load(): DBStructure {
    if (!fs.existsSync(DB_FILE)) {
      const freshData = seedDatabase();
      this.save(freshData);
      return freshData;
    }
    try {
      const raw = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(raw);
    } catch (e) {
      console.error("Error reading database file, reseeding...", e);
      const freshData = seedDatabase();
      this.save(freshData);
      return freshData;
    }
  }

  private static save(data: DBStructure) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  }

  // --- User Operations ---
  static getUsers(): User[] {
    return this.load().users;
  }

  static getUserByEmail(email: string): User | undefined {
    return this.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  static getUserById(uid: string): User | undefined {
    return this.getUsers().find(u => u.uid === uid);
  }

  static createUser(user: User): User {
    const db = this.load();
    db.users.push(user);
    this.save(db);
    return user;
  }

  static updateUser(uid: string, updates: Partial<User>): User {
    const db = this.load();
    const idx = db.users.findIndex(u => u.uid === uid);
    if (idx === -1) throw new Error("User not found");
    db.users[idx] = { ...db.users[idx], ...updates, details: { ...db.users[idx].details, ...updates.details } };
    this.save(db);
    return db.users[idx];
  }

  // --- Visitor Request Operations ---
  static getRequests(): VisitorRequest[] {
    return this.load().requests;
  }

  static getRequestById(id: string): VisitorRequest | undefined {
    return this.getRequests().find(r => r.id === id);
  }

  static createRequest(req: VisitorRequest): VisitorRequest {
    const db = this.load();
    db.requests.push(req);
    this.save(db);
    return req;
  }

  static updateRequest(id: string, updates: Partial<VisitorRequest>): VisitorRequest {
    const db = this.load();
    const idx = db.requests.findIndex(r => r.id === id);
    if (idx === -1) throw new Error("Request not found");
    
    // Deep merge a few levels for nested properties
    const existing = db.requests[idx];
    db.requests[idx] = {
      ...existing,
      ...updates,
      ocrData: updates.ocrData ? { ...existing.ocrData, ...updates.ocrData } : existing.ocrData,
      meetingDetails: updates.meetingDetails ? { ...existing.meetingDetails, ...updates.meetingDetails } : existing.meetingDetails,
      aiAnalysis: updates.aiAnalysis ? { ...existing.aiAnalysis, ...updates.aiAnalysis } : existing.aiAnalysis,
      approvals: updates.approvals ? { ...existing.approvals, ...updates.approvals } : existing.approvals,
    } as VisitorRequest;
    
    this.save(db);
    return db.requests[idx];
  }

  // --- Audit Log Operations ---
  static getAuditLogs(): AuditLog[] {
    return this.load().auditLogs;
  }

  static createAuditLog(log: Omit<AuditLog, "id" | "timestamp">): AuditLog {
    const db = this.load();
    const newLog: AuditLog = {
      ...log,
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString(),
    };
    db.auditLogs.unshift(newLog); // Prepend so latest shows first
    this.save(db);
    return newLog;
  }

  // --- System Configuration ---
  static getConfig(): SystemConfig {
    return this.load().config;
  }

  static updateConfig(updates: Partial<SystemConfig>): SystemConfig {
    const db = this.load();
    db.config = { ...db.config, ...updates };
    this.save(db);
    return db.config;
  }

  // --- Blacklist & Whitelist ---
  static getBlacklist(): { name: string; idNumber?: string }[] {
    return this.load().blacklist;
  }

  static addBlacklist(entry: { name: string; idNumber?: string }) {
    const db = this.load();
    db.blacklist.push(entry);
    this.save(db);
  }

  static removeBlacklist(name: string) {
    const db = this.load();
    db.blacklist = db.blacklist.filter(b => b.name !== name);
    this.save(db);
  }

  static getWhitelist(): string[] {
    return this.load().whitelist;
  }

  static addWhitelist(entry: string) {
    const db = this.load();
    db.whitelist.push(entry);
    this.save(db);
  }

  static removeWhitelist(entry: string) {
    const db = this.load();
    db.whitelist = db.whitelist.filter(w => w !== entry);
    this.save(db);
  }

  // --- Ticket Operations ---
  static getTickets(): Ticket[] {
    return this.load().tickets || [];
  }

  static getTicketById(id: string): Ticket | undefined {
    return this.getTickets().find(t => t.id === id);
  }

  static createTicket(ticket: Omit<Ticket, "id" | "createdAt" | "updatedAt" | "status">): Ticket {
    const db = this.load();
    if (!db.tickets) db.tickets = []; // Fallback if old db.json
    
    const newTicket: Ticket = {
      ...ticket,
      id: `tkt-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      status: "open",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.tickets.push(newTicket);
    this.save(db);
    return newTicket;
  }

  static updateTicket(id: string, updates: Partial<Ticket>): Ticket {
    const db = this.load();
    if (!db.tickets) db.tickets = [];
    
    const idx = db.tickets.findIndex(t => t.id === id);
    if (idx === -1) throw new Error("Ticket not found");
    
    db.tickets[idx] = {
      ...db.tickets[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    
    this.save(db);
    return db.tickets[idx];
  }
}
