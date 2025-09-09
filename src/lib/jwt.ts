import jwt from "jsonwebtoken";

export function issueJwt(
  user: { id: string; name?: string; email?: string },
  expiresInSec: number = 15 * 60
) {
  const secret = (process.env.JWT_SECRET || "abdulrhmanbalubaid123") .trim(); 
  return jwt.sign({ user }, secret, { algorithm: "HS256", expiresIn: expiresInSec });
}
