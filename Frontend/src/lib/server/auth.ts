import jwt from "jsonwebtoken";

export type JwtPayload = {
  user_id: number;
  username: string;
};

const JWT_SECRET = process.env.JWT_SECRET || "goshock-secret-key-production";

export function generateToken(user_id: number, username: string) {
  return jwt.sign({ user_id, username }, JWT_SECRET, {
    expiresIn: "1d",
  });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

export function getBearerToken(req: Request) {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.replace("Bearer ", "");
}