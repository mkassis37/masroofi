import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, financeCloud } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { isCloudPreferenceSnapshot, type CloudPreferenceSnapshot } from "../lib/cloud-preferences";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getFinanceCloud(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(financeCloud).where(eq(financeCloud.userId, userId)).limit(1);
  return result[0];
}

export type CloudPreferences = CloudPreferenceSnapshot;

function parseCloudPayload(payload: string) {
  try {
    const parsed = JSON.parse(payload) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function parseCloudPreferences(value: unknown): CloudPreferences | undefined {
  return isCloudPreferenceSnapshot(value) ? value : undefined;
}

export async function getFinanceCloudPreferences(userId: number) {
  const row = await getFinanceCloud(userId);
  if (!row) return undefined;
  return parseCloudPreferences(parseCloudPayload(row.payload).preferences);
}

export async function saveFinanceCloudPreferences(userId: number, preferences: CloudPreferences, expectedUpdatedAt: number) {
  const currentPreferences = await getFinanceCloudPreferences(userId);
  if (currentPreferences && currentPreferences.updatedAt > expectedUpdatedAt) {
    return { saved: false as const, conflict: true as const, current: currentPreferences };
  }
  const row = await getFinanceCloud(userId);
  const currentPayload = row ? parseCloudPayload(row.payload) : {};
  await saveFinanceCloud(userId, JSON.stringify({ ...currentPayload, preferences }));
  return { saved: true as const, conflict: false as const, current: preferences };
}

export async function saveFinanceCloud(userId: number, payload: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(financeCloud).values({ userId, payload }).onDuplicateKeyUpdate({ set: { payload, updatedAt: new Date() } });
}
