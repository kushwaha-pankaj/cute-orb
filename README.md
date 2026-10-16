# Cute ORB

3D mascot playground for Cute ORB — Blender assets, inspiration references, and a React + Three.js web studio.

## Contents

| Path | Description |
|---|---|
| `inspiration/` | Reference images (green blob, sheep, and other mascot concepts) |
| `mascot/green-blob/` | Blender project, build script, GLB, and preview renders |
| `visage/` | Visage Studio web app (React + Three.js + Vite) |

## Visage Studio

```bash
cd visage
npm install
npm run dev
```

- **Experiment 001** — reactive particle presence  
- **Experiment 002** — Green Blob GLB mascot with expressions and face controls  

## Green Blob (Blender)

```bash
cd mascot/green-blob
blender --background --factory-startup --python build_green_blob.py
```

Requires Blender 5.x. Rebuilds `green_blob.blend`, `green_blob.glb`, and preview PNGs.
