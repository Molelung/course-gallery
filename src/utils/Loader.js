// Loader.js — 资源加载工具
// 包括：GLTFLoader、RGBELoader、TextureLoader

import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js'

const gltfLoader = new GLTFLoader()
const rgbeLoader = new RGBELoader()
const textureLoader = new THREE.TextureLoader()

// 加载 GLTF/GLB 模型
export function loadGLTF(path) {
  return new Promise((resolve, reject) => {
    gltfLoader.load(
      path,
      (gltf) => resolve(gltf),
      (progress) => {
        const percent = (progress.loaded / progress.total) * 100
        console.log(`Loading model: ${percent.toFixed(0)}%`)
      },
      (error) => reject(error)
    )
  })
}

// 加载 HDR 环境贴图
export function loadHDR(path) {
  return new Promise((resolve, reject) => {
    rgbeLoader.load(
      path,
      (texture) => resolve(texture),
      undefined,
      (error) => reject(error)
    )
  })
}

// 加载普通贴图
export function loadTexture(path) {
  return new Promise((resolve, reject) => {
    textureLoader.load(
      path,
      (texture) => resolve(texture),
      undefined,
      (error) => reject(error)
    )
  })
}
