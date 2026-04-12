// Simple localStorage-based auth (no real backend — browser-only)

export type User = {
  email: string;
  name: string;
  passwordHash: string;
};

export type Session = {
  email: string;
  name: string;
};

const USERS_KEY = "bsx_users_v1";
const SESSION_KEY = "bsx_session_v1";

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode("bsx:" + password);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function getUsers(): User[] {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveUsers(users: User[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export async function register(
  name: string,
  email: string,
  password: string
): Promise<{ ok: boolean; error?: string }> {
  const users = getUsers();
  const normalized = email.trim().toLowerCase();
  if (users.find((u) => u.email === normalized)) {
    return { ok: false, error: "An account with this email already exists." };
  }
  const passwordHash = await hashPassword(password);
  users.push({ name: name.trim(), email: normalized, passwordHash });
  saveUsers(users);
  return { ok: true };
}

export async function login(
  email: string,
  password: string
): Promise<{ ok: boolean; error?: string; session?: Session }> {
  const users = getUsers();
  const normalized = email.trim().toLowerCase();
  const user = users.find((u) => u.email === normalized);
  if (!user) {
    return { ok: false, error: "No account found with this email." };
  }
  const passwordHash = await hashPassword(password);
  if (user.passwordHash !== passwordHash) {
    return { ok: false, error: "Incorrect password." };
  }
  const session: Session = { email: user.email, name: user.name };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return { ok: true, session };
}

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function logout(): void {
  localStorage.removeItem(SESSION_KEY);
}
