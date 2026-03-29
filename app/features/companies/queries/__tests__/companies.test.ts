import { describe, expect, it } from "vitest";
import { getTestDb, seedUser } from "@/shared/__tests__/test-utils";
import { createCompany, getCompanyById, getCompanyByOwnerId, updateCompany } from "../queries_sql";

const sql = getTestDb();

describe("createCompany", () => {
  it("creates a company linked to an owner", async () => {
    const owner = await seedUser({ role: "company" });

    const company = await createCompany(sql, {
      ownerId: owner.id,
      name: "Acme Corp",
      description: "Building great things",
    });

    expect(company).not.toBeNull();
    expect(company!.name).toBe("Acme Corp");
    expect(company!.description).toBe("Building great things");
    expect(company!.ownerId).toBe(owner.id);
    expect(company!.id).toBeDefined();
    expect(company!.createdAt).toBeInstanceOf(Date);
  });

  it("creates a company with null description", async () => {
    const owner = await seedUser({ role: "company" });

    const company = await createCompany(sql, {
      ownerId: owner.id,
      name: "No Desc Corp",
      description: null,
    });

    expect(company).not.toBeNull();
    expect(company!.description).toBeNull();
  });
});

describe("getCompanyByOwnerId", () => {
  it("returns the company for a given owner", async () => {
    const owner = await seedUser({ role: "company" });
    const created = await createCompany(sql, {
      ownerId: owner.id,
      name: "My Co",
      description: null,
    });

    const found = await getCompanyByOwnerId(sql, { ownerId: owner.id });
    expect(found).not.toBeNull();
    expect(found!.id).toBe(created!.id);
    expect(found!.name).toBe("My Co");
  });

  it("returns null if owner has no company", async () => {
    const owner = await seedUser({ role: "company" });
    const found = await getCompanyByOwnerId(sql, { ownerId: owner.id });
    expect(found).toBeNull();
  });
});

describe("getCompanyById", () => {
  it("returns the company by id", async () => {
    const owner = await seedUser({ role: "company" });
    const created = await createCompany(sql, {
      ownerId: owner.id,
      name: "By ID Corp",
      description: null,
    });

    const found = await getCompanyById(sql, { id: created!.id });
    expect(found).not.toBeNull();
    expect(found!.name).toBe("By ID Corp");
  });

  it("returns null for non-existent id", async () => {
    const found = await getCompanyById(sql, { id: "00000000-0000-0000-0000-000000000000" });
    expect(found).toBeNull();
  });
});

describe("updateCompany", () => {
  it("updates name and description", async () => {
    const owner = await seedUser({ role: "company" });
    const created = await createCompany(sql, {
      ownerId: owner.id,
      name: "Old Name",
      description: "Old desc",
    });

    const updated = await updateCompany(sql, {
      id: created!.id,
      ownerId: owner.id,
      name: "New Name",
      description: "New desc",
    });

    expect(updated).not.toBeNull();
    expect(updated!.name).toBe("New Name");
    expect(updated!.description).toBe("New desc");
  });

  it("returns null when ownerId doesn't match", async () => {
    const owner = await seedUser({ role: "company" });
    const other = await seedUser({ role: "company" });
    const created = await createCompany(sql, {
      ownerId: owner.id,
      name: "My Company",
      description: null,
    });

    const result = await updateCompany(sql, {
      id: created!.id,
      ownerId: other.id,
      name: "Hacked",
      description: null,
    });

    expect(result).toBeNull();

    // Original unchanged
    const check = await getCompanyById(sql, { id: created!.id });
    expect(check!.name).toBe("My Company");
  });
});
