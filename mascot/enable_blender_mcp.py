"""Enable Blender MCP add-on and save user preferences."""
import bpy

MODULE = "blender_addon"

# Enable add-on
try:
    bpy.ops.preferences.addon_enable(module=MODULE)
    print(f"ENABLED {MODULE}")
except Exception as e:
    print(f"ENABLE_FAILED: {e}")

# Preferences for building assets from Cursor
addon = bpy.context.preferences.addons.get(MODULE)
if addon is None:
    print("ADDON_NOT_IN_PREFS")
else:
    prefs = addon.preferences
    prefs.port = 8400
    # Needed to run build scripts via MCP
    prefs.allow_execute_python = True
    prefs.execute_python_unrestricted = True
    print(
        "PREFS",
        prefs.port,
        prefs.allow_execute_python,
        prefs.execute_python_unrestricted,
    )

bpy.ops.wm.save_userpref()
print("SAVED_USERPREF")
