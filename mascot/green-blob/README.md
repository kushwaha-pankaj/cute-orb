# Green Blob Mascot — Blender Project

High-fidelity 3D character model of the Green Blob mascot for Cute ORB.

## Visual References
- **Primary Reference (Authoritative):** `../../inspiration/playful-green-blob-mascot.png`
- **Technical Reference Sheet:** `../../inspiration/green-blob-technical-sheet.jpg`  
  *(Note: The original hero image is the primary visual reference. Side and rear views on the technical sheet are inferred interpretations, and sheet dimensions are treated as illustrative rather than measured.)*

## Open or Rebuild

Open directly in Blender:
```bash
blender green_blob.blend
```

Or rebuild from scratch via the procedural script:
```bash
blender --background --factory-startup --python build_green_blob.py
```

## Scene Organisation

| Collection | Contents |
|---|---|
| `GreenBlob_Mascot` → `01_Character` → `Body_Parts` | `GEO_Body`, `GEO_Bump_Front`, `GEO_Bump_Mid`, `GEO_Bump_Back`, `GEO_Arm_L`, `GEO_Arm_R`, `GEO_Foot_L`, `GEO_Foot_R` |
| `GreenBlob_Mascot` → `01_Character` → `Face_Parts` | `GEO_Eye_L`, `GEO_Eye_R`, `GEO_Pupil_L`, `GEO_Pupil_R`, `GEO_Mouth_Cavity`, `GEO_Tongue` |
| `GreenBlob_Mascot` → `02_Cameras` | `CAM_Ortho_Front`, `CAM_Ortho_Back`, `CAM_Ortho_Left`, `CAM_Ortho_Right`, `CAM_Ortho_Top`, `CAM_ThreeQuarter_Persp`, `CAM_Hero_Front` |
| `GreenBlob_Mascot` → `03_Lights` | `LIGHT_Key`, `LIGHT_Rim`, `LIGHT_Fill`, `LIGHT_Top` |
| `GreenBlob_Mascot` → `04_Environment` | `ENV_Studio_Cyclorama` |

All character meshes are parented to `CTRL_GreenBlob_Root` (located at the world origin `(0, 0, 0)`) and use clean, pole-free all-quad base topology with live **Subdivision Surface** (`SUBSURF`) modifiers (`levels=2`, `render_levels=3`).

## Principled BSDF Materials

| Material | Hex / Texture | Roughness | Surface Notes |
|---|---|---|---|
| `M_Body_Green` | `#228848` → `#5AD636` (`#55D46A` sRGB tone) | `0.45` | Soft matte green skin with normal-X studio shading blend & subtle subsurface scattering |
| `M_Eye_White` | `#FAF8F2` (`#FFFFFF` highlight) | `0.09` | Glossy white sclera with clear coat |
| `M_Pupil_Black` | `TEX_Pupil_Iris` (`#3D5358` iris + `#090B0C` core + `#FFFFFF` catchlights) | `0.85` | Packed 512×256 procedural iris/pupil texture with exact twin catchlights |
| `M_Tongue_Pink` | `#FF6860` (`#F36A6A` tone) | `0.24` | Slightly glossy warm coral-pink tongue with subsurface scattering |
| `M_Mouth_Interior` | `#090303` (`#1A0F0F`) | `0.92` | Deep matte dark mouth cavity |
| `M_Studio_Backdrop` | `TEX_Studio_Backdrop` | `0.90` | Matte green studio cyclorama with horizon glow, floor contact shadow, and back-camera ray transparency |

## Shape Keys (on `GEO_Body`)
- `Basis`
- `mouthOpen`
- `blink`

## Deliverables
- `green_blob.blend` — Organized, editable Blender 5.1 project with meshes, modifiers, materials, lights, and cameras
- `green_blob.glb` — Web-ready glTF binary export of the character hierarchy
- `preview.png` — Hero perspective render matching the primary reference
- `preview_views.png` — Multi-angle orthographic + three-quarter turnaround render sheet
- `build_green_blob.py` — Reproducible Blender Python build script
