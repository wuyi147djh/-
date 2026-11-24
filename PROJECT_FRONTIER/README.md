# PROJECT FRONTIER — realistic Android FPS release candidate

Godot 4.3 Android ARM64 first-person shooter. The previous primitive blockout buildings, roads, bridge, terrain blocks, and primitive weapon fallback have been removed. The level now imports a complete authored modern military town and airfield environment (approximately 470k triangles) as a textured GLB scene, with static mesh collision generated for traversal and combat.

## Art assets and licensing
- Main town and airfield environment: 3DAssets.dev, asset 28276, CC0 1.0 Universal. Source model: https://cdn.3dassets.dev/assets/28276/v1/model.glb
- Soldiers, first-person M4A1, military props, HDRI, audio and PBR surfaces: IRONLINE asset repository https://github.com/cktang88/3d-fps (retain original upstream asset licensing/credits).
- The Android build workflow downloads the required art assets at build time and fails if the required high-detail world or rifle model is missing. No primitive weapon or blockout-building fallback is allowed.

## Controls
Touch left side to move; drag right side to look; FIRE / AIM / JUMP / CROUCH / RELOAD.

## Release acceptance
A successful APK export is not proof of a finished game. Before calling this a final release, verify on a real Android ARM64 phone: startup, map loading, collision traversal, touch movement/look, firing, hit registration, enemy AI, reload, audio, pause/resume, thermal stability, memory use and sustained frame rate. This branch is a visual-quality upgrade and release-candidate work, not a claim that those device tests have already passed.
