export const VOLUME_VERTEX_SHADER = `
precision highp float;
uniform vec3 uCameraLocal;
varying vec3 vDirection;
void main() {
    vDirection = position - uCameraLocal;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const VOLUME_FRAGMENT_SHADER = `
precision highp float;
varying vec3 vDirection;
uniform vec3 uCameraLocal;
uniform sampler2D uAtlas;
uniform sampler2D uLobeAtlas;
uniform sampler2D uHeatAtlas;
uniform bool uHasLobeMask;
uniform bool uHeatmapEnabled;
uniform float uHeatmapOpacity;
uniform float uHeatmapThreshold;
uniform float uNumSlices;
uniform vec2 uGrid;
uniform vec2 uTileSize;
uniform vec3 uVolumeScale;
uniform vec3 uVoxelStep;
uniform int uSteps;
uniform float uDensityScale;
uniform vec3 uClipPlanes;
uniform float uExcursion;
uniform bool uLobeMode;
uniform bool uHasNodule;
uniform vec3 uNodulePos;
uniform float uNoduleRadius;
uniform vec3 uCerise;

vec2 hitBox(vec3 origin, vec3 direction) {
    vec3 safeDir = mix(vec3(0.000001), direction, step(vec3(0.000001), abs(direction)));
    vec3 a = (vec3(-0.5) - origin) / safeDir;
    vec3 b = (vec3(0.5) - origin) / safeDir;
    vec3 lo = min(a, b), hi = max(a, b);
    return vec2(max(max(lo.x, lo.y), lo.z), min(min(hi.x, hi.y), hi.z));
}

vec3 sourcePosition(vec3 pos) {
    // Optional illustrative motion, off by default. The same warp is used by
    // intensities and label masks; it is not measured respiratory excursion.
    pos.y += uExcursion * (1.0 - pos.y);
    return clamp(pos, 0.0, 1.0);
}

vec2 atlasUV(float slice, vec3 pos) {
    vec2 tile = vec2(mod(slice, uGrid.x), floor(slice / uGrid.x));
    // Sample between voxel centres, never between neighbouring atlas tiles.
    vec2 pixel = vec2(0.5) + vec2(pos.x, 1.0 - pos.z) * (uTileSize - 1.0);
    return (tile + pixel / uTileSize) / uGrid;
}

float sampleVolume(vec3 pos) {
    pos = sourcePosition(pos);
    float slice = pos.y * (uNumSlices - 1.0);
    float s0 = floor(slice), s1 = min(s0 + 1.0, uNumSlices - 1.0);
    return mix(texture2D(uAtlas, atlasUV(s0, pos)).r,
               texture2D(uAtlas, atlasUV(s1, pos)).r, fract(slice));
}

float lobeLabel(vec3 pos) {
    vec3 source = sourcePosition(pos);
    float slice = floor(source.y * (uNumSlices - 1.0) + 0.5);
    return floor(texture2D(uLobeAtlas, atlasUV(slice, source)).r * 255.0 + 0.5);
}

float sampleHeat(vec3 pos) {
    vec3 source = sourcePosition(pos);
    float slice = source.y * (uNumSlices - 1.0);
    float s0 = floor(slice), s1 = min(s0 + 1.0, uNumSlices - 1.0);
    return mix(texture2D(uHeatAtlas, atlasUV(s0, source)).r,
               texture2D(uHeatAtlas, atlasUV(s1, source)).r, fract(slice));
}

vec3 densityGradient(vec3 pos) {
    vec3 dx = vec3(uVoxelStep.x, 0.0, 0.0);
    vec3 dy = vec3(0.0, uVoxelStep.y, 0.0);
    vec3 dz = vec3(0.0, 0.0, uVoxelStep.z);
    vec3 gradient = vec3(sampleVolume(pos + dx) - sampleVolume(pos - dx),
                         sampleVolume(pos + dy) - sampleVolume(pos - dy),
                         sampleVolume(pos + dz) - sampleVolume(pos - dz));
    // Derivatives in physical space, including unequal in-plane spacing and
    // the original field of view after atlas downsampling.
    return gradient / (2.0 * uVoxelStep * uVolumeScale);
}

vec3 lobeColor(float label, vec3 natural) {
    // Integer label contract: 0=background, 1=RUL, 2=RML, 3=RLL, 4=LUL, 5=LLL.
    if (label == 1.0) return vec3(0.04, 0.30, 0.78);
    if (label == 2.0) return vec3(0.02, 0.55, 0.13);
    if (label == 3.0) return vec3(0.90, 0.35, 0.01);
    if (label == 4.0) return vec3(0.08, 0.57, 0.65);
    if (label == 5.0) return vec3(0.29, 0.08, 0.68);
    return natural;
}

vec4 transferFunction(float density, vec3 pos) {
    // The API encodes [-1350,+150] HU in an 8-bit linear scalar PNG.
    // Do not apply a second window or sRGB decoding to this texture.
    float hu = density * 1500.0 - 1350.0;
    float label = 0.0;
    if (uHasLobeMask) {
        label = lobeLabel(pos);
        if (label < 0.5 || label > 5.5) return vec4(0.0);
    }
    float lung = smoothstep(-970.0, -820.0, hu) * (1.0 - smoothstep(-450.0, -200.0, hu));
    float structure = smoothstep(-850.0, -500.0, hu);
    vec3 color = mix(vec3(0.065, 0.15, 0.21), vec3(0.38, 0.57, 0.65), structure);
    float extinction = lung * mix(2.0, 9.0, structure) * uDensityScale;
    if (uHasLobeMask) {
        // Dense vessels inside a real lung mask remain visible. The mask
        // excludes chest wall, mediastinum and the procedural torso envelope.
        float vessels = smoothstep(-650.0, -100.0, hu);
        color = mix(color, vec3(0.78, 0.83, 0.85), vessels);
        extinction += vessels * 8.0 * uDensityScale;
    }
    if (uLobeMode) {
        color = lobeColor(label, color);
    }
    if (uHeatmapEnabled) {
        float activation = sampleHeat(pos);
        float strength = smoothstep(uHeatmapThreshold, min(1.0, uHeatmapThreshold + 0.25), activation);
        vec3 thermal = mix(vec3(1.0, 0.50, 0.05), uCerise, smoothstep(0.35, 0.85, activation));
        color = mix(color, thermal, strength * uHeatmapOpacity);
        extinction += strength * uHeatmapOpacity * 12.0;
    }
    // An explicit localization is an overlay, not a segmentation. Never infer
    // malignancy or location from a density threshold or an arbitrary quadrant.
    if (uHasNodule) {
        float distanceToNodule = length((sourcePosition(pos) - uNodulePos) * uVolumeScale);
        float focus = 1.0 - smoothstep(uNoduleRadius * 0.75, uNoduleRadius, distanceToNodule);
        focus *= smoothstep(-750.0, -400.0, hu);
        color = mix(color, uCerise, focus);
        extinction = mix(extinction, 100.0 * uDensityScale, focus);
    }
    return vec4(color, extinction);
}

void main() {
    vec3 rayDir = normalize(vDirection);
    vec2 bounds = hitBox(uCameraLocal, rayDir);
    bounds.x = max(bounds.x, 0.0);
    if (bounds.x >= bounds.y) discard;
    float stepSize = 1.732051 / float(uSteps);
    float physicalStep = length(rayDir * uVolumeScale) * stepSize;
    vec3 viewDir = -normalize(rayDir * uVolumeScale);
    vec3 lightDir = normalize(viewDir + vec3(-0.35, 0.65, 0.25));
    vec3 halfway = normalize(lightDir + viewDir);
    vec4 accum = vec4(0.0);
    // A midpoint sample avoids placing an opaque layer on the box face.
    float t = bounds.x + stepSize * 0.5;
    for (int i = 0; i < 256; i++) {
        if (i >= uSteps || t > bounds.y || accum.a >= 0.98) break;
        vec3 modelPos = uCameraLocal + t * rayDir;
        if (all(lessThanEqual(modelPos, uClipPlanes))) {
            vec3 pos = modelPos + 0.5;
            vec4 sampleColor = transferFunction(sampleVolume(pos), pos);
            if (sampleColor.a > 0.01) {
                vec3 gradient = densityGradient(pos);
                float magnitude = length(gradient);
                float illumination = 1.0;
                float specular = 0.0;
                if (magnitude > 0.0001) {
                    vec3 normal = gradient / magnitude;
                    if (dot(normal, viewDir) < 0.0) normal = -normal;
                    float confidence = smoothstep(0.02, 0.3, magnitude);
                    illumination = mix(1.0, 0.30 + 0.70 * max(dot(normal, lightDir), 0.0), confidence);
                    specular = 0.10 * confidence * pow(max(dot(normal, halfway), 0.0), 24.0);
                }
                // Beer-Lambert opacity: invariant to sample count and viewing direction.
                float alpha = 1.0 - exp(-sampleColor.a * physicalStep);
                vec3 lit = sampleColor.rgb * illumination + vec3(specular);
                accum.rgb += (1.0 - accum.a) * lit * alpha;
                accum.a += (1.0 - accum.a) * alpha;
            }
        }
        t += stepSize;
    }
    if (accum.a < 0.005) discard;
    // Three's normal alpha blending expects straight, not premultiplied, color.
    gl_FragColor = vec4(accum.rgb / accum.a, accum.a);
    #include <colorspace_fragment>
}
`;
