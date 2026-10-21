import { describe, expect, it } from "vitest";
import { ADJUST_DEFAULT, adjustFilter, adjustFromDrag, isClick, isDefaultAdjust } from "./viewerTools";

describe("adjustFromDrag", () => {
  it("horizontal cambia el contraste y vertical el brillo (arriba aclara)", () => {
    expect(adjustFromDrag(ADJUST_DEFAULT, 100, 0)).toEqual({ brightness: 1, contrast: 1.5 });
    expect(adjustFromDrag(ADJUST_DEFAULT, 0, -100)).toEqual({ brightness: 1.5, contrast: 1 });
  });

  it("acota a [0.2, 3]", () => {
    expect(adjustFromDrag(ADJUST_DEFAULT, -10_000, 10_000)).toEqual({ brightness: 0.2, contrast: 0.2 });
    expect(adjustFromDrag(ADJUST_DEFAULT, 10_000, -10_000)).toEqual({ brightness: 3, contrast: 3 });
  });

  it("parte del ajuste de base, no del default", () => {
    expect(adjustFromDrag({ brightness: 1.2, contrast: 0.8 }, 20, 0)).toEqual({ brightness: 1.2, contrast: 0.9 });
  });
});

describe("adjustFilter", () => {
  it("default no aplica filtro", () => {
    expect(adjustFilter(ADJUST_DEFAULT)).toBe("none");
  });

  it("genera brightness y contrast", () => {
    expect(adjustFilter({ brightness: 1.2, contrast: 0.9 })).toBe("brightness(1.2) contrast(0.9)");
  });
});

describe("isDefaultAdjust", () => {
  it("reconoce el ajuste por defecto", () => {
    expect(isDefaultAdjust({ brightness: 1, contrast: 1 })).toBe(true);
    expect(isDefaultAdjust({ brightness: 1, contrast: 1.1 })).toBe(false);
  });
});

describe("isClick", () => {
  it("menos de 5 px es clic", () => {
    expect(isClick(3, 3)).toBe(true);
    expect(isClick(4, 4)).toBe(false); // hypot ≈ 5.66
  });
});
