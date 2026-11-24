import { useEffect, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { prepareBrainGeometry } from './brainGeometry'
import { createCortexMaterial } from './materials'

/** Anatomical mesh, pre-baked into RAS millimetres by scripts/prepare-brain.mjs. */
export const BRAIN_MODEL_URL = `${import.meta.env.BASE_URL}models/brain.glb`

/** The anatomical brain (cerebrum, cerebellum, brainstem) drawn in the x-ray style. */
export function Brain() {
  const { scene } = useGLTF(BRAIN_MODEL_URL, false)
  const { geometry, material } = useMemo(() => {
    let source: THREE.BufferGeometry | null = null
    scene.traverse((o) => {
      if (!source && (o as THREE.Mesh).isMesh) source = (o as THREE.Mesh).geometry
    })
    if (!source) throw new Error('Brain model contains no mesh')
    return { geometry: prepareBrainGeometry(source), material: createCortexMaterial() }
  }, [scene])

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  return <mesh geometry={geometry} material={material} renderOrder={2} />
}

useGLTF.preload(BRAIN_MODEL_URL, false)
