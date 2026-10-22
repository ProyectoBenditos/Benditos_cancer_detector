import { describe, expect, it } from "vitest";
import { getVolumeGeometry, normalizeNodule, type VolumeMetadata } from "./volumeGeometry";

const metadata: VolumeMetadata = {
  num_slices: 30, rows: 256, columns: 512, pixel_spacing: [0.8, 0.6],
  slice_thickness: 1.25, z_start: -35, z_end: 37.5,
};

describe("physical atlas geometry", () => {
  it("uses original field of view and distance between slices instead of thickness", () => {
    const result = getVolumeGeometry(metadata, 128, 128);
    expect(result.dimensionsMm).toEqual([307.2, 75, 204.8]);
    expect(result.scale[1]).toBeCloseTo(75 / 307.2);
    expect(result.scale[2]).toBeCloseTo(204.8 / 307.2);
    expect(result.voxelStep).toEqual([1 / 127, 1 / 29, 1 / 127]);
  });
  it("preserves physical shape when atlas resolution changes", () => {
    expect(getVolumeGeometry(metadata, 256, 256).scale).toEqual(getVolumeGeometry(metadata, 64, 64).scale);
  });
  it("prefers explicit sample spacing and accepts legacy NIfTI metadata", () => {
    expect(getVolumeGeometry({ ...metadata, slice_spacing: 3 }, 128, 128).dimensionsMm[1]).toBe(90);
    const nii = { num_slices: 32, matrix: [80, 128], pixel_spacing: [1.5, 2], slice_thickness_mm: 2.5 };
    expect(getVolumeGeometry(nii, 128, 128).dimensionsMm).toEqual([256, 80, 120]);
  });
  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])("rejects invalid spacing %s", (spacing) => {
    expect(() => getVolumeGeometry({ ...metadata, pixel_spacing: [spacing, 1] }, 128, 128)).toThrow();
  });
  it("rejects a single image and missing source dimensions", () => {
    expect(() => getVolumeGeometry({ ...metadata, num_slices: 1 }, 128, 128)).toThrow();
    expect(() => getVolumeGeometry({ ...metadata, rows: undefined }, 128, 128)).toThrow();
  });
  it("reports series that need resampling instead of distorting them", () => {
    expect(() => getVolumeGeometry({ ...metadata, geometry_error: "Requiere remuestreo" }, 128, 128)).toThrow("Requiere remuestreo");
  });
});

describe("explicit source voxel localization", () => {
  it("maps axial slices upward and image rows toward the posterior", () => {
    expect(normalizeNodule({ x: 0, y: 0, z: 0 }, metadata)).toEqual([0, 0, 1]);
    expect(normalizeNodule({ x: 511, y: 255, z: 29 }, metadata)).toEqual([1, 1, 0]);
  });
  it("rejects a coordinate outside the source volume", () => {
    expect(() => normalizeNodule({ x: 512, y: 0, z: 0 }, metadata)).toThrow();
    expect(() => normalizeNodule({ x: 0, y: 0, z: 30 }, metadata)).toThrow();
  });
});
