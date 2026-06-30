import { describe, expect, it } from "vitest";
import { assertAccountCanAuthenticate } from "@/features/accounts/grace";
import { getTestDb } from "@/shared/__tests__/test-utils";
import {
  clearUserRole,
  getUserByGoogleId,
  getUserById,
  restoreUser,
  setUserRole,
  softDeleteUser,
  upsertUserByGoogleId,
} from "../queries_sql";

const sql = getTestDb();

describe("upsertUserByGoogleId", () => {
  it("creates a new user", async () => {
    const user = await upsertUserByGoogleId(sql, {
      email: "alice@example.com",
      name: "Alice",
      picture: "https://example.com/alice.jpg",
      googleId: "google-123",
    });

    expect(user).not.toBeNull();
    expect(user!.email).toBe("alice@example.com");
    expect(user!.name).toBe("Alice");
    expect(user!.picture).toBe("https://example.com/alice.jpg");
    expect(user!.googleId).toBe("google-123");
    expect(user!.role).toBeNull();
    expect(user!.id).toBeDefined();
    expect(user!.createdAt).toBeInstanceOf(Date);
  });

  it("updates existing user on conflict (same google_id)", async () => {
    await upsertUserByGoogleId(sql, {
      email: "alice@example.com",
      name: "Alice",
      picture: null,
      googleId: "google-123",
    });

    const updated = await upsertUserByGoogleId(sql, {
      email: "alice-new@example.com",
      name: "Alice Updated",
      picture: "https://example.com/new.jpg",
      googleId: "google-123",
    });

    expect(updated).not.toBeNull();
    expect(updated!.email).toBe("alice-new@example.com");
    expect(updated!.name).toBe("Alice Updated");
    expect(updated!.picture).toBe("https://example.com/new.jpg");
  });

  it("preserves role on upsert", async () => {
    const user = await upsertUserByGoogleId(sql, {
      email: "alice@example.com",
      name: "Alice",
      picture: null,
      googleId: "google-123",
    });
    await setUserRole(sql, { role: "company", id: user!.id });

    const updated = await upsertUserByGoogleId(sql, {
      email: "alice@example.com",
      name: "Alice",
      picture: null,
      googleId: "google-123",
    });

    expect(updated!.role).toBe("company");
  });
});

describe("getUserById", () => {
  it("returns the user by id", async () => {
    const created = await upsertUserByGoogleId(sql, {
      email: "bob@example.com",
      name: "Bob",
      picture: null,
      googleId: "google-456",
    });

    const user = await getUserById(sql, { id: created!.id });
    expect(user).not.toBeNull();
    expect(user!.email).toBe("bob@example.com");
  });

  it("returns null for non-existent id", async () => {
    const user = await getUserById(sql, { id: "00000000-0000-0000-0000-000000000000" });
    expect(user).toBeNull();
  });

  it("returns null for soft-deleted users", async () => {
    const created = await upsertUserByGoogleId(sql, {
      email: "deleted@example.com",
      name: "Deleted User",
      picture: null,
      googleId: "google-deleted",
    });

    await softDeleteUser(sql, { id: created!.id });

    const user = await getUserById(sql, { id: created!.id });
    expect(user).toBeNull();
  });
});

describe("setUserRole", () => {
  it("sets role when role is null", async () => {
    const user = await upsertUserByGoogleId(sql, {
      email: "carol@example.com",
      name: "Carol",
      picture: null,
      googleId: "google-789",
    });

    const updated = await setUserRole(sql, { role: "candidate", id: user!.id });
    expect(updated).not.toBeNull();
    expect(updated!.role).toBe("candidate");
  });

  it("returns null when role is already set (no overwrite)", async () => {
    const user = await upsertUserByGoogleId(sql, {
      email: "dave@example.com",
      name: "Dave",
      picture: null,
      googleId: "google-abc",
    });
    await setUserRole(sql, { role: "company", id: user!.id });

    const second = await setUserRole(sql, { role: "candidate", id: user!.id });
    expect(second).toBeNull();

    // Confirm role didn't change
    const check = await getUserById(sql, { id: user!.id });
    expect(check!.role).toBe("company");
  });
});

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

describe("restoreUser", () => {
  it("does not restore users past the grace period", async () => {
    const created = await upsertUserByGoogleId(sql, {
      email: "past-grace@example.com",
      name: "Past Grace",
      picture: null,
      googleId: "google-past-grace",
    });
    expect(created).not.toBeNull();

    await sql`
      UPDATE users
      SET deleted_at = ${daysAgo(31)}
      WHERE id = ${created!.id}
    `;

    await restoreUser(sql, { id: created!.id });

    const [row] = await sql`
      SELECT deleted_at
      FROM users
      WHERE id = ${created!.id}
    `;
    expect(row?.deleted_at).not.toBeNull();
  });

  it("does not restore anonymized users", async () => {
    const created = await upsertUserByGoogleId(sql, {
      email: "erased@example.com",
      name: "Erased User",
      picture: null,
      googleId: "google-erased",
    });
    expect(created).not.toBeNull();

    await sql`
      UPDATE users
      SET deleted_at = now(), anonymized_at = now()
      WHERE id = ${created!.id}
    `;

    await restoreUser(sql, { id: created!.id });

    const [row] = await sql`
      SELECT deleted_at, anonymized_at
      FROM users
      WHERE id = ${created!.id}
    `;
    expect(row?.deleted_at).not.toBeNull();
    expect(row?.anonymized_at).not.toBeNull();
  });
});

describe("getUserByGoogleId anonymized tombstone", () => {
  it("finds the tombstone row and blocks authentication after anonymization", async () => {
    const created = await upsertUserByGoogleId(sql, {
      email: "tombstone@example.com",
      name: "Tombstone User",
      picture: null,
      googleId: "google-tombstone",
    });
    expect(created).not.toBeNull();

    await sql`
      UPDATE users
      SET deleted_at = now(),
          anonymized_at = now(),
          name = 'Deleted user',
          email = ${`deleted+${created!.id}@deleted.invalid`}
      WHERE id = ${created!.id}
    `;

    const tombstone = await getUserByGoogleId(sql, { googleId: "google-tombstone" });
    expect(tombstone).not.toBeNull();
    expect(tombstone!.id).toBe(created!.id);
    expect(tombstone!.anonymizedAt).not.toBeNull();
    expect(() => assertAccountCanAuthenticate(tombstone!)).toThrow(
      "This account has been permanently deleted",
    );

    const again = await upsertUserByGoogleId(sql, {
      email: "tombstone@example.com",
      name: "Tombstone User",
      picture: null,
      googleId: "google-tombstone",
    });
    expect(again).toBeNull();
  });
});

describe("clearUserRole", () => {
  it("clears an existing company role", async () => {
    const user = await upsertUserByGoogleId(sql, {
      email: "orphan@example.com",
      name: "Orphan",
      picture: null,
      googleId: "google-orphan",
    });
    await setUserRole(sql, { role: "company", id: user!.id });

    const cleared = await clearUserRole(sql, { id: user!.id });
    expect(cleared).not.toBeNull();
    expect(cleared!.role).toBeNull();
  });
});
