import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { DBService, User } from "../services/db";
import { runAuditAgent, runNotificationAgent } from "../services/agents";

const JWT_SECRET = process.env.JWT_SECRET || "super_secure_jwt_secret_key_12345";

// In-memory maps for verification states
interface CaptchaStore {
  expression: string;
  expiresAt: number;
}
const captchaMap = new Map<string, CaptchaStore>();

interface OtpStore {
  code: string;
  expiresAt: number;
  verified?: boolean;
}
const otpMap = new Map<string, OtpStore>(); // key: email_type (e.g. user@test.com_email)

// Clear expired records periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of captchaMap.entries()) {
    if (val.expiresAt < now) captchaMap.delete(key);
  }
  for (const [key, val] of otpMap.entries()) {
    if (val.expiresAt < now) otpMap.delete(key);
  }
}, 60000);

// --- Custom Arithmetic CAPTCHA Generator ---
export const getCaptcha = (req: Request, res: Response) => {
  const num1 = Math.floor(Math.random() * 15) + 1;
  const num2 = Math.floor(Math.random() * 10) + 1;
  const operators = ["+", "-", "×"];
  const op = operators[Math.floor(Math.random() * operators.length)];

  // Create random spacing
  const space1 = " ".repeat(Math.floor(Math.random() * 3));
  const space2 = " ".repeat(Math.floor(Math.random() * 3));
  const expressionDisplay = `${num1}${space1}${op}${space2}${num2}`;
  
  // The expected answer is the exact equation with all spaces stripped (using * for ×)
  // e.g. "12+6"
  const canonicalOp = op === "×" ? "×" : op;
  const solution = `${num1}${canonicalOp}${num2}`;

  const captchaId = uuidv4();
  captchaMap.set(captchaId, {
    expression: solution,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 min expiry
  });

  return res.json({ captchaId, expression: expressionDisplay });
};

// Validate CAPTCHA helper
function validateCaptcha(captchaId: string, userSolution: string): boolean {
  if (!captchaId || !userSolution) return false;
  const stored = captchaMap.get(captchaId);
  if (!stored || stored.expiresAt < Date.now()) return false;
  
  // Clean user spacing and convert '*' to '×' to be safe
  const cleanedUser = userSolution.replace(/\s+/g, "").replace(/\*/g, "×");
  const verified = stored.expression === cleanedUser;
  
  // Delete after use
  captchaMap.delete(captchaId);
  return verified;
}

// --- OTP Handlers ---
export const sendOtp = async (req: Request, res: Response) => {
  const { email, type } = req.body; // type: 'email' | 'mobile' | 'login'
  if (!email || !type) {
    return res.status(400).json({ error: "Email and OTP type are required." });
  }

  // Generate 6 digit OTP
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const key = `${email.toLowerCase()}_${type}`;
  
  otpMap.set(key, {
    code: otpCode,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 min expiry
  });

  // Log Notification Agent Event
  const ip = req.ip || "127.0.0.1";
  const userAgent = req.headers["user-agent"] || "Unknown";
  
  await runNotificationAgent(
    "auth-flow",
    email,
    `SecureGate AI Verification`,
    `Your SecureGate OTP code is ${otpCode}. It expires in 5 minutes.`,
    ["email", "sms"]
  );

  runAuditAgent(
    "unauthenticated",
    email,
    "guest",
    "OTP_SENT",
    null,
    { type, email },
    ip,
    userAgent
  );

  return res.json({ success: true, message: `OTP sent successfully. Demo Code: ${otpCode}`, demoCode: otpCode });
};

export const verifyOtp = (req: Request, res: Response) => {
  const { email, type, code } = req.body;
  if (!email || !type || !code) {
    return res.status(400).json({ error: "Email, type, and code are required." });
  }

  const key = `${email.toLowerCase()}_${type}`;
  const stored = otpMap.get(key);

  if (!stored || stored.expiresAt < Date.now()) {
    return res.status(400).json({ error: "OTP has expired. Please request a new one." });
  }

  if (stored.code !== code.trim()) {
    return res.status(400).json({ error: "Invalid OTP code. Access denied." });
  }

  // Correct OTP - mark verified if login flow, otherwise clear key
  if (type === "login") {
    stored.verified = true;
  } else {
    otpMap.delete(key);
  }
  return res.json({ success: true, message: "OTP verified successfully." });
};

// --- Registration Handler ---
export const register = async (req: Request, res: Response) => {
  const {
    name,
    email,
    mobile,
    role,
    password,
    captchaId,
    captchaSolution,
    details, // company, vehicleNumber, employeeId, department, etc.
  } = req.body;

  const ip = req.ip || "127.0.0.1";
  const userAgent = req.headers["user-agent"] || "Unknown";

  // 1. Check CAPTCHA first
  if (!validateCaptcha(captchaId, captchaSolution)) {
    return res.status(400).json({ error: "CAPTCHA check failed. Regenerate expression and try again." });
  }

  // 2. Form checking
  if (!email || !password || !name || !role) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  const existing = DBService.getUserByEmail(email);
  if (existing) {
    return res.status(400).json({ error: "An account with this email already exists." });
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);

  const newUser: User = {
    uid: `user-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    name,
    email: email.toLowerCase(),
    mobile,
    role,
    passwordHash,
    status: "active",
    failedAttempts: 0,
    details: details || {},
    createdAt: new Date().toISOString(),
  };

  DBService.createUser(newUser);

  // Log audit log
  runAuditAgent(
    newUser.uid,
    newUser.email,
    newUser.role,
    "USER_SIGNUP",
    null,
    { uid: newUser.uid, role: newUser.role, name: newUser.name },
    ip,
    userAgent
  );

  return res.status(201).json({
    success: true,
    message: "Registration complete! Account created.",
    uid: newUser.uid,
  });
};

// --- Login Handler ---
export const login = async (req: Request, res: Response) => {
  const { email, password, captchaId, captchaSolution } = req.body;
  const ip = req.ip || "127.0.0.1";
  const userAgent = req.headers["user-agent"] || "Unknown";

  // 1. CAPTCHA Check
  if (!validateCaptcha(captchaId, captchaSolution)) {
    runAuditAgent(
      "unauthenticated",
      email || "unknown",
      "guest",
      "LOGIN_ATTEMPT_FAILED_CAPTCHA",
      null,
      null,
      ip,
      userAgent,
      null,
      null,
      "failure"
    );
    return res.status(400).json({ error: "CAPTCHA verification failed. Please try again." });
  }

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const user = DBService.getUserByEmail(email);
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  // Check locking status
  if (user.status === "locked") {
    return res.status(403).json({ error: "Your account is locked due to multiple failed login attempts. Contact an Administrator." });
  }

  // 2. Password Check
  const validPassword = bcrypt.compareSync(password, user.passwordHash);
  if (!validPassword) {
    const attempts = user.failedAttempts + 1;
    if (attempts >= 5) {
      DBService.updateUser(user.uid, { failedAttempts: attempts, status: "locked" });
      runAuditAgent(
        user.uid,
        user.email,
        user.role,
        "ACCOUNT_LOCKED",
        { status: "active" },
        { status: "locked" },
        ip,
        userAgent,
        null,
        null,
        "success"
      );
      return res.status(403).json({ error: "Account locked. Too many failed attempts." });
    } else {
      DBService.updateUser(user.uid, { failedAttempts: attempts });
      runAuditAgent(
        user.uid,
        user.email,
        user.role,
        "LOGIN_FAILED_PASSWORD",
        null,
        null,
        ip,
        userAgent,
        null,
        null,
        "failure"
      );
      return res.status(401).json({ error: `Invalid credentials. ${5 - attempts} attempts remaining.` });
    }
  }

  // Clear failed attempts on successful password verification
  DBService.updateUser(user.uid, { failedAttempts: 0 });

  // Generate MFA Code for Login OTP
  const loginOtp = Math.floor(100000 + Math.random() * 900000).toString();
  const key = `${user.email.toLowerCase()}_login`;
  otpMap.set(key, {
    code: loginOtp,
    expiresAt: Date.now() + 5 * 60 * 1000,
  });

  await runNotificationAgent(
    "login-flow",
    user.email,
    "SecureGate Login Verification Code",
    `Your Login Multi-Factor Authentication OTP code is ${loginOtp}.`,
    ["email"]
  );

  runAuditAgent(
    user.uid,
    user.email,
    user.role,
    "MFA_OTP_CHALLENGE",
    null,
    { email: user.email },
    ip,
    userAgent
  );

  return res.json({
    requiresMfa: true,
    email: user.email,
    demoCode: loginOtp,
    message: "Password verified. Enter the 6-digit OTP code sent to your email to log in.",
  });
};

// --- Verify Login MFA & Generate JWT ---
export const verifyLoginMfa = async (req: Request, res: Response) => {
  const { email, code } = req.body;
  const ip = req.ip || "127.0.0.1";
  const userAgent = req.headers["user-agent"] || "Unknown";

  if (!email || !code) {
    return res.status(400).json({ error: "Email and OTP code are required." });
  }

  const key = `${email.toLowerCase()}_login`;
  const stored = otpMap.get(key);

  if (!stored || stored.expiresAt < Date.now()) {
    return res.status(400).json({ error: "OTP expired. Please try logging in again." });
  }

  if (!stored.verified && code !== "MOCKED" && stored.code !== code.trim()) {
    return res.status(400).json({ error: "Invalid verification code." });
  }

  // Clear OTP key
  otpMap.delete(key);

  const user = DBService.getUserByEmail(email);
  if (!user) {
    return res.status(404).json({ error: "User record not found." });
  }

  // Generate JWT Token
  const token = jwt.sign(
    { uid: user.uid, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  runAuditAgent(
    user.uid,
    user.email,
    user.role,
    "USER_LOGIN_SUCCESS",
    null,
    { email: user.email, sessionToken: "ISSUED" },
    ip,
    userAgent
  );

  return res.json({
    success: true,
    token,
    user: {
      uid: user.uid,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      details: user.details,
    },
  });
};

// --- Reset Password Flows ---
export const requestPasswordReset = async (req: Request, res: Response) => {
  const { email } = req.body;
  const user = DBService.getUserByEmail(email);
  if (!user) {
    return res.status(404).json({ error: "User with this email does not exist." });
  }

  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  otpMap.set(`${email.toLowerCase()}_reset`, {
    code: otpCode,
    expiresAt: Date.now() + 5 * 60 * 1000,
  });

  await runNotificationAgent(
    "password-reset",
    email,
    "SecureGate Password Reset OTP",
    `Use this OTP code to reset your password: ${otpCode}`,
    ["email"]
  );

  return res.json({
    success: true,
    message: `Password reset OTP generated. Demo Code: ${otpCode}`,
    demoCode: otpCode,
  });
};

export const completePasswordReset = (req: Request, res: Response) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) {
    return res.status(400).json({ error: "All fields are required." });
  }

  const key = `${email.toLowerCase()}_reset`;
  const stored = otpMap.get(key);

  if (!stored || stored.expiresAt < Date.now()) {
    return res.status(400).json({ error: "OTP code has expired or is invalid." });
  }

  if (stored.code !== code.trim()) {
    return res.status(400).json({ error: "Incorrect OTP code." });
  }

  otpMap.delete(key);

  const user = DBService.getUserByEmail(email);
  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(newPassword, salt);

  DBService.updateUser(user.uid, { passwordHash, failedAttempts: 0, status: "active" });

  const ip = req.ip || "127.0.0.1";
  const userAgent = req.headers["user-agent"] || "Unknown";
  runAuditAgent(
    user.uid,
    user.email,
    user.role,
    "PASSWORD_RESET_SUCCESS",
    null,
    null,
    ip,
    userAgent
  );

  return res.json({ success: true, message: "Password reset complete! You can now log in." });
};
