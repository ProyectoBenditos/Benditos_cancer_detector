---
name: medical-volume-rendering
description: Clinical-grade 3D volumetric raymarching in Three.js and MONAI anatomical segmentation for thoracic CT. Enforces GPU-accelerated texture atlas/3D textures, Transfer Functions, Lung Windowing (-600/1500 HU), and lobar masks.
---

# Medical Volume Rendering & 3D Anatomical Digital Twin

This skill provides guidelines and patterns for rendering volumetric medical CT/MRI datasets in the browser using Three.js (WebGL Raymarching) and integrating AI-segmented anatomical masks (MONAI / TotalSegmentator).

## 1. WebGL Raymarching Architecture (Reverse-Engineered Pattern)

Rather than generating heavy polygon meshes (e.g., via Marching Cubes with millions of triangles), volumetric raymarching evaluates continuous density and color along view rays casting through a 3D bounding box:

```
Camera Ray R(t) = O + t * D
               │
               ▼
┌─────────────────────────────────┐
│     Bounding Box [-0.5, 0.5]³   │
│   ┌─────────────────────────┐   │
│   │ Step 0: sample(u,v,w)   │   │  Accumulate:
│   │ Step 1: sample(u,v,w)   │   │  C_accum += (1.0 - A_accum) * C_sample * A_sample
│   │ ...                     │   │  Exit early if A_accum >= 0.98
│   │ Step N: sample(u,v,w)   │   │
│   └─────────────────────────┘   │
└─────────────────────────────────┘
```

### Slice Stacking & Texture Atlas
For compatibility with standard WebGL 1/2 contexts:
- **Option A (2D Texture Atlas):** High-slice CT series (e.g., 160 slices of $256 \times 256$) are tiled into a single $4096 \times 2560$ grid image. Slice $z$ is addressed by computing `(slice_x, slice_y)`.
- **Option B (Three.js `Data3DTexture`):** Direct upload of uint8 scalar arrays $[D, H, W]$. Ideal for browser generation directly from unpacked DICOM series.

### Transfer Function (TF) & Hounsfield Windowing
Medical CT values range from $-1000$ HU (air) to $+1000+$ HU (bone).
For lung parenchymal visualization:
- **Window Center (Level):** $-600$ HU
- **Window Width:** $1500$ HU
- In normalized $[0, 1]$ texture space, densities map via smoothstep transfer functions:
  - Air / Lung parenchyma: Low opacity, dark blue/gray
  - Soft tissue / Ground glass / Nodule: Medium opacity, salmon / cerise (`#D4004F`)
  - Bone / Calcification: High opacity, bright ivory

## 2. MONAI Anatomical Masking & Respiratory Excursion

1. **5-Lobe Segmentation:**
   - Right Upper (RUL), Right Middle (RML), Right Lower (RLL)
   - Left Upper (LUL), Left Lower (LLL)
   - Segmented via MONAI / TotalSegmentator and mapped to integer channel masks (RGB/A).
2. **Interactive Slice Clipping:**
   - Axial, Sagittal, and Coronal orthogonal cutting planes with synchronized position indicators.
3. **Physiological Dynamic Motion ($\Delta z$ excursion):**
   - Diaphragm excursion modelled via non-rigid vertical offset $z' = z + A \cdot \sin(\omega t) \cdot (1 - \text{relative\_height})$.

## 3. Radiologist Interface Standards
- Maintain full 60 FPS on integrated GPUs (render scale adaptive fallback).
- Provide cross-sectional MPR (Multi-Planar Reconstruction) synced with the 3D volume view.
- Color coding consistent with OncoScan clinical theme (`#012641` base, `#D4004F` nodule alert).
