import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// Load configurations
dotenv.config();

import {
  getCaptcha,
  sendOtp,
  verifyOtp,
  register,
  login,
  verifyLoginMfa,
  requestPasswordReset,
  completePasswordReset
} from "./controllers/auth";

import {
  authenticateToken,
  createBooking,
  updateApprovalStatus,
  gateCheckIn,
  gateCheckOut,
  triggerEmergencyAlert,
  getSystemLists,
  updateBlacklist,
  updateWhitelist,
  getSystemConfigRoute,
  updateSystemConfigRoute,
  getAnalytics,
  getAuditLogsRoute,
  getNotificationsRoute,
  clearNotificationsRoute,
  getRequestsList,
  getUsersList,
  updateUser,
  createTicket,
  getTickets,
  resolveTicket,
  handleChatRequest
} from "./controllers/portal";

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware configuration
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Public Auth Routes ---
app.get("/api/auth/captcha", getCaptcha);
app.post("/api/auth/send-otp", sendOtp);
app.post("/api/auth/verify-otp", verifyOtp);
app.post("/api/auth/register", register);
app.post("/api/auth/login", login);
app.post("/api/auth/verify-login-mfa", verifyLoginMfa);
app.post("/api/auth/request-password-reset", requestPasswordReset);
app.post("/api/auth/complete-password-reset", completePasswordReset);

// --- Demo Mode Notifications polling (Public) ---
app.get("/api/notifications", getNotificationsRoute);
app.post("/api/notifications/clear", clearNotificationsRoute);

// --- Authenticated Portal Routes ---
app.post("/api/portal/book-visit", authenticateToken, createBooking);
app.post("/api/portal/update-approval", authenticateToken, updateApprovalStatus);
app.post("/api/portal/gate-check-in", authenticateToken, gateCheckIn);
app.post("/api/portal/gate-check-out", authenticateToken, gateCheckOut);
app.post("/api/portal/emergency", authenticateToken, triggerEmergencyAlert);

app.get("/api/portal/system-lists", authenticateToken, getSystemLists);
app.post("/api/portal/blacklist", authenticateToken, updateBlacklist);
app.post("/api/portal/whitelist", authenticateToken, updateWhitelist);

app.get("/api/portal/config", authenticateToken, getSystemConfigRoute);
app.post("/api/portal/config", authenticateToken, updateSystemConfigRoute);

app.get("/api/portal/analytics", authenticateToken, getAnalytics);
app.get("/api/portal/audit-logs", authenticateToken, getAuditLogsRoute);
app.get("/api/portal/requests", authenticateToken, getRequestsList);
app.get("/api/portal/users", authenticateToken, getUsersList);
app.patch("/api/portal/users/:uid", authenticateToken, updateUser);

// HR Ticket System Routes
app.post("/api/portal/tickets", authenticateToken, createTicket);
app.get("/api/portal/tickets", authenticateToken, getTickets);
app.patch("/api/portal/tickets/:id/resolve", authenticateToken, resolveTicket);

// Chatbot Endpoint (can be called by authenticated users)
app.post("/api/portal/chat", handleChatRequest);

// Start Express Server
app.listen(PORT, () => {
  console.log(`================================================`);
  console.log(`🚀 SecureGate AI Server running on port ${PORT}`);
  console.log(`👉 Demo API ready: http://localhost:${PORT}`);
  console.log(`================================================`);
});
