// Server-only in-memory store backing the /api/test/* endpoints.
// Deliberately not a real database: E2E labs need deterministic seed and
// cleanup before Drizzle/Supabase land (see AGENTS.md target architecture).
// State lives only for the lifetime of the server process.

export type SeedRecord = Record<string, unknown>;

const store = new Map<string, SeedRecord>();

let nextId = 0;

function reset() {
  store.clear();
  nextId = 0;
}

// Test-only surface; must never answer in production builds.
export function isTestDataApiEnabled(): boolean {
  return process.env.NODE_ENV !== "production";
}

export function seedRecords(records: SeedRecord[]): { count: number; items: SeedRecord[] } {
  // Seeding replaces prior state so every E2E run starts identical.
  reset();
  for (const record of records) {
    const id = String(++nextId);
    store.set(id, { ...record, id });
  }
  return { count: store.size, items: listRecords() };
}

export function listRecords(): SeedRecord[] {
  return [...store.values()];
}

export function clearRecords(): void {
  reset();
}
