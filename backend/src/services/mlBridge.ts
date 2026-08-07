/**
 * mlBridge.ts — Flask ML API Proxy with Fallback
 * 
 * This module provides a bridge to the team's Flask ML API.
 * If Flask is unavailable (timeout / network error), it transparently
 * falls back to the existing rule-based risk analysis agent.
 */

import http from "http";
import { runRiskAnalysisAgent } from "./agents";

const FLASK_ML_URL = process.env.FLASK_ML_URL || "http://localhost:8000";
const FLASK_TIMEOUT_MS = 5000; // 5 second timeout before fallback

export interface MLRiskResult {
  riskScore: "low" | "medium" | "high";
  riskReasoning: string;
  evidenceUsed: string;
  confidenceScore: number;
  source: "flask_ml" | "rule_based_fallback";
}

/**
 * Posts a JSON body to the Flask ML API and returns parsed JSON.
 * Rejects on timeout or non-2xx response.
 */
function postToFlask(payload: object): Promise<any> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const url = new URL("/api/ml/analyze", FLASK_ML_URL);

    const options: http.RequestOptions = {
      hostname: url.hostname,
      port: Number(url.port) || 80,
      path: url.pathname,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error("Invalid JSON from Flask API"));
          }
        } else {
          reject(new Error(`Flask API returned status ${res.statusCode}`));
        }
      });
    });

    req.setTimeout(FLASK_TIMEOUT_MS, () => {
      req.destroy();
      reject(new Error("Flask API request timed out"));
    });

    req.on("error", (err) => reject(err));
    req.write(body);
    req.end();
  });
}

/**
 * Main entrypoint: calls the Flask ML API, falls back to rule-based agents.
 * Always returns the same shape regardless of which path was taken.
 */
export async function callFlaskRiskAnalysis(params: {
  visitorName: string;
  company: string;
  govIdNumber: string;
  purpose: string;
}): Promise<MLRiskResult> {
  // Try Flask ML first if env variable is explicitly set
  if (process.env.FLASK_ML_URL) {
    try {
      const mlResponse = await postToFlask(params);
      console.log(`[ML Bridge] Flask API responded: ${mlResponse.riskScore} risk`);

      return {
        riskScore: mlResponse.riskScore || "low",
        riskReasoning: mlResponse.reasoning || mlResponse.riskReasoning || "ML model analysis completed.",
        evidenceUsed: mlResponse.evidenceUsed || `Flask ML model — confidence: ${mlResponse.confidence || 0.9}`,
        confidenceScore: mlResponse.confidence || mlResponse.confidenceScore || 0.9,
        source: "flask_ml",
      };
    } catch (err: any) {
      console.warn(`[ML Bridge] Flask API unavailable (${err.message}), using rule-based fallback.`);
    }
  }

  // Fallback: use the deterministic rule-based agent
  const fallbackResult = await runRiskAnalysisAgent(
    params.visitorName,
    params.company,
    params.govIdNumber,
    params.purpose
  );

  return {
    ...fallbackResult,
    source: "rule_based_fallback",
  };
}
