const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

export interface AuthResponse {
  message: string;
  token: string;
  username: string;
  user_id: number;
}

export interface CurrentUser {
  user_id: number;
  username: string;
  time: string;
}

export interface ShortenResponse {
  short_url: string;
  short_code: string;
  long_url: string;
  qr_url: string;
  clicks: number;
  expires_at?: string | null;
}

export interface ClickHourStat {
  hour: string;
  clicks: number;
}

export interface ChartResponse {
  short_code: string;
  short_url: string;
  long_url: string;
  qr_url: string;
  clicks: number;
  created_at: string;
  expires_at?: string | null;
  chart: ClickHourStat[];
}

export interface LinkItem {
  id: number;
  short_code: string;
  short_url: string;
  long_url: string;
  qr_url: string;
  clicks: number;
  created_at: string;
  expires_at?: string | null;
  is_expired: boolean;
}

function authHeaders(token?: string): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function parseResponse<T>(res: Response): Promise<T> {
  const text = await res.text();

  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }

  if (!res.ok) {
    throw new Error(data.error || data.message || "Terjadi kesalahan");
  }

  return data as T;
}

export async function login(
  email: string,
  password: string
): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });

  return parseResponse<AuthResponse>(res);
}

export async function register(
  username: string,
  email: string,
  password: string
): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ username, email, password }),
  });

  return parseResponse<AuthResponse>(res);
}

export async function logout(token?: string): Promise<void> {
  await fetch(`${API_BASE}/logout`, {
    method: "POST",
    headers: authHeaders(token),
    credentials: "include",
  });
}

export async function getMe(token: string): Promise<CurrentUser> {
  const res = await fetch(`${API_BASE}/me`, {
    headers: authHeaders(token),
    credentials: "include",
  });

  return parseResponse<CurrentUser>(res);
}

export async function shortenURL(
  url: string,
  alias?: string,
  expiryDays?: string,
  token?: string
): Promise<ShortenResponse> {
  const formData = new FormData();

  formData.append("url", url);
  if (alias) formData.append("alias", alias);
  if (expiryDays) formData.append("expiry_days", expiryDays);

  const res = await fetch(`${API_BASE}/shorten`, {
    method: "POST",
    headers: authHeaders(token),
    credentials: "include",
    body: formData,
  });

  return parseResponse<ShortenResponse>(res);
}

export async function getLinks(token: string): Promise<LinkItem[]> {
  const res = await fetch(`${API_BASE}/links`, {
    headers: authHeaders(token),
    credentials: "include",
  });

  return parseResponse<LinkItem[]>(res);
}

export async function getChart(
  code: string,
  token: string
): Promise<ChartResponse> {
  const res = await fetch(`${API_BASE}/chart/${code}`, {
    headers: authHeaders(token),
    credentials: "include",
  });

  return parseResponse<ChartResponse>(res);
}

export async function deleteLink(
  code: string,
  token: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/links/${code}`, {
    method: "DELETE",
    headers: authHeaders(token),
    credentials: "include",
  });

  await parseResponse<{ message: string }>(res);
}