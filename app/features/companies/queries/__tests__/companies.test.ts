import { describe, expect, it } from "vitest";
import { getTestDb, seedUser } from "@/shared/__tests__/test-utils";
import {
  createCompany,
  getAllCompanies,
  getCompanyById,
  getCompanyByOwnerId,
  getCompanyBySlug,
  slugExists,
  updateCompanyProfile,
} from "../queries_sql";

const sql = getTestDb();

describe("createCompany", () => {
  it("creates a company linked to an owner", async () => {
    const owner = await seedUser({ role: "company" });

    const company = await createCompany(sql, {
      ownerId: owner.id,
      name: "Acme Corp",
      slug: "acme-corp",
      description: "Building great things",
      industry: "technology",
      companySize: "51-200",
    });

    expect(company).not.toBeNull();
    expect(company!.name).toBe("Acme Corp");
    expect(company!.slug).toBe("acme-corp");
    expect(company!.description).toBe("Building great things");
    expect(company!.industry).toBe("technology");
    expect(company!.companySize).toBe("51-200");
    expect(company!.ownerId).toBe(owner.id);
    expect(company!.id).toBeDefined();
    expect(company!.createdAt).toBeInstanceOf(Date);
  });

  it("creates a company with null optional fields", async () => {
    const owner = await seedUser({ role: "company" });

    const company = await createCompany(sql, {
      ownerId: owner.id,
      name: "No Extras Corp",
      slug: "no-extras-corp",
      description: null,
      industry: null,
      companySize: null,
    });

    expect(company).not.toBeNull();
    expect(company!.description).toBeNull();
    expect(company!.industry).toBeNull();
    expect(company!.companySize).toBeNull();
  });

  it("enforces unique slug constraint", async () => {
    const owner1 = await seedUser({ role: "company" });
    const owner2 = await seedUser({ role: "company" });

    await createCompany(sql, {
      ownerId: owner1.id,
      name: "First",
      slug: "duplicate-slug",
      description: null,
      industry: null,
      companySize: null,
    });

    await expect(
      createCompany(sql, {
        ownerId: owner2.id,
        name: "Second",
        slug: "duplicate-slug",
        description: null,
        industry: null,
        companySize: null,
      }),
    ).rejects.toThrow();
  });
});

describe("getCompanyByOwnerId", () => {
  it("returns the company for a given owner", async () => {
    const owner = await seedUser({ role: "company" });
    const created = await createCompany(sql, {
      ownerId: owner.id,
      name: "My Co",
      slug: "my-co",
      description: null,
      industry: null,
      companySize: null,
    });

    const found = await getCompanyByOwnerId(sql, { ownerId: owner.id });
    expect(found).not.toBeNull();
    expect(found!.id).toBe(created!.id);
    expect(found!.name).toBe("My Co");
    expect(found!.slug).toBe("my-co");
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
      slug: "by-id-corp",
      description: null,
      industry: null,
      companySize: null,
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

describe("getCompanyBySlug", () => {
  it("returns the company with owner info", async () => {
    const owner = await seedUser({ role: "company", name: "Jane Doe" });
    await createCompany(sql, {
      ownerId: owner.id,
      name: "Slug Corp",
      slug: "slug-corp",
      description: "A test company",
      industry: "saas",
      companySize: "11-50",
    });

    const found = await getCompanyBySlug(sql, { slug: "slug-corp" });
    expect(found).not.toBeNull();
    expect(found!.name).toBe("Slug Corp");
    expect(found!.ownerName).toBe("Jane Doe");
    expect(found!.industry).toBe("saas");
  });

  it("returns null for non-existent slug", async () => {
    const found = await getCompanyBySlug(sql, { slug: "does-not-exist" });
    expect(found).toBeNull();
  });
});

describe("updateCompanyProfile", () => {
  it("updates all profile fields", async () => {
    const owner = await seedUser({ role: "company" });
    const created = await createCompany(sql, {
      ownerId: owner.id,
      name: "Old Name",
      slug: "old-name",
      description: "Old desc",
      industry: null,
      companySize: null,
    });

    const updated = await updateCompanyProfile(sql, {
      id: created!.id,
      ownerId: owner.id,
      name: "New Name",
      description: "New desc",
      logoUrl: "https://example.com/logo.png",
      website: "https://newname.com",
      industry: "finance",
      companySize: "201-500",
      foundedYear: 2020,
      location: "San Francisco, CA",
      techStack: ["TypeScript", "React"],
      culture: "We value collaboration",
      socialLinks: { linkedin: "https://linkedin.com/company/new" },
    });

    expect(updated).not.toBeNull();
    expect(updated!.name).toBe("New Name");
    expect(updated!.description).toBe("New desc");
    expect(updated!.logoUrl).toBe("https://example.com/logo.png");
    expect(updated!.website).toBe("https://newname.com");
    expect(updated!.industry).toBe("finance");
    expect(updated!.companySize).toBe("201-500");
    expect(updated!.foundedYear).toBe(2020);
    expect(updated!.location).toBe("San Francisco, CA");
    expect(updated!.culture).toBe("We value collaboration");
    expect(updated!.updatedAt.getTime()).toBeGreaterThan(created!.createdAt.getTime());
  });

  it("returns null when ownerId doesn't match", async () => {
    const owner = await seedUser({ role: "company" });
    const other = await seedUser({ role: "company" });
    const created = await createCompany(sql, {
      ownerId: owner.id,
      name: "My Company",
      slug: "my-company",
      description: null,
      industry: null,
      companySize: null,
    });

    const result = await updateCompanyProfile(sql, {
      id: created!.id,
      ownerId: other.id,
      name: "Hacked",
      description: null,
      logoUrl: null,
      website: null,
      industry: null,
      companySize: null,
      foundedYear: null,
      location: null,
      techStack: null,
      culture: null,
      socialLinks: null,
    });

    expect(result).toBeNull();

    // Original unchanged
    const check = await getCompanyById(sql, { id: created!.id });
    expect(check!.name).toBe("My Company");
  });
});

describe("slugExists", () => {
  it("returns true when slug exists", async () => {
    const owner = await seedUser({ role: "company" });
    await createCompany(sql, {
      ownerId: owner.id,
      name: "Existing",
      slug: "existing-slug",
      description: null,
      industry: null,
      companySize: null,
    });

    const result = await slugExists(sql, { slug: "existing-slug" });
    expect(result).not.toBeNull();
    expect(result!.exists).toBe(true);
  });

  it("returns false when slug does not exist", async () => {
    const result = await slugExists(sql, { slug: "nonexistent-slug" });
    expect(result).not.toBeNull();
    expect(result!.exists).toBe(false);
  });
});

describe("getAllCompanies", () => {
  it("returns companies with open job count", async () => {
    const owner = await seedUser({ role: "company" });
    const company = await createCompany(sql, {
      ownerId: owner.id,
      name: "Jobs Corp",
      slug: "jobs-corp",
      description: null,
      industry: "technology",
      companySize: "51-200",
    });

    // Insert an open job directly
    await sql`
      INSERT INTO jobs (company_id, title, description, status)
      VALUES (${company!.id}, ${"Test Job"}, ${"Desc"}, ${"open"})
    `;

    const all = await getAllCompanies(sql);
    expect(all.length).toBeGreaterThanOrEqual(1);

    const found = all.find((c) => c.id === company!.id);
    expect(found).toBeDefined();
    expect(found!.openJobCount).toBe(1);
  });
});
