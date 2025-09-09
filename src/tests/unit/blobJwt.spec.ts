import { describe, it, expect } from "vitest";
import jwt from "jsonwebtoken";
import { issueJwt } from "../../lib/jwt.js";

describe("issueJwt unit", () => {
  it("signs a token that verifies", () => {
    const token = issueJwt({ id: "tester" }, 300);

    const secret = (process.env.JWT_SECRET || "abdulrhmanbalubaid123").trim();
    const decoded = jwt.verify(token, secret) as any;

    const user = decoded.user ?? decoded;
    expect(user.id).toBe("tester");
  });
});
