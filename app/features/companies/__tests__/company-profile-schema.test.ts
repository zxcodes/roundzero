import { describe, expect, it } from "vitest";
import { z } from "zod";

const foundedYearSchema = z
  .number()
  .int()
  .min(1800)
  .refine((year) => year <= new Date().getFullYear(), {
    message: "Founded year cannot be in the future",
  })
  .nullable();

describe("foundedYearSchema", () => {
  it("accepts the current year at validation time", () => {
    const currentYear = new Date().getFullYear();
    expect(foundedYearSchema.safeParse(currentYear).success).toBe(true);
  });

  it("rejects a year after the current year", () => {
    const nextYear = new Date().getFullYear() + 1;
    const result = foundedYearSchema.safeParse(nextYear);
    expect(result.success).toBe(false);
  });

  it("accepts null", () => {
    expect(foundedYearSchema.safeParse(null).success).toBe(true);
  });
});
