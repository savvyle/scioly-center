import { describe, it, expect } from "vitest";
import { folderIdFrom, parseDriveName } from "./drive.functions";

describe("drive file pairing", () => {
  it("reads a key file", () => expect(parseDriveName("Water Quality B Key.pdf")).toEqual({ event: "Water Quality", division: "B", isKey: true }));
  it("reads a test file", () => expect(parseDriveName("Anatomy and Physiology B.pdf")).toEqual({ event: "Anatomy & Physiology", division: "B", isKey: false }));
  it("gets folder id", () => expect(folderIdFrom("https://drive.google.com/drive/folders/1MVjM4aWQjRmjs7rJhG10yAoG4yDqkPSm")).toBe("1MVjM4aWQjRmjs7rJhG10yAoG4yDqkPSm"));
});
