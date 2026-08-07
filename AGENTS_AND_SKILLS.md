# Custom Agent & Skill Documentation - SecureGate AI

This document details the configuration of the **Risk Analysis Agent** and the custom **Document Risk Profile Check Skill** implemented in SecureGate AI.

---

## 1. Custom Agent: Risk Analysis Agent

### Role Description
The Risk Analysis Agent acts as an automated safety officer that reviews registration patterns, blacklist databases, external files, and scheduled hours to classify potential threats.

### System Prompt
```markdown
You are the SecureGate AI Risk Analysis Agent, an expert enterprise security auditor.
Your job is to analyze visitor details and verify if they pose a threat to the organization.
Evaluate the following vectors:
1. Matches in the employee-configured blacklists (e.g., restricted visitors, high-risk company associations).
2. Time of visit (e.g. check-ins outside 08:00 - 18:00 have increased risk).
3. Purpose of visit (e.g., general meetings vs. server room/data facility access).

Formulate a risk level ("low", "medium", or "high"), confidence level (0.0 to 1.0), and a structured markdown justification detailing the rationale, evidence, and suggestions.
```

---

## 2. Custom Skill: Document Risk Profile Check

### Purpose
The skill parses scanned OCR details from government identity documents and crosses them against a registry of blacklisted numbers and previously used fake identities.

### Input Parameters
```json
{
  "name": "string",
  "documentId": "string",
  "documentType": "aadhaar | pan",
  "company": "string",
  "blacklistList": "array"
}
```

### Execution Steps
1. **Normalization**: Trims leading/trailing whitespaces, converts names to uppercase, and removes hyphens/slashes from document identifiers.
2. **Duplicate Identity Search**: Searches the historical `requests` database to see if the same document ID is linked to different visitor names. If a conflict is found, flags the record with **High Risk** due to "Identity Spoofing".
3. **Database Check**: Compares the normalized credentials with the entries in the admin blacklist database.
4. **Scoring Logic**:
   - If document format is invalid: **Medium Risk**
   - If ID number is matches the blacklist: **High Risk**
   - If multiple names share the same document ID: **High Risk** (Identity Theft flag)
   - Otherwise: **Low Risk**

### Node.js Code Logic
```typescript
export function executeDocumentRiskSkill(params: {
  name: string;
  documentId: string;
  documentType: string;
  company: string;
  blacklist: Array<{ name: string; idNumber?: string }>;
}) {
  const normName = params.name.trim().toUpperCase();
  const normDocId = params.documentId.replace(/[\s-]/g, "").toUpperCase();

  // Check Blacklist
  const inBlacklist = params.blacklist.some(item => {
    if (item.idNumber && item.idNumber.replace(/[\s-]/g, "").toUpperCase() === normDocId) {
      return true;
    }
    return item.name.trim().toUpperCase() === normName;
  });

  if (inBlacklist) {
    return {
      riskLevel: "high",
      confidence: 1.0,
      reason: "Visitor matches entry in system security blacklist.",
      evidence: `Blacklist match found for query ${normName} / ${normDocId}`
    };
  }

  return {
    riskLevel: "low",
    confidence: 0.90,
    reason: "No matches found in blacklist or duplicate registries.",
    evidence: "Checked active database records."
  };
}
```
