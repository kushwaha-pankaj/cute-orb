"""
High-fidelity Green Blob mascot — Exact Reference-Matched Blender Build Script.

Primary reference: inspiration/playful-green-blob-mascot.png
Technical sheet:   inspiration/green-blob-technical-sheet.jpg
(Side/rear views on the sheet are inferred interpretations — front silhouette is authoritative.
Dimensions on the reference sheet are illustrative rather than measured.)
"""
from __future__ import annotations

import math
import os
from pathlib import Path

import bmesh
import bpy
from mathutils import Vector

OUT = Path("/home/pkushwaha/Cursor WorkSpace2026/Open Source Project/Cute ORB/mascot/green-blob")

# Camera projection constants for CAM_Hero_Front:
# Camera at (0.0, -4.60, 0.90), looking along +Y (rotation=(90deg, 0, 0)), lens=60mm, sensor=36mm.
CAM_Y = -4.60
CAM_Z = 0.90
FOV_TAN = 36.0 / 60.0  # 0.60


def srgb_to_linear(c: float) -> float:
    if c <= 0.04045:
        return c / 12.92
    return ((c + 0.055) / 1.055) ** 2.4


def hex_rgba(h: str, alpha: float = 1.0) -> tuple[float, float, float, float]:
    h = h.lstrip("#")
    r, g, b = int(h[0:2], 16) / 255.0, int(h[2:4], 16) / 255.0, int(h[4:6], 16) / 255.0
    return (srgb_to_linear(r), srgb_to_linear(g), srgb_to_linear(b), alpha)


def img_to_world_xz(x_img: float, z_img: float, y_world: float = 0.0) -> tuple[float, float]:
    """Convert normalized image coordinates (x_img, z_img) in [0,1]^2 at depth y_world to world (X, Z)."""
    d = y_world - CAM_Y
    span = FOV_TAN * d
    x = (x_img - 0.5) * span
    z = CAM_Z + (z_img - 0.5) * span
    return x, z


def piecewise_linear(t: float, pts: list[tuple[float, float]]) -> float:
    if t <= pts[0][0]:
        return pts[0][1]
    if t >= pts[-1][0]:
        return pts[-1][1]
    for i in range(len(pts) - 1):
        t0, v0 = pts[i]
        t1, v1 = pts[i + 1]
        if t0 <= t <= t1:
            u = (t - t0) / max(1e-9, t1 - t0)
            return v0 + u * (v1 - v0)
    return pts[-1][1]


def clear_scene() -> None:
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for coll in (
        bpy.data.meshes,
        bpy.data.materials,
        bpy.data.lights,
        bpy.data.cameras,
        bpy.data.curves,
        bpy.data.collections,
    ):
        if coll == bpy.data.collections:
            for c in list(coll):
                if c.name != "Collection":
                    coll.remove(c)
            continue
        for block in list(coll):
            try:
                coll.remove(block)
            except Exception:
                pass


def ensure_collection(name: str, parent: bpy.types.Collection | None = None) -> bpy.types.Collection:
    if name in bpy.data.collections:
        col = bpy.data.collections[name]
    else:
        col = bpy.data.collections.new(name)
        (parent or bpy.context.scene.collection).children.link(col)
    return col


def link_to(obj: bpy.types.Object, col: bpy.types.Collection) -> None:
    for c in list(obj.users_collection):
        c.objects.unlink(obj)
    col.objects.link(obj)


def smooth_shade(obj: bpy.types.Object) -> None:
    for p in obj.data.polygons:
        p.use_smooth = True


def add_subsurf(obj: bpy.types.Object, viewport_levels: int = 2, render_levels: int = 3) -> bpy.types.Modifier:
    mod = obj.modifiers.new("Subdivision", "SUBSURF")
    mod.levels = viewport_levels
    mod.render_levels = render_levels
    mod.uv_smooth = "PRESERVE_BOUNDARIES"
    return mod


def parent_keep(child: bpy.types.Object, parent: bpy.types.Object) -> None:
    child.parent = parent
    child.matrix_parent_inverse = parent.matrix_world.inverted()


def create_quad_sphere_bmesh(radius: float = 1.0, subdivisions: int = 3) -> bmesh.types.BMesh:
    """Create an all-quad spherified cube bmesh (zero poles, clean Catmull-Clark topology)."""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=2.0)
    for _ in range(subdivisions):
        bmesh.ops.subdivide_edges(
            bm,
            edges=bm.edges[:],
            cuts=1,
            use_grid_fill=True,
            smooth=0.0,
        )
    bm.verts.ensure_lookup_table()
    for v in bm.verts:
        v.co = v.co.normalized() * radius
    return bm


def bmesh_to_object(
    bm: bmesh.types.BMesh,
    name: str,
    location: tuple[float, float, float],
    material: bpy.types.Material,
    col: bpy.types.Collection,
    subsurf_levels: tuple[int, int] = (2, 3),
    recalc_normals: bool = True,
) -> bpy.types.Object:
    mesh = bpy.data.meshes.new(name)
    if recalc_normals:
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    obj.location = location
    obj.data.materials.append(material)
    link_to(obj, col)
    add_subsurf(obj, subsurf_levels[0], subsurf_levels[1])
    smooth_shade(obj)
    return obj


def make_materials() -> dict[str, bpy.types.Material]:
    """
    Create Principled BSDF materials calibrated to match both the technical sheet
    and the primary reference lighting & surface appearance.
    """
    mats = {}

    # 1. Body Material: soft matte green skin (#55D46A / #34A853 shadow tone)
    # Uses normal-X shading blend so shaded left/lower belly is rich emerald (#1B8244)
    # and right lit cheek is warm chartreuse-lime (#5AD640).
    m_body = bpy.data.materials.new("M_Body_Green")
    nt = m_body.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    geom_b = nt.nodes.new("ShaderNodeNewGeometry")
    sep_b = nt.nodes.new("ShaderNodeSeparateXYZ")
    map_b = nt.nodes.new("ShaderNodeMapRange")
    map_b.inputs["From Min"].default_value = -0.35
    map_b.inputs["From Max"].default_value = 0.70
    map_b.inputs["To Min"].default_value = 0.0
    map_b.inputs["To Max"].default_value = 1.0
    mix_b = nt.nodes.new("ShaderNodeMix")
    mix_b.data_type = "RGBA"
    mix_b.inputs["A"].default_value = hex_rgba("#228848")
    mix_b.inputs["B"].default_value = hex_rgba("#5AD636")
    nt.links.new(geom_b.outputs["Normal"], sep_b.inputs["Vector"])
    nt.links.new(sep_b.outputs["X"], map_b.inputs["Value"])
    nt.links.new(map_b.outputs["Result"], mix_b.inputs["Factor"])
    nt.links.new(mix_b.outputs["Result"], bsdf.inputs["Base Color"])

    bsdf.inputs["Roughness"].default_value = 0.45
    for k in ("Specular IOR Level", "Specular"):
        if k in bsdf.inputs:
            bsdf.inputs[k].default_value = 0.15
            break
    if "Subsurface Weight" in bsdf.inputs:
        bsdf.inputs["Subsurface Weight"].default_value = 0.06
    if "Subsurface Scale" in bsdf.inputs:
        bsdf.inputs["Subsurface Scale"].default_value = 0.03
    if "Subsurface Radius" in bsdf.inputs:
        bsdf.inputs["Subsurface Radius"].default_value = (0.22, 0.85, 0.28)
    if "Emission Color" in bsdf.inputs:
        bsdf.inputs["Emission Color"].default_value = hex_rgba("#1E7A48")
        bsdf.inputs["Emission Strength"].default_value = 0.03
    mats["body"] = m_body

    # 2. Eye White Material: glossy white sclera (#FFFFFF, roughness ~0.08)
    m_eye = bpy.data.materials.new("M_Eye_White")
    bsdf_e = m_eye.node_tree.nodes["Principled BSDF"]
    bsdf_e.inputs["Base Color"].default_value = hex_rgba("#FAF8F2")
    bsdf_e.inputs["Roughness"].default_value = 0.09
    for k in ("Specular IOR Level", "Specular"):
        if k in bsdf_e.inputs:
            bsdf_e.inputs[k].default_value = 0.50
            break
    if "Coat Weight" in bsdf_e.inputs:
        bsdf_e.inputs["Coat Weight"].default_value = 0.35
        bsdf_e.inputs["Coat Roughness"].default_value = 0.03
    if "Emission Color" in bsdf_e.inputs:
        bsdf_e.inputs["Emission Color"].default_value = hex_rgba("#F2F0EA")
        bsdf_e.inputs["Emission Strength"].default_value = 0.12
    mats["eye"] = m_eye

    # 3. Pupil Material: dark slate-teal iris ring + jet-black pupil core + twin crisp white catchlights
    # UV-mapped directly from image coordinates (x_img, z_img) so both pupils match the reference pixel-for-pixel!
    m_pupil = bpy.data.materials.new("M_Pupil_Black")
    nt_p = m_pupil.node_tree
    bsdf_p = nt_p.nodes["Principled BSDF"]
    bsdf_p.inputs["Roughness"].default_value = 0.85
    for k in ("Specular IOR Level", "Specular"):
        if k in bsdf_p.inputs:
            bsdf_p.inputs[k].default_value = 0.0
            break

    # Create 512x256 packed image texture:
    # Left half (u_tex in [0, 0.5]) -> Left Pupil (x_img in [0.415, 0.510], z_img in [0.642, 0.705])
    # Right half (u_tex in [0.5, 1.0]) -> Right Pupil (x_img in [0.598, 0.676], z_img in [0.610, 0.678])
    W_T, H_T = 512, 256
    img_p = bpy.data.images.new("TEX_Pupil_Iris", width=W_T, height=H_T, alpha=False)
    pixels = [0.0] * (W_T * H_T * 4)
    iris_col = hex_rgba("#3D5358")
    core_col = hex_rgba("#090B0C")
    hi_col = hex_rgba("#FFFFFF")

    ca_r, sa_r = math.cos(math.radians(35)), math.sin(math.radians(35))
    ca_l, sa_l = math.cos(math.radians(18)), math.sin(math.radians(18))

    for py in range(H_T):
        vf = py / (H_T - 1.0)
        for px in range(W_T):
            uf = px / (W_T - 1.0)
            if uf < 0.5:
                # Left pupil image coords
                ul = uf * 2.0
                xi = 0.415 + ul * (0.510 - 0.415)
                zi = 0.642 + vf * (0.705 - 0.642)
                # Core centered at (0.471, 0.676), tilted -18 deg
                dx = xi - 0.471
                dz = zi - 0.676
                rx = (dx * ca_l - dz * sa_l) / 0.025
                rz = (dx * sa_l + dz * ca_l) / 0.019
                r_core = math.hypot(rx, rz)
                # Primary upper catchlight at (0.4725, 0.6810), rx=0.0110, rz=0.0075
                d_hi1 = math.hypot((xi - 0.4725) / 0.0110, (zi - 0.6810) / 0.0075)
                # Secondary lower-right catchlight at (0.4955, 0.6515), rx=0.0052, rz=0.0050
                d_hi2 = math.hypot((xi - 0.4955) / 0.0052, (zi - 0.6515) / 0.0050)
            else:
                # Right pupil image coords
                ur = (uf - 0.5) * 2.0
                xi = 0.598 + ur * (0.676 - 0.598)
                zi = 0.610 + vf * (0.678 - 0.610)
                # Core centered at (0.641, 0.645), tilted -35 deg
                dx = xi - 0.641
                dz = zi - 0.645
                rx = (dx * ca_r - dz * sa_r) / 0.019
                rz = (dx * sa_r + dz * ca_r) / 0.025
                r_core = math.hypot(rx, rz)
                # Primary upper catchlight at (0.6305, 0.6582), rx=0.0108, rz=0.0080
                d_hi1 = math.hypot((xi - 0.6305) / 0.0108, (zi - 0.6582) / 0.0080)
                # Secondary lower-right catchlight at (0.6600, 0.6355), rx=0.0045, rz=0.0045
                d_hi2 = math.hypot((xi - 0.6600) / 0.0045, (zi - 0.6355) / 0.0045)

            t_iris = max(0.0, min(1.0, (r_core - 0.85) / 0.22))
            cr = core_col[0] * (1.0 - t_iris) + iris_col[0] * t_iris
            cg = core_col[1] * (1.0 - t_iris) + iris_col[1] * t_iris
            cb = core_col[2] * (1.0 - t_iris) + iris_col[2] * t_iris

            w_hi1 = max(0.0, min(1.0, (1.0 - d_hi1) / 0.16))
            w_hi2 = max(0.0, min(1.0, (1.0 - d_hi2) / 0.20))
            w_hi = max(w_hi1, w_hi2 * 0.95)

            cr = cr * (1.0 - w_hi) + hi_col[0] * w_hi
            cg = cg * (1.0 - w_hi) + hi_col[1] * w_hi
            cb = cb * (1.0 - w_hi) + hi_col[2] * w_hi

            idx = (py * W_T + px) * 4
            pixels[idx] = cr
            pixels[idx + 1] = cg
            pixels[idx + 2] = cb
            pixels[idx + 3] = 1.0
    img_p.pixels = pixels
    img_p.pack()

    uv_node = nt_p.nodes.new("ShaderNodeUVMap")
    tex_node = nt_p.nodes.new("ShaderNodeTexImage")
    tex_node.image = img_p
    tex_node.extension = "EXTEND"
    nt_p.links.new(uv_node.outputs["UV"], tex_node.inputs["Vector"])
    nt_p.links.new(tex_node.outputs["Color"], bsdf_p.inputs["Base Color"])
    if "Emission Color" in bsdf_p.inputs:
        bsdf_p.inputs["Emission Strength"].default_value = 0.65
        nt_p.links.new(tex_node.outputs["Color"], bsdf_p.inputs["Emission Color"])
    mats["pupil"] = m_pupil

    # 4. Tongue Material: slightly glossy warm coral-pink (#F36A6A, roughness ~0.24)
    m_tongue = bpy.data.materials.new("M_Tongue_Pink")
    bsdf_t = m_tongue.node_tree.nodes["Principled BSDF"]
    bsdf_t.inputs["Base Color"].default_value = hex_rgba("#FF6860")
    bsdf_t.inputs["Roughness"].default_value = 0.24
    for k in ("Specular IOR Level", "Specular"):
        if k in bsdf_t.inputs:
            bsdf_t.inputs[k].default_value = 0.42
            break
    if "Coat Weight" in bsdf_t.inputs:
        bsdf_t.inputs["Coat Weight"].default_value = 0.15
        bsdf_t.inputs["Coat Roughness"].default_value = 0.08
    if "Subsurface Weight" in bsdf_t.inputs:
        bsdf_t.inputs["Subsurface Weight"].default_value = 0.12
    if "Subsurface Scale" in bsdf_t.inputs:
        bsdf_t.inputs["Subsurface Scale"].default_value = 0.03
    if "Subsurface Radius" in bsdf_t.inputs:
        bsdf_t.inputs["Subsurface Radius"].default_value = (0.95, 0.32, 0.28)
    if "Emission Color" in bsdf_t.inputs:
        bsdf_t.inputs["Emission Color"].default_value = hex_rgba("#FF786E")
        bsdf_t.inputs["Emission Strength"].default_value = 0.28
    mats["tongue"] = m_tongue

    # 5. Mouth Interior Material: deep matte dark cavity (#1A0F0F, roughness ~0.85)
    m_mouth = bpy.data.materials.new("M_Mouth_Interior")
    bsdf_m = m_mouth.node_tree.nodes["Principled BSDF"]
    bsdf_m.inputs["Base Color"].default_value = hex_rgba("#090303")
    bsdf_m.inputs["Roughness"].default_value = 0.92
    for k in ("Specular IOR Level", "Specular"):
        if k in bsdf_m.inputs:
            bsdf_m.inputs[k].default_value = 0.0
            break
    mats["mouth"] = m_mouth

    # 6. Studio Backdrop Material: matte green cyclorama with procedural studio gradient & contact shadow
    # and single-sided camera-ray transparency when viewed from behind (Incoming.Y > 0.25)
    m_bg = bpy.data.materials.new("M_Studio_Backdrop")
    nt_bg = m_bg.node_tree
    bsdf_bg = nt_bg.nodes["Principled BSDF"]
    bsdf_bg.inputs["Roughness"].default_value = 0.90
    for k in ("Specular IOR Level", "Specular"):
        if k in bsdf_bg.inputs:
            bsdf_bg.inputs[k].default_value = 0.02
            break

    # Procedural 256x256 studio cyclorama texture mapped via camera-projected UVs (u_img, v_img)
    W_B, H_B = 256, 256
    img_bg = bpy.data.images.new("TEX_Studio_Backdrop", width=W_B, height=H_B, alpha=False)
    bg_pixels = [0.0] * (W_B * H_B * 4)
    for py in range(H_B):
        v = py / (H_B - 1.0)
        for px in range(W_B):
            u = px / (W_B - 1.0)
            h_glow = math.exp(-((v - 0.24) / 0.14) ** 2)
            top_fall = max(0.0, (v - 0.24) / 0.76)
            bot_fall = max(0.0, (0.24 - v) / 0.24)
            u_warm = max(0.0, min(1.0, (u - 0.08) / 0.84))

            sr = 0.56 * (1.0 - top_fall * 0.24 - bot_fall * 0.08) + 0.14 * u_warm + 0.10 * h_glow * (0.4 + 0.6 * u_warm)
            sg = 0.78 * (1.0 - top_fall * 0.18 - bot_fall * 0.04) + 0.10 * u_warm + 0.08 * h_glow * (0.4 + 0.6 * u_warm)
            sb = 0.54 * (1.0 - top_fall * 0.20 - bot_fall * 0.05) + 0.08 * u_warm + 0.07 * h_glow * (0.4 + 0.6 * u_warm)

            # Soft studio floor cast shadow & ambient occlusion under the feet/belly (v ~ 0.150, u ~ 0.08..0.66)
            sh_cast = 0.65 * math.exp(-(((u - 0.34) / 0.26) ** 2 + ((v - 0.150) / 0.032) ** 2))
            sh_contact = 0.45 * math.exp(-(((u - 0.46) / 0.16) ** 2 + ((v - 0.154) / 0.024) ** 2))
            sh = min(0.88, sh_cast + sh_contact)

            sr = sr * (1.0 - sh * 0.88)
            sg = sg * (1.0 - sh * 0.70)
            sb = sb * (1.0 - sh * 0.82)

            # Note: img_bg is in sRGB colorspace, so Blender converts sRGB -> Linear automatically!
            idx = (py * W_B + px) * 4
            bg_pixels[idx] = max(0.02, min(0.98, sr * 0.88))
            bg_pixels[idx + 1] = max(0.02, min(0.98, sg * 0.94))
            bg_pixels[idx + 2] = max(0.02, min(0.98, sb * 0.90))
            bg_pixels[idx + 3] = 1.0
    img_bg.pixels = bg_pixels
    img_bg.pack()

    uv_bg = nt_bg.nodes.new("ShaderNodeUVMap")
    tex_bg = nt_bg.nodes.new("ShaderNodeTexImage")
    tex_bg.image = img_bg
    tex_bg.extension = "EXTEND"
    nt_bg.links.new(uv_bg.outputs["UV"], tex_bg.inputs["Vector"])
    nt_bg.links.new(tex_bg.outputs["Color"], bsdf_bg.inputs["Base Color"])
    if "Emission Color" in bsdf_bg.inputs:
        bsdf_bg.inputs["Emission Strength"].default_value = 0.35
        nt_bg.links.new(tex_bg.outputs["Color"], bsdf_bg.inputs["Emission Color"])

    out_node = nt_bg.nodes["Material Output"]
    geom_node = nt_bg.nodes.new("ShaderNodeNewGeometry")
    sep_inc = nt_bg.nodes.new("ShaderNodeSeparateXYZ")
    gt_node = nt_bg.nodes.new("ShaderNodeMath")
    gt_node.operation = "GREATER_THAN"
    gt_node.inputs[1].default_value = 0.25
    lp_node = nt_bg.nodes.new("ShaderNodeLightPath")
    math_mul = nt_bg.nodes.new("ShaderNodeMath")
    math_mul.operation = "MULTIPLY"
    transp_node = nt_bg.nodes.new("ShaderNodeBsdfTransparent")
    mix_sh = nt_bg.nodes.new("ShaderNodeMixShader")

    nt_bg.links.new(geom_node.outputs["Incoming"], sep_inc.inputs["Vector"])
    nt_bg.links.new(sep_inc.outputs["Y"], gt_node.inputs[0])
    nt_bg.links.new(gt_node.outputs["Value"], math_mul.inputs[0])
    nt_bg.links.new(lp_node.outputs["Is Camera Ray"], math_mul.inputs[1])
    nt_bg.links.new(math_mul.outputs["Value"], mix_sh.inputs["Fac"])
    nt_bg.links.new(bsdf_bg.outputs["BSDF"], mix_sh.inputs[1])
    nt_bg.links.new(transp_node.outputs["BSDF"], mix_sh.inputs[2])
    nt_bg.links.new(mix_sh.outputs["Shader"], out_node.inputs["Surface"])
    mats["bg"] = m_bg

    return mats


# Exact measured body silhouette profile (z_img, xl_img, xr_img) from playful-green-blob-mascot.png
BODY_PROFILE_PTS = [
    (0.172, 0.440, 0.560),
    (0.182, 0.378, 0.622),
    (0.195, 0.332, 0.668),
    (0.211, 0.308, 0.692),
    (0.231, 0.290, 0.700),
    (0.251, 0.273, 0.719),
    (0.272, 0.259, 0.730),
    (0.292, 0.247, 0.741),
    (0.330, 0.238, 0.750),
    (0.380, 0.234, 0.755),
    (0.430, 0.232, 0.757),
    (0.475, 0.232, 0.758),
    (0.495, 0.238, 0.755),
    (0.515, 0.245, 0.751),
    (0.535, 0.250, 0.746),
    (0.556, 0.257, 0.740),
    (0.576, 0.265, 0.735),
    (0.596, 0.272, 0.728),
    (0.617, 0.281, 0.721),
    (0.637, 0.292, 0.712),
    (0.657, 0.304, 0.704),
    (0.677, 0.319, 0.686),
    (0.698, 0.336, 0.670),
    (0.718, 0.356, 0.651),
    (0.738, 0.382, 0.625),
    (0.756, 0.412, 0.590),
    (0.768, 0.455, 0.545),
]
BODY_SUB_COMP = 0.985


def body_front_y(x_img: float, z_img: float) -> float:
    """Return the exact un-recessed front surface Y coordinate of GEO_Body at (x_img, z_img)."""
    xl_pts = [(p[0], p[1]) for p in BODY_PROFILE_PTS]
    xr_pts = [(p[0], p[2]) for p in BODY_PROFILE_PTS]
    z_bot, z_top = BODY_PROFILE_PTS[0][0], BODY_PROFILE_PTS[-1][0]
    t = max(0.0, min(1.0, (z_img - z_bot) / (z_top - z_bot)))
    xl = piecewise_linear(z_img, xl_pts)
    xr = piecewise_linear(z_img, xr_pts)
    x_mid = 0.5 * (xl + xr)
    half_w = max(0.02, 0.5 * (xr - xl) * BODY_SUB_COMP)
    ux = max(-0.96, min(0.96, (x_img - x_mid) / half_w))
    uy = -math.sqrt(max(0.04, 1.0 - ux * ux))
    w_half_world = half_w * FOV_TAN * (0.0 - CAM_Y)
    wy = uy * w_half_world * 0.90
    if t < 0.58:
        wy -= 0.04 * math.sin(math.pi * (t / 0.58)) * (-uy)
    return wy


def build_body(m_body: bpy.types.Material, col: bpy.types.Collection) -> bpy.types.Object:
    """
    Build GEO_Body using exact inverse-camera projection of the measured reference silhouette,
    with sculpted eye sockets and smiling mouth pocket on the front face.
    """
    bm = create_quad_sphere_bmesh(radius=1.0, subdivisions=4)  # 1536 quads
    bm.verts.ensure_lookup_table()

    xl_pts = [(p[0], p[1]) for p in BODY_PROFILE_PTS]
    xr_pts = [(p[0], p[2]) for p in BODY_PROFILE_PTS]
    z_bot, z_top = BODY_PROFILE_PTS[0][0], BODY_PROFILE_PTS[-1][0]
    obj_z = 0.90

    for v in bm.verts:
        x0, y0, z0 = v.co.x, v.co.y, v.co.z
        t = 0.5 * (z0 + 1.0)
        z_img = z_bot + (z_top - z_bot) * t

        xl = piecewise_linear(z_img, xl_pts)
        xr = piecewise_linear(z_img, xr_pts)
        x_mid = 0.5 * (xl + xr)
        half_w = 0.5 * (xr - xl) * BODY_SUB_COMP

        r_horiz = math.hypot(x0, y0)
        if r_horiz > 1e-5:
            ux = x0 / r_horiz
            uy = y0 / r_horiz
        else:
            ux, uy = 0.0, 0.0

        cap_scale = math.sin(math.pi * t) ** 0.18 if (t < 0.06 or t > 0.94) else 1.0
        x_img_v = x_mid + ux * half_w * cap_scale

        wx, wz = img_to_world_xz(x_img_v, z_img, y_world=0.0)
        w_half_world = half_w * FOV_TAN * (0.0 - CAM_Y)
        wy = uy * w_half_world * 0.90 * cap_scale

        if t < 0.58:
            wy -= 0.04 * math.sin(math.pi * (t / 0.58)) * max(0.0, -uy)

        # --- Sculpted Eye Sockets & Mouth Pocket on Front Face (uy < -0.25) ---
        if uy < -0.25:
            front_w = min(1.0, (-uy - 0.25) / 0.35)
            dx_l = (x_img_v - 0.4205) / 0.0845
            dz_l = (z_img - 0.6300) / 0.0700
            r2_l = dx_l * dx_l + dz_l * dz_l
            if r2_l < 1.3:
                wy += 0.10 * math.exp(-(r2_l ** 2) * 3.0) * front_w

            rx_d = x_img_v - 0.6295
            rz_d = z_img - 0.6010
            ca, sa = math.cos(math.radians(18)), math.sin(math.radians(18))
            dx_r = (rx_d * ca - rz_d * sa) / 0.0655
            dz_r = (rx_d * sa + rz_d * ca) / 0.0735
            r2_r = dx_r * dx_r + dz_r * dz_r
            if r2_r < 1.3:
                wy += 0.10 * math.exp(-(r2_r ** 2) * 3.0) * front_w

            mu = (x_img_v - 0.512) / 0.108
            if abs(mu) < 1.15:
                mu_c = max(-1.0, min(1.0, mu))
                z_up = 0.472 + 0.020 * (mu_c ** 2) - 0.008 * mu_c
                z_lo = z_up - 0.098 * ((max(0.0, 1.0 - mu_c ** 2)) ** 0.58)
                z_m_mid = 0.5 * (z_up + z_lo)
                z_m_half = max(0.008, 0.5 * (z_up - z_lo))
                mv = (z_img - z_m_mid) / z_m_half
                mr2 = mu * mu + mv * mv
                if mr2 < 1.3:
                    wy += 0.08 * math.exp(-(mr2 ** 2) * 3.0) * front_w

        v.co = Vector((wx, wy, wz - obj_z))

    body = bmesh_to_object(bm, "GEO_Body", (0.0, 0.0, obj_z), m_body, col, (2, 3))

    # Add expression shape keys on GEO_Body
    body.shape_key_add(name="Basis", from_mix=False)
    sk_mouth = body.shape_key_add(name="mouthOpen", from_mix=False)
    for i, v in enumerate(body.data.vertices):
        co = v.co
        if co.y < -0.25 and abs(co.x - 0.03) < 0.42 and -0.36 < co.z < 0.12:
            w = max(0.0, 1.0 - abs(co.x - 0.03) / 0.42)
            sk_mouth.data[i].co = Vector((co.x, co.y - 0.02 * w, co.z - 0.055 * w))

    sk_blink = body.shape_key_add(name="blink", from_mix=False)
    for i, v in enumerate(body.data.vertices):
        co = v.co
        if co.y < -0.20 and abs(co.x) < 0.55 and 0.10 < co.z < 0.62:
            sk_blink.data[i].co = Vector((co.x, co.y - 0.015, co.z - 0.03))

    return body


def build_head_bumps(m_body: bpy.types.Material, col: bpy.types.Collection) -> list[bpy.types.Object]:
    """
    Build the 3 asymmetrical head bumps matching the exact reference silhouette:
    - GEO_Bump_Front: main taller crest (z_img = 0.720..0.868)
    - GEO_Bump_Mid: smaller left-sprouting bump (z_img = 0.735..0.808)
    - GEO_Bump_Back: trailing dorsal bump behind along the crown
    """
    bumps = []

    main_pts = [
        (0.720, 0.455, 0.592),
        (0.740, 0.452, 0.590),
        (0.760, 0.449, 0.584),
        (0.780, 0.446, 0.568),
        (0.800, 0.444, 0.558),
        (0.820, 0.444, 0.546),
        (0.840, 0.446, 0.531),
        (0.856, 0.452, 0.516),
        (0.868, 0.465, 0.500),
    ]
    bm1 = create_quad_sphere_bmesh(radius=1.0, subdivisions=3)
    xl1 = [(p[0], p[1]) for p in main_pts]
    xr1 = [(p[0], p[2]) for p in main_pts]
    zb1, zt1 = main_pts[0][0], main_pts[-1][0]
    loc1_x, loc1_z = img_to_world_xz(0.50, 0.79, y_world=-0.04)
    loc1 = (loc1_x, -0.04, loc1_z)
    for v in bm1.verts:
        x0, y0, z0 = v.co.x, v.co.y, v.co.z
        t = 0.5 * (z0 + 1.0)
        z_img = zb1 + (zt1 - zb1) * t
        xl = piecewise_linear(z_img, xl1)
        xr = piecewise_linear(z_img, xr1)
        x_mid = 0.5 * (xl + xr)
        half_w = 0.5 * (xr - xl) * 0.99
        rh = math.hypot(x0, y0)
        ux, uy = (x0 / rh, y0 / rh) if rh > 1e-5 else (0.0, 0.0)
        cap = math.sin(math.pi * t) ** 0.20 if t > 0.92 else 1.0
        wx, wz = img_to_world_xz(x_mid + ux * half_w * cap, z_img, y_world=-0.04)
        wy = -0.04 + uy * (half_w * FOV_TAN * (4.60 - 0.04)) * 0.92 * cap
        v.co = Vector((wx - loc1[0], wy - loc1[1], wz - loc1[2]))
    b_main = bmesh_to_object(bm1, "GEO_Bump_Front", loc1, m_body, col, (2, 3))
    bumps.append(b_main)

    left_pts = [
        (0.735, 0.395, 0.462),
        (0.750, 0.382, 0.458),
        (0.765, 0.374, 0.454),
        (0.780, 0.371, 0.448),
        (0.795, 0.372, 0.440),
        (0.808, 0.385, 0.425),
    ]
    bm2 = create_quad_sphere_bmesh(radius=1.0, subdivisions=3)
    xl2 = [(p[0], p[1]) for p in left_pts]
    xr2 = [(p[0], p[2]) for p in left_pts]
    zb2, zt2 = left_pts[0][0], left_pts[-1][0]
    loc2_x, loc2_z = img_to_world_xz(0.41, 0.77, y_world=0.02)
    loc2 = (loc2_x, 0.02, loc2_z)
    for v in bm2.verts:
        x0, y0, z0 = v.co.x, v.co.y, v.co.z
        t = 0.5 * (z0 + 1.0)
        z_img = zb2 + (zt2 - zb2) * t
        xl = piecewise_linear(z_img, xl2)
        xr = piecewise_linear(z_img, xr2)
        x_mid = 0.5 * (xl + xr)
        half_w = 0.5 * (xr - xl) * 1.00
        rh = math.hypot(x0, y0)
        ux, uy = (x0 / rh, y0 / rh) if rh > 1e-5 else (0.0, 0.0)
        cap = math.sin(math.pi * t) ** 0.20 if t > 0.90 else 1.0
        wx, wz = img_to_world_xz(x_mid + ux * half_w * cap, z_img, y_world=0.02)
        wy = 0.02 + uy * (half_w * FOV_TAN * (4.60 + 0.02)) * 0.92 * cap
        v.co = Vector((wx - loc2[0], wy - loc2[1], wz - loc2[2]))
    b_left = bmesh_to_object(bm2, "GEO_Bump_Mid", loc2, m_body, col, (2, 3))
    bumps.append(b_left)

    bm3 = create_quad_sphere_bmesh(radius=1.0, subdivisions=3)
    for v in bm3.verts:
        x0, y0, z0 = v.co.x, v.co.y, v.co.z
        t = 0.5 * (z0 + 1.0)
        w = 0.95 - 0.25 * (t ** 1.4)
        v.co = Vector((x0 * 0.095 * w, y0 * 0.095 * w, z0 * 0.13))
    b_back = bmesh_to_object(bm3, "GEO_Bump_Back", (0.00, 0.22, 1.54), m_body, col, (2, 3))
    b_back.rotation_euler = (math.radians(-24), math.radians(-6), 0.0)
    bumps.append(b_back)

    return bumps


def build_arms(m_body: bpy.types.Material, col: bpy.types.Collection) -> tuple[bpy.types.Object, bpy.types.Object]:
    """
    Build GEO_Arm_L and GEO_Arm_R matching the exact measured outer edge and armpit crease
    from z_img = 0.308 (rounded tip) to z_img = 0.476 (shoulder blend).
    """
    arm_l_pts = [
        (0.308, 0.186, 0.214),
        (0.320, 0.170, 0.226),
        (0.333, 0.163, 0.233),
        (0.353, 0.160, 0.238),
        (0.373, 0.162, 0.242),
        (0.393, 0.171, 0.246),
        (0.414, 0.185, 0.250),
        (0.434, 0.200, 0.254),
        (0.454, 0.216, 0.258),
        (0.476, 0.234, 0.264),
    ]
    arm_r_pts = [
        (0.308, 0.768, 0.794),
        (0.320, 0.762, 0.806),
        (0.333, 0.758, 0.812),
        (0.353, 0.754, 0.817),
        (0.373, 0.750, 0.814),
        (0.393, 0.746, 0.804),
        (0.414, 0.742, 0.792),
        (0.434, 0.738, 0.777),
        (0.454, 0.734, 0.766),
        (0.476, 0.730, 0.756),
    ]

    arms = []
    for pts, name, y_off in ((arm_l_pts, "GEO_Arm_L", -0.06), (arm_r_pts, "GEO_Arm_R", -0.02)):
        bm = create_quad_sphere_bmesh(radius=1.0, subdivisions=3)
        xl_p = [(p[0], p[1]) for p in pts]
        xr_p = [(p[0], p[2]) for p in pts]
        zb, zt = pts[0][0], pts[-1][0]
        mid_x_img = 0.5 * (pts[4][1] + pts[4][2])
        loc_x, loc_z = img_to_world_xz(mid_x_img, 0.39, y_world=y_off)
        loc = (loc_x, y_off, loc_z)

        for v in bm.verts:
            x0, y0, z0 = v.co.x, v.co.y, v.co.z
            t = 0.5 * (z0 + 1.0)
            z_img = zb + (zt - zb) * t
            xl = piecewise_linear(z_img, xl_p)
            xr = piecewise_linear(z_img, xr_p)
            x_mid = 0.5 * (xl + xr)
            half_w = 0.5 * (xr - xl) * 0.96
            rh = math.hypot(x0, y0)
            ux, uy = (x0 / rh, y0 / rh) if rh > 1e-5 else (0.0, 0.0)
            cap = math.sin(math.pi * t) ** 0.20 if (t < 0.08 or t > 0.92) else 1.0
            wx, wz = img_to_world_xz(x_mid + ux * half_w * cap, z_img, y_world=y_off)
            wy = y_off + uy * 0.135 * (0.75 + 0.25 * math.sin(math.pi * t))
            v.co = Vector((wx - loc[0], wy - loc[1], wz - loc[2]))

        arm = bmesh_to_object(bm, name, loc, m_body, col, (2, 3))
        arms.append(arm)

    return arms[0], arms[1]


def build_feet(m_body: bpy.types.Material, col: bpy.types.Collection) -> tuple[bpy.types.Object, bpy.types.Object]:
    """
    Build GEO_Foot_L and GEO_Foot_R using exact measured profile tables:
    - Left Foot:  x_img in [0.293, 0.438], z_img in [0.145, 0.208]
    - Right Foot: x_img in [0.578, 0.708], z_img in [0.145, 0.208]
    """
    foot_l_pts = [
        (0.144, 0.315, 0.420),
        (0.150, 0.293, 0.436),
        (0.160, 0.291, 0.438),
        (0.172, 0.292, 0.438),
        (0.184, 0.294, 0.434),
        (0.196, 0.298, 0.422),
        (0.208, 0.312, 0.402),
    ]
    foot_r_pts = [
        (0.144, 0.595, 0.688),
        (0.150, 0.580, 0.706),
        (0.160, 0.578, 0.709),
        (0.172, 0.580, 0.710),
        (0.184, 0.582, 0.708),
        (0.196, 0.590, 0.704),
        (0.208, 0.605, 0.692),
    ]
    feet = []
    for pts, name, y_f in ((foot_l_pts, "GEO_Foot_L", -0.14), (foot_r_pts, "GEO_Foot_R", -0.12)):
        bm = create_quad_sphere_bmesh(radius=1.0, subdivisions=3)
        xl_p = [(p[0], p[1]) for p in pts]
        xr_p = [(p[0], p[2]) for p in pts]
        zb, zt = pts[0][0], pts[-1][0]
        xm = 0.5 * (pts[2][1] + pts[2][2])
        zm = 0.5 * (zb + zt)
        loc_x, loc_z = img_to_world_xz(xm, zm, y_world=y_f)
        loc = (loc_x, y_f, loc_z)

        for v in bm.verts:
            x0, y0, z0 = v.co.x, v.co.y, v.co.z
            t = 0.5 * (z0 + 1.0)
            z_img = zb + (zt - zb) * t
            xl = piecewise_linear(z_img, xl_p)
            xr = piecewise_linear(z_img, xr_p)
            x_mid = 0.5 * (xl + xr)
            half_w = 0.5 * (xr - xl) * 1.02
            rh = math.hypot(x0, y0)
            ux, uy = (x0 / rh, y0 / rh) if rh > 1e-5 else (0.0, 0.0)
            cap = math.sin(math.pi * t) ** 0.16 if (t < 0.06 or t > 0.92) else 1.0
            wx, wz = img_to_world_xz(x_mid + ux * half_w * cap, z_img, y_world=y_f)
            wy = y_f + uy * 0.18 * cap
            v.co = Vector((wx - loc[0], wy - loc[1], wz - loc[2]))

        foot = bmesh_to_object(bm, name, loc, m_body, col, (2, 3))
        feet.append(foot)

    return feet[0], feet[1]


# Exact measured row-by-row contours for Left Eye, Right Eye, Left Pupil, Right Pupil
EYE_L_PTS = [
    (0.553, 0.370, 0.436),
    (0.560, 0.356, 0.452),
    (0.566, 0.348, 0.462),
    (0.575, 0.342, 0.472),
    (0.583, 0.337, 0.481),
    (0.591, 0.335, 0.488),
    (0.600, 0.334, 0.493),
    (0.608, 0.334, 0.497),
    (0.616, 0.336, 0.500),
    (0.625, 0.337, 0.503),
    (0.633, 0.341, 0.505),
    (0.642, 0.345, 0.505),
    (0.650, 0.348, 0.505),
    (0.658, 0.356, 0.504),
    (0.667, 0.364, 0.501),
    (0.675, 0.371, 0.497),
    (0.683, 0.382, 0.490),
    (0.692, 0.399, 0.480),
    (0.703, 0.422, 0.460),
]

EYE_R_PTS = [
    (0.524, 0.632, 0.680),
    (0.530, 0.620, 0.688),
    (0.538, 0.608, 0.694),
    (0.547, 0.599, 0.696),
    (0.555, 0.590, 0.698),
    (0.564, 0.583, 0.698),
    (0.572, 0.578, 0.698),
    (0.581, 0.574, 0.698),
    (0.589, 0.570, 0.697),
    (0.598, 0.566, 0.694),
    (0.606, 0.563, 0.691),
    (0.615, 0.561, 0.687),
    (0.623, 0.560, 0.683),
    (0.632, 0.560, 0.678),
    (0.640, 0.561, 0.672),
    (0.649, 0.564, 0.665),
    (0.657, 0.568, 0.656),
    (0.666, 0.574, 0.642),
    (0.677, 0.585, 0.628),
]

PUP_L_PTS = [
    (0.646, 0.459, 0.504),
    (0.650, 0.446, 0.505),
    (0.654, 0.439, 0.505),
    (0.659, 0.433, 0.505),
    (0.663, 0.429, 0.505),
    (0.667, 0.425, 0.505),
    (0.671, 0.423, 0.505),
    (0.676, 0.423, 0.505),
    (0.680, 0.423, 0.505),
    (0.684, 0.425, 0.504),
    (0.688, 0.427, 0.501),
    (0.693, 0.431, 0.498),
    (0.697, 0.438, 0.494),
    (0.701, 0.448, 0.486),
]

PUP_R_PTS = [
    (0.614, 0.649, 0.664),
    (0.618, 0.647, 0.670),
    (0.623, 0.643, 0.671),
    (0.627, 0.633, 0.671),
    (0.631, 0.620, 0.671),
    (0.635, 0.615, 0.670),
    (0.640, 0.611, 0.668),
    (0.644, 0.609, 0.666),
    (0.648, 0.606, 0.662),
    (0.653, 0.605, 0.659),
    (0.657, 0.603, 0.656),
    (0.661, 0.603, 0.653),
    (0.665, 0.603, 0.649),
    (0.670, 0.605, 0.644),
    (0.674, 0.612, 0.638),
]


def build_eyes_and_pupils(
    m_eye: bpy.types.Material,
    m_pupil: bpy.types.Material,
    col: bpy.types.Collection,
) -> list[bpy.types.Object]:
    """
    Build GEO_Eye_L, GEO_Eye_R, GEO_Pupil_L, GEO_Pupil_R using the exact row-by-row measured
    contours from playful-green-blob-mascot.png, anchored in front of GEO_Body so their 2D
    silhouette in CAM_Hero_Front is 100% unoccluded while conforming organically in 3D.
    """
    objs = []

    # 1. Left & Right Eyes
    for pts, name, xm, zm in (
        (EYE_L_PTS, "GEO_Eye_L", 0.4205, 0.6300),
        (EYE_R_PTS, "GEO_Eye_R", 0.6295, 0.6010),
    ):
        bm = create_quad_sphere_bmesh(radius=1.0, subdivisions=3)
        xl_p = [(p[0], p[1]) for p in pts]
        xr_p = [(p[0], p[2]) for p in pts]
        zb, zt = pts[0][0], pts[-1][0]
        y_base = body_front_y(xm, zm) - 0.032
        loc_x, loc_z = img_to_world_xz(xm, zm, y_world=y_base)
        loc = (loc_x, y_base, loc_z)

        for v in bm.verts:
            x0, y0, z0 = v.co.x, v.co.y, v.co.z
            t = 0.5 * (z0 + 1.0)
            z_img = zb + (zt - zb) * t
            xl = piecewise_linear(z_img, xl_p)
            xr = piecewise_linear(z_img, xr_p)
            x_mid = 0.5 * (xl + xr)
            half_w = 0.5 * (xr - xl) * 1.03

            rh = math.hypot(x0, y0)
            ux, uy = (x0 / rh, y0 / rh) if rh > 1e-5 else (0.0, 0.0)
            cap = math.sin(math.pi * t) ** 0.16 if (t < 0.06 or t > 0.94) else 1.0
            xi = x_mid + ux * half_w * cap

            y_surf = body_front_y(xi, z_img) - 0.028
            wy = y_surf + (uy * 0.095 if uy < 0 else uy * 0.045) * cap
            wx, wz = img_to_world_xz(xi, z_img, y_world=wy)
            v.co = Vector((wx - loc[0], wy - loc[1], wz - loc[2]))

        eye_obj = bmesh_to_object(bm, name, loc, m_eye, col, (2, 3))
        objs.append(eye_obj)

    # 2. Left & Right Pupils (with exact image-space UV mapping into TEX_Pupil_Iris)
    pupil_specs = [
        (PUP_L_PTS, "GEO_Pupil_L", 0.464, 0.674, 0.0, 0.5, 0.415, 0.510, 0.642, 0.705),
        (PUP_R_PTS, "GEO_Pupil_R", 0.637, 0.644, 0.5, 1.0, 0.598, 0.676, 0.610, 0.678),
    ]
    for pts, name, xm, zm, u0_tex, u1_tex, x0_b, x1_b, z0_b, z1_b in pupil_specs:
        bm = create_quad_sphere_bmesh(radius=1.0, subdivisions=3)
        bm.verts.ensure_lookup_table()
        uv_layer = bm.loops.layers.uv.verify()

        xl_p = [(p[0], p[1]) for p in pts]
        xr_p = [(p[0], p[2]) for p in pts]
        zb, zt = pts[0][0], pts[-1][0]
        y_base = body_front_y(xm, zm) - 0.130
        loc_x, loc_z = img_to_world_xz(xm, zm, y_world=y_base)
        loc = (loc_x, y_base, loc_z)

        vert_img_coords = {}
        for v in bm.verts:
            x0, y0, z0 = v.co.x, v.co.y, v.co.z
            t = 0.5 * (z0 + 1.0)
            z_img = zb + (zt - zb) * t
            xl = piecewise_linear(z_img, xl_p)
            xr = piecewise_linear(z_img, xr_p)
            x_mid = 0.5 * (xl + xr)
            half_w = 0.5 * (xr - xl) * 1.03

            rh = math.hypot(x0, y0)
            ux, uy = (x0 / rh, y0 / rh) if rh > 1e-5 else (0.0, 0.0)
            cap = math.sin(math.pi * t) ** 0.16 if (t < 0.06 or t > 0.94) else 1.0
            xi = x_mid + ux * half_w * cap
            vert_img_coords[v.index] = (xi, z_img)

            # Place pupil cleanly in front of the eye white surface at (xi, z_img)
            y_esurf = (body_front_y(xi, z_img) - 0.028) - 0.098
            wy = y_esurf - 0.012 + uy * 0.014 * cap
            wx, wz = img_to_world_xz(xi, z_img, y_world=wy)
            v.co = Vector((wx - loc[0], wy - loc[1], wz - loc[2]))

        for face in bm.faces:
            for loop in face.loops:
                xi, zi = vert_img_coords[loop.vert.index]
                u_norm = max(0.0, min(1.0, (xi - x0_b) / (x1_b - x0_b)))
                v_norm = max(0.0, min(1.0, (zi - z0_b) / (z1_b - z0_b)))
                loop[uv_layer].uv = (u0_tex + u_norm * (u1_tex - u0_tex), v_norm)

        pup_obj = bmesh_to_object(bm, name, loc, m_pupil, col, (2, 3))
        objs.append(pup_obj)

    return objs


# Exact measured row-by-row mouth contour (z_img, xl_img, xr_img)
MOUTH_PTS = [
    (0.374, 0.490, 0.530),
    (0.382, 0.468, 0.555),
    (0.392, 0.452, 0.574),
    (0.405, 0.436, 0.590),
    (0.420, 0.424, 0.602),
    (0.435, 0.415, 0.611),
    (0.450, 0.409, 0.616),
    (0.465, 0.406, 0.619),
    (0.478, 0.405, 0.620),
    (0.490, 0.404, 0.445),
]


def build_mouth_cavity(m_mouth: bpy.types.Material, col: bpy.types.Collection) -> bpy.types.Object:
    """
    Build GEO_Mouth_Cavity matching the exact upper lip and lower lip equations:
      x_img in [0.404, 0.620] (u in [-1, 1])
      z_upper(u) = 0.472 + 0.020 * u^2 - 0.008 * u
      z_lower(u) = z_upper(u) - 0.098 * (1 - u^2)^0.58 - 0.010 * max(0, -u) * (1 - u^2)
    Note: On the unit sphere equator (x0^2 + z0^2 = 1), z0 = ±(1 - x0^2)^0.50 already provides
    the (1 - u^2)^0.50 factor, so multiplying z0 by (1 - u^2)^0.08 produces the exact (1 - u^2)^0.58 contour!
    """
    bm = create_quad_sphere_bmesh(radius=1.0, subdivisions=3)
    m_xm, m_zm = 0.512, 0.435
    y_m_base = body_front_y(m_xm, m_zm) - 0.032
    loc_x, loc_z = img_to_world_xz(m_xm, m_zm, y_world=y_m_base)
    loc = (loc_x, y_m_base, loc_z)

    for v in bm.verts:
        x0, y0, z0 = v.co.x, v.co.y, v.co.z
        # Project (x0, z0) radially so the front face covers the full mouth contour
        r_xz = math.hypot(x0, z0)
        rh = math.hypot(r_xz, y0)
        uy = y0 / rh if rh > 1e-5 else 0.0
        # Stretch radial (x0, z0) slightly on front/back faces so equator sits at r_xz=1
        u = max(-1.0, min(1.0, x0))
        x_img = 0.512 + u * 0.110 * 1.04

        z_up = 0.478 + 0.022 * (u ** 2) - 0.009 * u
        h_u = (0.106 + 0.012 * max(0.0, -u) * (1.0 - u * u)) * 1.04
        z_lo = z_up - h_u * ((max(0.0, 1.0 - u * u)) ** 0.58)
        z_mid = 0.5 * (z_up + z_lo)
        # Since z0 on the equator is ±(1 - u^2)^0.50, z0 * (0.5 * h_u * (1 - u^2)^0.08) = ±0.5 * h_u * (1 - u^2)^0.58!
        z_scale = 0.5 * h_u * ((max(0.005, 1.0 - u * u)) ** 0.08)
        z_img = z_mid + z0 * z_scale

        y_bsurf = body_front_y(x_img, z_img)
        wy = y_bsurf - 0.030 + uy * 0.016
        wx, wz = img_to_world_xz(x_img, z_img, y_world=wy)
        v.co = Vector((wx - loc[0], wy - loc[1], wz - loc[2]))

    return bmesh_to_object(bm, "GEO_Mouth_Cavity", loc, m_mouth, col, (2, 3))


# Exact measured tongue contour (z_img, xl_img, xr_img) from playful-green-blob-mascot.png
TONGUE_PTS = [
    (0.312, 0.568, 0.594),
    (0.320, 0.550, 0.610),
    (0.330, 0.538, 0.621),
    (0.340, 0.529, 0.628),
    (0.350, 0.522, 0.632),
    (0.360, 0.516, 0.632),
    (0.370, 0.511, 0.630),
    (0.380, 0.499, 0.629),
    (0.390, 0.470, 0.624),
    (0.400, 0.457, 0.618),
    (0.410, 0.453, 0.611),
    (0.420, 0.456, 0.602),
    (0.430, 0.468, 0.600),
    (0.442, 0.510, 0.572),
]


def build_tongue(m_tongue: bpy.types.Material, col: bpy.types.Collection) -> bpy.types.Object:
    """
    Build GEO_Tongue matching the exact measured reference tongue contour from z_img = 0.442
    (root inside mouth) down to z_img = 0.312 (rounded protruding tip on viewer-right),
    anchored in front of GEO_Mouth_Cavity and GEO_Body with a soft central groove.
    """
    bm = create_quad_sphere_bmesh(radius=1.0, subdivisions=3)
    xl_t = [(p[0], p[1]) for p in TONGUE_PTS]
    xr_t = [(p[0], p[2]) for p in TONGUE_PTS]
    zb_t, zt_t = TONGUE_PTS[0][0], TONGUE_PTS[-1][0]

    t_xm, t_zm = 0.555, 0.380
    y_t_base = body_front_y(t_xm, t_zm) - 0.080
    loc_x, loc_z = img_to_world_xz(t_xm, t_zm, y_world=y_t_base)
    loc = (loc_x, y_t_base, loc_z)

    for v in bm.verts:
        x0, y0, z0 = v.co.x, v.co.y, v.co.z
        s = 0.5 * (z0 + 1.0)
        z_img = zb_t + (zt_t - zb_t) * s

        xl = piecewise_linear(z_img, xl_t)
        xr = piecewise_linear(z_img, xr_t)
        x_mid = 0.5 * (xl + xr)
        half_w = 0.5 * (xr - xl) * 1.02

        rh = math.hypot(x0, y0)
        ux, uy = (x0 / rh, y0 / rh) if rh > 1e-5 else (0.0, 0.0)
        cap = math.sin(math.pi * s) ** 0.16 if (s < 0.08 or s > 0.92) else 1.0
        xi = x_mid + ux * half_w * cap

        y_bsurf = body_front_y(xi, z_img)
        y_spine = y_bsurf - 0.068 - 0.042 * math.sin(math.pi * ((1.0 - s) ** 0.75))

        groove_y = 0.0
        groove_z = 0.0
        if uy < 0:
            g_fac = math.exp(-((ux - 0.05) * 3.0) ** 2) * math.sin(math.pi * s) * (-uy)
            groove_y = 0.018 * g_fac
            groove_z = -0.003 * g_fac

        thick_y = 0.034 * (0.75 + 0.25 * math.sin(math.pi * s)) * cap
        wy = y_spine + uy * thick_y + groove_y

        wx, wz = img_to_world_xz(xi, z_img + groove_z, y_world=wy)
        v.co = Vector((wx - loc[0], wy - loc[1], wz - loc[2]))

    return bmesh_to_object(bm, "GEO_Tongue", loc, m_tongue, col, (2, 3))


def add_ortho_camera(
    name: str,
    loc: Vector,
    target: Vector,
    col: bpy.types.Collection,
    ortho_scale: float = 2.35,
    up_axis: str = "Y",
) -> bpy.types.Object:
    cam_data = bpy.data.cameras.new(name)
    cam_data.type = "ORTHO"
    cam_data.ortho_scale = ortho_scale
    cam_data.clip_start = 0.05
    cam_data.clip_end = 100.0
    cam = bpy.data.objects.new(name, cam_data)
    cam.location = loc
    cam.rotation_euler = (target - loc).to_track_quat("-Z", up_axis).to_euler()
    link_to(cam, col)
    return cam


def add_persp_camera(
    name: str,
    loc: Vector,
    target: Vector,
    col: bpy.types.Collection,
    lens: float = 60.0,
) -> bpy.types.Object:
    cam_data = bpy.data.cameras.new(name)
    cam_data.type = "PERSP"
    cam_data.lens = lens
    cam_data.sensor_width = 36.0
    cam_data.clip_start = 0.05
    cam_data.clip_end = 100.0
    cam = bpy.data.objects.new(name, cam_data)
    cam.location = loc
    cam.rotation_euler = (target - loc).to_track_quat("-Z", "Y").to_euler()
    link_to(cam, col)
    return cam


def add_area_light(
    name: str,
    loc: Vector,
    target: Vector,
    energy: float,
    size: float,
    color_hex: str,
    col: bpy.types.Collection,
    diffuse_fac: float = 1.0,
    specular_fac: float = 1.0,
) -> bpy.types.Object:
    light_data = bpy.data.lights.new(name, type="AREA")
    light_data.energy = energy
    light_data.shape = "DISK"
    light_data.size = size
    rgba = hex_rgba(color_hex)
    light_data.color = rgba[:3]
    if hasattr(light_data, "diffuse_factor"):
        light_data.diffuse_factor = diffuse_fac
    if hasattr(light_data, "specular_factor"):
        light_data.specular_factor = specular_fac
    light_obj = bpy.data.objects.new(name, light_data)
    light_obj.location = loc
    light_obj.rotation_euler = (target - loc).to_track_quat("-Z", "Y").to_euler()
    link_to(light_obj, col)
    return light_obj


def build_studio_backdrop(m_bg: bpy.types.Material, col: bpy.types.Collection) -> bpy.types.Object:
    """
    Smooth curved studio cyclorama (floor + curved transition + back wall).
    Normals face toward -Y / +Z (front camera). Uses Incoming.Y > 0.25 camera-ray transparency
    in M_Studio_Backdrop so CAM_Ortho_Back has an unobstructed view!
    """
    bm = bmesh.new()
    n_x = 24
    xs = [-14.0 + 28.0 * i / (n_x - 1) for i in range(n_x)]
    profile_yz = []
    floor_z = 0.025
    for i in range(10):
        y = -8.0 + (4.2 - (-8.0)) * (i / 9.0)
        profile_yz.append((y, floor_z))
    R = 2.4
    for i in range(1, 13):
        ang = (math.pi / 2.0) * (i / 12.0)
        y = 4.2 + R * math.sin(ang)
        z = floor_z + R * (1.0 - math.cos(ang))
        profile_yz.append((y, z))
    for i in range(1, 9):
        z = floor_z + R + (12.0 - R) * (i / 8.0)
        profile_yz.append((4.2 + R, z))

    grid_verts = []
    for y, z in profile_yz:
        row = [bm.verts.new((x, y, z)) for x in xs]
        grid_verts.append(row)
    bm.verts.ensure_lookup_table()
    uv_layer = bm.loops.layers.uv.verify()
    for r in range(len(grid_verts) - 1):
        for c in range(n_x - 1):
            f = bm.faces.new((
                grid_verts[r][c],
                grid_verts[r][c + 1],
                grid_verts[r + 1][c + 1],
                grid_verts[r + 1][c],
            ))
            for loop in f.loops:
                vx, vy, vz = loop.vert.co.x, loop.vert.co.y, loop.vert.co.z
                span = max(0.25, FOV_TAN * (vy - CAM_Y))
                u_img = max(0.0, min(1.0, 0.5 + vx / span))
                v_img = max(0.0, min(1.0, 0.5 + (vz - CAM_Z) / span))
                loop[uv_layer].uv = (u_img, v_img)
    return bmesh_to_object(
        bm,
        "ENV_Studio_Cyclorama",
        (0.0, 0.0, 0.0),
        m_bg,
        col,
        (1, 2),
        recalc_normals=False,
    )


def build() -> None:
    clear_scene()

    root_col = ensure_collection("GreenBlob_Mascot")
    char_col = ensure_collection("01_Character", root_col)
    body_col = ensure_collection("Body_Parts", char_col)
    face_col = ensure_collection("Face_Parts", char_col)
    cam_col = ensure_collection("02_Cameras", root_col)
    light_col = ensure_collection("03_Lights", root_col)
    env_col = ensure_collection("04_Environment", root_col)

    mats = make_materials()

    root = bpy.data.objects.new("CTRL_GreenBlob_Root", None)
    root.empty_display_type = "PLAIN_AXES"
    root.empty_display_size = 0.35
    link_to(root, char_col)

    body = build_body(mats["body"], body_col)
    bumps = build_head_bumps(mats["body"], body_col)
    arm_l, arm_r = build_arms(mats["body"], body_col)
    foot_l, foot_r = build_feet(mats["body"], body_col)
    eye_objs = build_eyes_and_pupils(mats["eye"], mats["pupil"], face_col)
    mouth = build_mouth_cavity(mats["mouth"], face_col)
    tongue = build_tongue(mats["tongue"], face_col)

    all_parts = [body, *bumps, arm_l, arm_r, foot_l, foot_r, *eye_objs, mouth, tongue]
    for p in all_parts:
        parent_keep(p, root)

    # Cameras
    target = Vector((0.0, 0.0, CAM_Z))
    dist = 7.5
    ortho_scale = 2.40
    add_ortho_camera("CAM_Ortho_Front", Vector((0.0, -dist, CAM_Z)), target, cam_col, ortho_scale, "Y")
    add_ortho_camera("CAM_Ortho_Back", Vector((0.0, dist, CAM_Z)), target, cam_col, ortho_scale, "Y")
    add_ortho_camera("CAM_Ortho_Left", Vector((-dist, 0.0, CAM_Z)), target, cam_col, ortho_scale, "Y")
    add_ortho_camera("CAM_Ortho_Right", Vector((dist, 0.0, CAM_Z)), target, cam_col, ortho_scale, "Y")
    add_ortho_camera("CAM_Ortho_Top", Vector((0.0, 0.0, dist + CAM_Z)), target, cam_col, ortho_scale, "Y")

    cam_3q = add_persp_camera(
        "CAM_ThreeQuarter_Persp",
        Vector((2.10, -4.05, 1.25)),
        target,
        cam_col,
        lens=60.0,
    )
    cam_hero = add_persp_camera(
        "CAM_Hero_Front",
        Vector((0.0, CAM_Y, CAM_Z)),
        target,
        cam_col,
        lens=60.0,
    )
    bpy.context.scene.camera = cam_hero

    # Calibrated Studio Lighting to match reference image's exact shading:
    # 1. Front-right warm-lime key light at (2.7, -1.3, 2.4) so shadow lands on the flat floor (Y < 2.5)
    # under and to the left of the feet, never touching the back wall (at Y = 6.6)!
    add_area_light(
        "LIGHT_Key",
        Vector((2.7, -1.3, 2.4)),
        Vector((0.0, 0.0, 0.72)),
        energy=165.0,
        size=2.0,
        color_hex="#F8FFC2",
        col=light_col,
    )
    # 2. Back-wall light behind character (Y=+2.5) illuminating the cyclorama wall with warm right glow
    add_area_light(
        "LIGHT_Rim",
        Vector((3.2, 2.8, 2.6)),
        Vector((0.8, 5.5, 1.8)),
        energy=260.0,
        size=4.5,
        color_hex="#EAFFD0",
        col=light_col,
    )
    # 3. Cool sky-sage fill from front-left so shaded left belly/eyes and left floor/wall have the exact cool tone
    add_area_light(
        "LIGHT_Fill",
        Vector((-3.2, -2.0, 1.7)),
        Vector((-0.2, 0.5, 0.85)),
        energy=68.0,
        size=4.8,
        color_hex="#D2F2E8",
        col=light_col,
    )
    # 4. Subtle front specular light for eye/tongue sheen without washing out the lower belly shadow
    add_area_light(
        "LIGHT_Top",
        Vector((1.4, -2.6, 1.6)),
        Vector((0.2, -0.4, 0.85)),
        energy=24.0,
        size=2.0,
        color_hex="#FFFCE6",
        col=light_col,
        diffuse_fac=0.30,
        specular_fac=1.4,
    )

    build_studio_backdrop(mats["bg"], env_col)

    scene = bpy.context.scene
    if scene.world is None:
        scene.world = bpy.data.worlds.new("World")
    bg = scene.world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs[0].default_value = hex_rgba("#76B888")
        bg.inputs[1].default_value = 0.42

    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 64
    scene.cycles.use_adaptive_sampling = True
    scene.cycles.adaptive_threshold = 0.012
    scene.cycles.max_bounces = 6
    scene.cycles.diffuse_bounces = 3
    scene.cycles.glossy_bounces = 3
    scene.cycles.transmission_bounces = 2
    scene.render.resolution_x = 736
    scene.render.resolution_y = 736
    scene.render.film_transparent = False

    try:
        scene.view_settings.view_transform = "AgX"
        scene.view_settings.look = "None"
    except Exception:
        scene.view_settings.view_transform = "Filmic"
    scene.view_settings.exposure = 0.0

    OUT.mkdir(parents=True, exist_ok=True)
    blend_path = OUT / "green_blob.blend"
    glb_path = OUT / "green_blob.glb"
    preview_path = OUT / "preview.png"
    views_path = OUT / "preview_views.png"

    bpy.context.view_layer.update()
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))

    # Render Hero Front Preview (736x736 matching inspiration/playful-green-blob-mascot.png)
    scene.camera = cam_hero
    scene.render.filepath = str(preview_path)
    bpy.ops.render.render(write_still=True)

    # Export GLB of the character hierarchy
    bpy.ops.object.select_all(action="DESELECT")
    root.select_set(True)
    for p in all_parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = body
    bpy.ops.export_scene.gltf(
        filepath=str(glb_path),
        use_selection=True,
        export_format="GLB",
        export_apply=True,
    )

    # Render 6-view turnaround contact sheet (preview_views.png)
    import tempfile
    import numpy as np

    cam_names = [
        "CAM_Ortho_Front",
        "CAM_Ortho_Back",
        "CAM_Ortho_Left",
        "CAM_Ortho_Right",
        "CAM_Ortho_Top",
        "CAM_ThreeQuarter_Persp",
    ]
    tile_sz = 384
    scene.render.resolution_x = tile_sz
    scene.render.resolution_y = tile_sz
    scene.cycles.samples = 36
    tiles = []
    with tempfile.TemporaryDirectory() as tmpdir:
        for cname in cam_names:
            cobj = bpy.data.objects[cname]
            scene.camera = cobj
            tpath = Path(tmpdir) / f"{cname}.png"
            scene.render.filepath = str(tpath)
            bpy.ops.render.render(write_still=True)
            im = bpy.data.images.load(str(tpath))
            arr = np.array(im.pixels[:], dtype=np.float32).reshape((tile_sz, tile_sz, 4))
            bpy.data.images.remove(im)
            tiles.append(arr)

    # Restore hero camera & settings and re-save .blend
    scene.camera = cam_hero
    scene.render.resolution_x = 736
    scene.render.resolution_y = 736
    scene.cycles.samples = 64
    scene.render.filepath = str(preview_path)
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))

    # Assemble 3x2 contact sheet (bottom-to-top rows in Blender image buffer)
    row_top = np.concatenate([tiles[0], tiles[1], tiles[2]], axis=1)
    row_bot = np.concatenate([tiles[3], tiles[4], tiles[5]], axis=1)
    sheet = np.concatenate([row_bot, row_top], axis=0)
    H_S, W_S, _ = sheet.shape
    out_img = bpy.data.images.new("TurnaroundSheet", width=W_S, height=H_S, alpha=True)
    out_img.pixels = sheet.ravel().tolist()
    out_img.filepath_raw = str(views_path)
    out_img.file_format = "PNG"
    out_img.save()
    bpy.data.images.remove(out_img)


if __name__ == "__main__":
    build()
