import { describe, expect, it } from "vitest";
import { normalizeTestMetadata, pdfPairName, publicPdfUrl } from "./test-metadata";

describe("automatic test details", () => {
  it("keeps an identified event, division, year and tournament level", () => {
    expect(normalizeTestMetadata({ event: "Water Quality", division: "C", year: 2027, tournament: "Highlands", level: "Invitational" })).toEqual({ event: "Water Quality", division: "C", year: 2027, tournament: "Highlands", level: "Invitational" });
  });
  it("defaults missing division to B without inventing year or level", () => {
    expect(normalizeTestMetadata({ event: "Water Quality" })).toEqual({ event: "Water Quality", division: "B", year: null, tournament: null, level: null });
  });
  it("does not accept an unidentified event", () => {
    expect(() => normalizeTestMetadata({ event: "Unknown" })).toThrow();
  });
  it("pairs tests and keys while keeping different events separate", () => {
    expect(pdfPairName("Water Quality B Test.pdf")).toBe(pdfPairName("Water Quality B Answer Key.pdf"));
    expect(pdfPairName("Water Quality B.pdf")).not.toBe(pdfPairName("Ecology B.pdf"));
  });
  it("rejects private and insecure PDF destinations", () => {
    for (const url of ["http://example.org/test.pdf", "https://127.0.0.1/test.pdf", "https://192.168.1.1/test.pdf", "https://localhost/test.pdf", "https://[::1]/test.pdf", "https://host.internal/test.pdf"]) expect(() => publicPdfUrl(url)).toThrow();
    expect(publicPdfUrl("https://www.soinc.org/test.pdf").hostname).toBe("www.soinc.org");
  });
});