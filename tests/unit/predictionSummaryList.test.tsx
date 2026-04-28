import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PredictionSummaryList } from "@/features/dashboard/prediction-summary-list";

describe("PredictionSummaryList", () => {
  it("renders prediction competitive summaries", () => {
    render(
      <PredictionSummaryList
        predictions={[
          {
            id: "prediction-1",
            name: "Plan A",
            status: "COMPLETA",
            updatedAt: new Date("2026-04-26T00:00:00.000Z"),
            groupMatchesCompleted: 72,
            knockoutMatchesCompleted: 32,
            isKnockoutReady: true,
            champion: "Espana",
            finalists: ["Espana", "Argentina"],
            semifinalists: ["Espana", "Brasil", "Argentina", "Francia"]
          }
        ]}
      />
    );

    expect(screen.getByRole("link", { name: /Plan A/ })).toHaveAttribute(
      "href",
      "/predictions/prediction-1"
    );
    expect(screen.getByText("Torneo completo")).toBeInTheDocument();
    expect(screen.getByText(/Estado\s+COMPLETA/)).toBeInTheDocument();
    expect(screen.getByText("Espana")).toBeInTheDocument();
    expect(screen.getByText("Espana, Argentina")).toBeInTheDocument();
  });

  it("renders an empty state", () => {
    render(<PredictionSummaryList predictions={[]} />);

    expect(screen.getByText("Aun no tienes predicciones")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Crear prediccion" })
    ).toHaveAttribute("href", "/predictions/new");
  });
});
