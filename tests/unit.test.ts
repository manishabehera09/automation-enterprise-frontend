import { describe, it, expect } from "vitest";

// --- Mock helper check functions representing backend algorithms to test ---

// 1. CAPTCHA Verification Logic
function checkCaptcha(storedExpression: string, userSolution: string): boolean {
  if (!storedExpression || !userSolution) return false;
  // Clean user spacing and convert '*' to '×'
  const cleanedUser = userSolution.replace(/\s+/g, "").replace(/\*/g, "×");
  return storedExpression === cleanedUser;
}

// 2. Risk Classification Logic
function evaluateRisk(params: {
  name: string;
  govIdNumber: string;
  purpose: string;
  blacklist: { name: string; idNumber?: string }[];
}): "low" | "medium" | "high" {
  const normName = params.name.trim().toLowerCase();
  const normDocId = params.govIdNumber.replace(/[\s-]/g, "").toLowerCase();

  const matchedBanned = params.blacklist.find(b => {
    if (b.name.toLowerCase() === normName) return true;
    if (b.idNumber && b.idNumber.replace(/[\s-]/g, "").toLowerCase() === normDocId) return true;
    return false;
  });

  if (matchedBanned) return "high";

  const highRiskKeywords = ["server room", "datacenter", "mainframe", "vault"];
  const containsHighRisk = highRiskKeywords.some(kw => params.purpose.toLowerCase().includes(kw));
  if (containsHighRisk) return "medium";

  return "low";
}

// 3. Approval recommendation logic
function evaluateRecommendation(
  verified: boolean,
  risk: "low" | "medium" | "high"
): "approve" | "reject" | "escalate" {
  if (!verified) return "reject";
  if (risk === "high") return "reject";
  if (risk === "medium") return "escalate";
  return "approve";
}

// --- Unit Tests ---

describe("SecureGate AI Core Algorithms Tests", () => {
  
  describe("CAPTCHA Verification", () => {
    it("should pass exact matches", () => {
      expect(checkCaptcha("12+6", "12+6")).toBe(true);
      expect(checkCaptcha("8×3", "8×3")).toBe(true);
    });

    it("should strip user inputs spacing before matching", () => {
      expect(checkCaptcha("14-5", "14 - 5")).toBe(true);
      expect(checkCaptcha("12+6", " 12 + 6 ")).toBe(true);
    });

    it("should fail mathematical evaluations (user typed result instead of formula)", () => {
      expect(checkCaptcha("12+6", "18")).toBe(false);
      expect(checkCaptcha("8×3", "24")).toBe(false);
    });
  });

  describe("Risk Assessment Classification", () => {
    const mockBlacklist = [
      { name: "Malicious Hacker", idNumber: "9999-8888-7777" },
      { name: "Restricted Spammer" }
    ];

    it("should classify standard check-ins as Low risk", () => {
      const risk = evaluateRisk({
        name: "John Doe",
        govIdNumber: "1111-2222-3333",
        purpose: "General business collaboration discussion",
        blacklist: mockBlacklist
      });
      expect(risk).toBe("low");
    });

    it("should classify blacklist matches as High risk", () => {
      const risk = evaluateRisk({
        name: "Malicious Hacker",
        govIdNumber: "5555-4444-3333",
        purpose: "General visit",
        blacklist: mockBlacklist
      });
      expect(risk).toBe("high");
    });

    it("should classify sensitive location requests as Medium risk", () => {
      const risk = evaluateRisk({
        name: "Alice Smith",
        govIdNumber: "2222-3333-4444",
        purpose: "Deploying mainframe in Server Room",
        blacklist: mockBlacklist
      });
      expect(risk).toBe("medium");
    });
  });

  describe("Approval Recommendation Logic", () => {
    it("should recommend rejection for unverified documents", () => {
      expect(evaluateRecommendation(false, "low")).toBe("reject");
    });

    it("should recommend rejection for high-risk flags", () => {
      expect(evaluateRecommendation(true, "high")).toBe("reject");
    });

    it("should recommend escalation for medium-risk access requests", () => {
      expect(evaluateRecommendation(true, "medium")).toBe("escalate");
    });

    it("should recommend approval for verified low-risk visitor bookings", () => {
      expect(evaluateRecommendation(true, "low")).toBe("approve");
    });
  });

});
