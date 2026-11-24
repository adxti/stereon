import * as THREE from 'three'

/**
 * X-ray style cortex: transparency rises toward the silhouette so the outline
 * and sulcal relief read against black while deep structures stay visible.
 * Plain alpha blending, grey only; no additive blending or bloom.
 */
export function createCortexMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide,
    uniforms: {
      uTone: { value: new THREE.Color('#bdbdbd') },
      uLight: { value: new THREE.Vector3(0.35, 0.5, 0.8).normalize() },
    },
    vertexShader: /* glsl */ `
      attribute float aGroove;
      varying vec3 vNormal;
      varying vec3 vView;
      varying float vGroove;
      void main() {
        vGroove = aGroove;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vView = -mv.xyz;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uTone;
      uniform vec3 uLight;
      varying vec3 vNormal;
      varying vec3 vView;
      varying float vGroove;
      void main() {
        vec3 n = normalize(vNormal);
        vec3 v = normalize(vView);
        float facing = abs(dot(n, v));
        // Tighter rim falloff gives a crisper silhouette; higher floor gives body.
        float rim = pow(1.0 - facing, 1.7);
        float diffuse = 0.5 + 0.5 * max(dot(n, uLight), 0.0);
        // Sulci drawn as grey lines across the face, not only at the rim.
        float sulcus = smoothstep(0.3, 0.7, vGroove);
        vec3 col = mix(uTone * diffuse, vec3(1.0), 0.35 * rim);
        float alpha = clamp(0.1 + 0.8 * rim + 0.32 * sulcus, 0.0, 0.95);
        gl_FragColor = vec4(col, alpha);
      }
    `,
  })
}

/**
 * Screen-space diagonal hatching for structures in a risk tier.
 * period: pixels between hatch lines (smaller = denser).
 */
export function createHatchMaterial(period: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
    uniforms: { uPeriod: { value: period } },
    vertexShader: /* glsl */ `
      void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform float uPeriod;
      void main() {
        float d = mod(gl_FragCoord.x + gl_FragCoord.y, uPeriod);
        if (d > 1.25) discard;
        gl_FragColor = vec4(1.0);
      }
    `,
  })
}
