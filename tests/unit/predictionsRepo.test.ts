import { describe, expect, it } from "vitest";
import { predictionOwnershipWhere } from "@/data/repositories/predictions.repo";

describe("prediction repository", () => {
  it("scopes prediction access by user id", () => {
    expect(predictionOwnershipWhere("user-1", "prediction-1")).toEqual({
      id: "prediction-1",
      userId: "user-1"
    });
  });
});
