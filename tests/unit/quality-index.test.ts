import { describe, expect, it } from "vitest";
import { aggregateQualityIndex } from "#/services/quality-index";

describe("aggregateQualityIndex — PRD §9.1/§9.2", () => {
  it("attributes points by DISPLAY position, not item A/B order", () => {
    // itemA=1 is on the LEFT here, so choice=1 ("left much better") must
    // score item 1 at 1.0, not item 2 — this is the exact bug the PRD warns
    // about (position is randomized per pair and must be un-scrambled).
    const rows = [{ itemAId: 1, itemBId: 2, displayLeftItemId: 1, choice: 1 }];
    const result = aggregateQualityIndex(rows);

    expect(result).toEqual(
      expect.arrayContaining([
        { itemId: 1, qualityIndex: 1.0, comparisonCount: 1 },
        { itemId: 2, qualityIndex: 0.0, comparisonCount: 1 },
      ]),
    );
  });

  it("un-scrambles correctly when item B is displayed on the left", () => {
    // Same choice value, but itemB=2 is on the left this time — so the
    // "left much better" point (1.0) goes to item 2, not item 1.
    const rows = [{ itemAId: 1, itemBId: 2, displayLeftItemId: 2, choice: 1 }];
    const result = aggregateQualityIndex(rows);

    expect(result).toEqual(
      expect.arrayContaining([
        { itemId: 2, qualityIndex: 1.0, comparisonCount: 1 },
        { itemId: 1, qualityIndex: 0.0, comparisonCount: 1 },
      ]),
    );
  });

  it("averages points across multiple comparisons for the same item", () => {
    const rows = [
      { itemAId: 1, itemBId: 2, displayLeftItemId: 1, choice: 1 }, // item1=1.0
      { itemAId: 1, itemBId: 3, displayLeftItemId: 1, choice: 6 }, // item1=0.0
    ];
    const result = aggregateQualityIndex(rows);
    const item1 = result.find((r) => r.itemId === 1);
    expect(item1).toEqual({ itemId: 1, qualityIndex: 0.5, comparisonCount: 2 });
  });

  it("ignores comparisons with no choice recorded (draft rows)", () => {
    const rows = [{ itemAId: 1, itemBId: 2, displayLeftItemId: 1, choice: null }];
    expect(aggregateQualityIndex(rows)).toEqual([]);
  });
});
