import { describe, expect, it } from "vitest";
import { clearRecords, listRecords, seedRecords } from "../../src/lib/test-data";

describe("test-data store", () => {
  it("assigns sequential ids and replaces previous state on reseed", () => {
    const first = seedRecords([{ name: "room-1" }, { name: "room-2" }]);
    expect(first.count).toBe(2);
    expect(first.items.map((item) => item.id)).toEqual(["1", "2"]);

    const second = seedRecords([{ name: "room-3" }]);
    expect(second.count).toBe(1);
    expect(listRecords()).toEqual([{ name: "room-3", id: "1" }]);
  });

  it("clears all records on cleanup", () => {
    seedRecords([{ name: "room-1" }]);
    clearRecords();
    expect(listRecords()).toEqual([]);
  });
});
