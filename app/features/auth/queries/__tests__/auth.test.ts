import { describe, expect, it } from "vitest";
import { getTestDb } from "@/shared/__tests__/test-utils";
import { getUserById, setUserRole, upsertUserByGoogleId } from "../queries_sql";

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
