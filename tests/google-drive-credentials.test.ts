import { describe, expect, it } from "vitest";

describe("Google Drive configuration", () => {
  it("accepts a Google OAuth client id when configured", async () => {
    const clientId = process.env.EXPO_PUBLIC_GOOGLE_DRIVE_CLIENT_ID;
    if (!clientId) return;
    expect(clientId).toMatch(/\.apps\.googleusercontent\.com$/);
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?client_id=${encodeURIComponent(clientId)}`);
    expect([200, 400]).toContain(response.status);
  });
});
