import { describe, expect, it } from "vitest";
import { clampRect, constrainView, deriveInteractive } from "./core";
import type { InteractiveBlock } from "./types";

const slider: InteractiveBlock = {
  id: "mortgage",
  owner: "ai",
  templateId: "parameter_slider",
  title: "房贷利率",
  rect: { x: 0, y: 0, width: 400, height: 240 },
  config: { min: 1, max: 10, principal: 1_000_000, years: 30 },
  state: { value: 6 },
  derivedOutput: {},
  feedbackPolicy: "when_awaited",
  revision: 1,
};

describe("board core", () => {
  it("bounds oversized rectangles", () => {
    expect(clampRect({ x: 5, y: 5, width: 3000, height: 2000 })).toEqual({ x: 0, y: 0, width: 1600, height: 900 });
  });
  it("keeps the board visible while zooming and panning", () => {
    expect(constrainView({ zoom: 0.1, scrollX: 400, scrollY: -1000 }, 800, 450)).toEqual({ zoom: .5, scrollX: 0, scrollY: 0 });
    expect(constrainView({ zoom: 1, scrollX: 100, scrollY: -9999 }, 800, 450)).toEqual({ zoom: 1, scrollX: 0, scrollY: -450 });
    expect(constrainView({ zoom: .5, scrollX: 0, scrollY: 0 }, 800, 600).scrollY).toBe(150);
  });
  it("keeps blocks inside the fixed board", () => {
    expect(clampRect({ x: 1500, y: -20, width: 300, height: 200 })).toEqual({
      x: 1300,
      y: 0,
      width: 300,
      height: 200,
    });
  });

  it("keeps an exact committed slider value and derives its output", () => {
    expect(deriveInteractive(slider)).toMatchObject({ value: 6 });
    expect(deriveInteractive(slider).monthlyPayment).toBeGreaterThan(0);
  });
});
