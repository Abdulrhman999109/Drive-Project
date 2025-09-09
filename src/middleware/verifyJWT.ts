import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = (process.env.JWT_SECRET || "dev-secret-change-me").trim();

export default function verifyJWT(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const token = auth.slice(7).trim();

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = decoded?.user ?? decoded;
    (req as any).user = decoded.user; 
    return next();
  } catch (err: any) {
    return res.status(401).json({ message: err.name === "TokenExpiredError" ? "Token expired" : "Invalid token" });
  }
}
