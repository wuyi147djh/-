extends Node3D
# Runtime screenshot and tactical map validation enabled for this release candidate.
const PLAYER_SCRIPT = preload("res://scripts/player.gd")
var player: CharacterBody3D
var hud: CanvasLayer
var status_label: Label
var mission_label: Label
var health_label: Label
var health_bar: ProgressBar
var player_audio: AudioStreamPlayer
var reload_audio: AudioStreamPlayer
var enemies: Array[Node3D] = []
var ammo := 30
var reserve := 180
var mission_time := 0.0
var kills := 0
var kills_label: Label
var joystick_thumb: Panel
func _ready() -> void:
    _ensure_game_input_actions()
    _build_world()
    _spawn_player()
    _build_hud()
    player_audio = AudioStreamPlayer.new()
    var shot_path := "res://assets/ironline/audio/guns/m4a1_player_near.ogg"
    if ResourceLoader.exists(shot_path):
        player_audio.stream = load(shot_path)
    add_child(player_audio)
    reload_audio = AudioStreamPlayer.new()
    var reload_path := "res://assets/ironline/audio/foley/rifle_magin.ogg"
    if ResourceLoader.exists(reload_path):
        reload_audio.stream = load(reload_path)
    add_child(reload_audio)
    # Enemy squad is deliberately placed inside the playable objective courtyard,
    # not scattered across the old oversized terrain coordinates.
    var enemy_spawns: Array[Vector3] = [
        Vector3(-7.0, 1.0, 5.0), Vector3(7.0, 1.0, 5.0),
        Vector3(-10.0, 1.0, 0.0), Vector3(10.0, 1.0, 0.0),
        Vector3(-6.0, 1.0, -5.0), Vector3(6.0, 1.0, -5.0),
        Vector3(-2.0, 1.0, 8.0), Vector3(2.0, 1.0, -8.0),
        Vector3(0.0, 1.0, -2.0)
    ]
    for spawn_point in enemy_spawns:
        _spawn_enemy(spawn_point)
    var intro := CanvasLayer.new()
    intro.set_script(load("res://scripts/frontier_intro.gd"))
    intro.setup(self, player)
    add_child(intro)
    # CI-only real-engine capture path: bypass the title sequence and save an actual rendered frame.
    if OS.get_cmdline_user_args().has("--capture-gameplay"):
        await get_tree().create_timer(0.8).timeout
        if is_instance_valid(intro):
            await intro._deploy()
        await get_tree().create_timer(2.5).timeout
        var frame := get_viewport().get_texture().get_image()
        frame.save_png("build/PROJECT_FRONTIER-runtime.png")
func _process(delta: float) -> void:
    mission_time += delta
    status_label.text = "OPERATION: IRON FRONTIER   |   HOSTILES %02d   |   KIA %02d   |   %02d:%02d" % [enemies.size(), kills, int(mission_time) / 60, int(mission_time) % 60]
    mission_label.text = "PRIMARY OBJECTIVE: SECURE THE OUTPOST" if enemies.size() > 0 else "OUTPOST SECURED  —  MOVE TO EXTRACTION"
    health_label.text = "VITALS  %03d" % player.health
    if is_instance_valid(health_bar):
        health_bar.value = player.health
    if is_instance_valid(kills_label):
        kills_label.text = "CONFIRMED KILLS  %02d / 09" % kills
    if is_instance_valid(joystick_thumb) and is_instance_valid(player):
        joystick_thumb.position = Vector2(51, 51) + player.move_vector * 38.0
func _build_world() -> void:
    var we := WorldEnvironment.new()
    var env := Environment.new()
    env.background_mode = Environment.BG_SKY
    var sky := Sky.new()
    var panorama := PanoramaSkyMaterial.new()
    var hdr_path := "res://assets/ironline/hdr/bambanani_sunset_2k.hdr"
    if ResourceLoader.exists(hdr_path):
        panorama.panorama = load(hdr_path)
        panorama.energy_multiplier = 0.58
        sky.sky_material = panorama
    else:
        var sm := ProceduralSkyMaterial.new()
        sm.sky_top_color = Color(0.10, 0.20, 0.30)
        sm.sky_horizon_color = Color(0.55, 0.60, 0.58)
        sm.ground_bottom_color = Color(0.07, 0.08, 0.07)
        sm.ground_horizon_color = Color(0.28, 0.30, 0.27)
        sky.sky_material = sm
    env.sky = sky
    env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
    env.ambient_light_color = Color(0.38, 0.42, 0.48)
    env.ambient_light_energy = 0.34
    env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
    env.fog_enabled = true
    env.fog_light_color = Color(0.48, 0.55, 0.58)
    env.fog_density = 0.00012
    env.sdfgi_enabled = false
    we.environment = env
    add_child(we)

    var sun := DirectionalLight3D.new()
    sun.rotation_degrees = Vector3(-38, -32, 0)
    sun.light_energy = 0.72
    sun.shadow_enabled = true
    sun.directional_shadow_max_distance = 120.0
    sun.directional_shadow_mode = DirectionalLight3D.SHADOW_PARALLEL_4_SPLITS
    add_child(sun)

    var world_path := "res://assets/world/tactical_hill_town_site_a.glb"
    if not ResourceLoader.exists(world_path):
        push_error("CRITICAL: complete town/airfield GLB missing. No primitive or low-poly fallback is permitted.")
        return
    var world_scene := load(world_path) as PackedScene
    if world_scene == null:
        push_error("CRITICAL: town/airfield GLB failed to import.")
        return
    var world_instance := world_scene.instantiate()
    world_instance.name = "FRONTIER_TOWN_AIRFIELD_OBJECTIVE"
    world_instance.position = Vector3.ZERO
    world_instance.scale = Vector3.ONE
    add_child(world_instance)
    var visual_count := world_instance.find_children("*", "VisualInstance3D", true, false).size()
    print("FRONTIER MAP LOADED: ", world_path, " | visual nodes=", visual_count)
    if visual_count < 10:
        push_error("CRITICAL: objective map imported but has too few visible meshes.")
    _add_static_collisions(world_instance)

    # Supplemental authored military props; no primitive buildings or cube props.
    _place_prop("res://assets/ironline/models/props/old_military_crate/old_military_crate.glb", Vector3(-8,0.0,-12), 1.25, 0.4)
    _place_prop("res://assets/ironline/models/props/ammo_box/ammo_box.glb", Vector3(-6,0.0,-12), 1.0, -0.2)
    _place_prop("res://assets/ironline/models/props/portable_generator/portable_generator.glb", Vector3(8,0.0,-12), 1.0, 1.2)
    _place_prop("res://assets/ironline/models/props/metal_jerrycan_green/metal_jerrycan_green.glb", Vector3(9,0.0,-11), 0.9, 0.7)
    _place_prop("res://assets/ironline/ambience/models/burnt_car/burnt_car.glb", Vector3(-24,0.0,-10), 1.0, 0.8)
    _add_smoke(Vector3(-24,1.5,-10))

func _add_static_collisions(root: Node) -> void:
    for child in root.get_children():
        if child is MeshInstance3D and child.mesh != null:
            child.create_trimesh_collision()
        _add_static_collisions(child)

func _spawn_player() -> void:
    player = CharacterBody3D.new()
    player.set_script(PLAYER_SCRIPT)
    # Restore the proven courtyard-facing spawn used by build #62; keep the corrected lighting from build #64.
    player.position = Vector3(0.0, 1.2, 7.5)
    player.rotation.y = 0.0
    add_child(player)
    player.fired.connect(_on_player_fired)
    player.reload_requested.connect(_reload)
func _spawn_enemy(pos: Vector3) -> void:
    var e := CharacterBody3D.new()
    e.position = pos
    var col := CollisionShape3D.new()
    var cap := CapsuleShape3D.new()
    cap.radius = 0.42
    cap.height = 1.8
    col.shape = cap
    e.add_child(col)
    var soldier_path := "res://assets/ironline/models/characters/soldier_tac.glb"
    if ResourceLoader.exists(soldier_path):
        var soldier_scene := load(soldier_path) as PackedScene
        if soldier_scene:
            var soldier := soldier_scene.instantiate()
            soldier.position.y = -0.9
            e.add_child(soldier)
            for anim_node in soldier.find_children("*", "AnimationPlayer", true, false):
                var clips: PackedStringArray = anim_node.get_animation_list()
                for preferred in ["run", "Run", "rifle_run", "walk", "Walk", "idle", "Idle"]:
                    if clips.has(preferred):
                        anim_node.play(preferred)
                        break
    else:
        push_error("Required soldier_tac.glb missing: refusing to spawn a low-detail placeholder enemy.")
        e.queue_free()
        return
    var ai := GDScript.new()
    ai.source_code = """extends CharacterBody3D
var hp = 100.0
var target: Node3D
var game: Node
var attack_cd = 0.0
func _physics_process(d):
    if not is_instance_valid(target):
        return
    var v = target.global_position - global_position
    v.y = 0
    var distance = v.length()
    if distance > 13.0:
        velocity.x = v.normalized().x * 2.7
        velocity.z = v.normalized().z * 2.7
    else:
        velocity.x = move_toward(velocity.x, 0.0, 8.0 * d)
        velocity.z = move_toward(velocity.z, 0.0, 8.0 * d)
    if distance > 0.2:
        look_at(global_position + v, Vector3.UP)
    velocity.y -= 24.0 * d
    move_and_slide()
    attack_cd -= d
    # Fire only when the player is actually visible; walls and buildings block attacks.
    if distance < 32.0 and attack_cd <= 0.0:
        var from = global_position + Vector3.UP * 1.25
        var to = target.global_position + Vector3.UP * 1.1
        var query = PhysicsRayQueryParameters3D.create(from, to)
        query.exclude = [self]
        var sight = get_world_3d().direct_space_state.intersect_ray(query)
        if sight and sight.collider == target:
            attack_cd = 1.35
            target.take_damage(5)
            if is_instance_valid(game):
                game._enemy_shot(global_position)
func hit(dmg):
    hp -= dmg
    if hp <= 0:
        if is_instance_valid(game):
            game._enemy_killed()
        queue_free()
"""
    e.set_script(ai)
    e.set("target",player)
    e.set("game",self)
    add_child(e)
    enemies.append(e)
    e.tree_exited.connect(func(): enemies.erase(e))
func _on_player_fired(origin: Vector3, direction: Vector3) -> void:
    if ammo<=0: return
    ammo-=1
    if player_audio and player_audio.stream:
        player_audio.play()
    var q := PhysicsRayQueryParameters3D.create(origin,origin+direction*160.0)
    q.exclude=[player]
    var hit := get_world_3d().direct_space_state.intersect_ray(q)
    if hit and hit.collider and hit.collider.has_method("hit"): hit.collider.hit(50)
    _update_ammo()
func _build_hud() -> void:
    hud=CanvasLayer.new()
    add_child(hud)
    var root:=Control.new()
    root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
    hud.add_child(root)
    status_label=Label.new()
    status_label.position=Vector2(24,18)
    status_label.add_theme_font_size_override("font_size",21)
    status_label.add_theme_color_override("font_color",Color(0.83,0.9,0.82))
    root.add_child(status_label)
    mission_label = Label.new()
    mission_label.position = Vector2(24, 48)
    mission_label.add_theme_font_size_override("font_size", 17)
    mission_label.add_theme_color_override("font_color", Color(0.95, 0.78, 0.42))
    root.add_child(mission_label)
    health_label = Label.new()
    health_label.set_anchors_and_offsets_preset(Control.PRESET_TOP_RIGHT)
    health_label.position = Vector2(-190, 20)
    health_label.add_theme_font_size_override("font_size", 21)
    health_label.add_theme_color_override("font_color", Color(0.82, 0.9, 0.82))
    root.add_child(health_label)
    health_bar = ProgressBar.new()
    health_bar.min_value = 0
    health_bar.max_value = 100
    health_bar.value = 100
    health_bar.show_percentage = false
    health_bar.custom_minimum_size = Vector2(180, 18)
    health_bar.set_anchors_and_offsets_preset(Control.PRESET_TOP_RIGHT)
    health_bar.position = Vector2(-190, 50)
    health_bar.size = Vector2(170, 14)
    var health_fill := StyleBoxFlat.new()
    health_fill.bg_color = Color(0.72, 0.16, 0.12, 0.95)
    health_fill.corner_radius_top_left = 3
    health_fill.corner_radius_top_right = 3
    health_fill.corner_radius_bottom_left = 3
    health_fill.corner_radius_bottom_right = 3
    health_bar.add_theme_stylebox_override("fill", health_fill)
    var health_track := StyleBoxFlat.new()
    health_track.bg_color = Color(0.06, 0.08, 0.08, 0.82)
    health_track.corner_radius_top_left = 3
    health_track.corner_radius_top_right = 3
    health_track.corner_radius_bottom_left = 3
    health_track.corner_radius_bottom_right = 3
    health_bar.add_theme_stylebox_override("background", health_track)
    root.add_child(health_bar)
    kills_label = Label.new()
    kills_label.set_anchors_and_offsets_preset(Control.PRESET_TOP_RIGHT)
    kills_label.position = Vector2(-250, 82)
    kills_label.add_theme_font_size_override("font_size", 16)
    kills_label.add_theme_color_override("font_color", Color(0.78, 0.84, 0.75))
    root.add_child(kills_label)
    var cross:=Label.new()
    cross.text="+"
    cross.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
    cross.position=Vector2(-8,-20)
    cross.add_theme_font_size_override("font_size",30)
    root.add_child(cross)
    var ammo_label:=Label.new()
    ammo_label.name="Ammo"
    ammo_label.text="30 / 180"
    ammo_label.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_RIGHT)
    ammo_label.position=Vector2(-205,-82)
    ammo_label.add_theme_font_size_override("font_size",28)
    root.add_child(ammo_label)
    # Reposition into a familiar mobile FPS combat cluster:
    # large fire control on the far right, ADS above-left, movement actions below.
    _button(root,"FIRE",Vector2(-150,-300),Vector2(132,132),"fire")
    _button(root,"AIM",Vector2(-315,-275),Vector2(88,88),"aim")
    _button(root,"RELOAD",Vector2(-270,-165),Vector2(76,76),"reload")
    _button(root,"JUMP",Vector2(-145,-150),Vector2(88,88),"jump")
    _button(root,"CROUCH",Vector2(-390,-165),Vector2(88,88),"crouch")
    var hint:=Label.new()
    hint.text="LEFT SIDE: MOVE   |   RIGHT SIDE: LOOK"
    hint.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_LEFT)
    hint.position=Vector2(25,-55)
    hint.add_theme_font_size_override("font_size",15)
    hint.add_theme_color_override("font_color",Color(0.85,0.88,0.82,0.8))
    root.add_child(hint)
    _build_virtual_joystick(root)

func _build_virtual_joystick(root: Control) -> void:
    # Standard FPS left thumbstick: fixed outer ring, four directional marks,
    # and a movable inner thumb that tracks the player's actual touch vector.
    var base := Panel.new()
    base.name = "MovementJoystick"
    base.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_LEFT)
    base.position = Vector2(34, -214)
    base.size = Vector2(164, 164)
    base.mouse_filter = Control.MOUSE_FILTER_IGNORE
    base.z_index = 30
    var base_style := StyleBoxFlat.new()
    base_style.bg_color = Color(0.035, 0.055, 0.055, 0.52)
    base_style.border_color = Color(0.82, 0.9, 0.82, 0.92)
    base_style.set_border_width_all(3)
    base_style.set_corner_radius_all(82)
    base.add_theme_stylebox_override("panel", base_style)
    root.add_child(base)

    for mark in [
        {"text":"▲", "pos":Vector2(69, 7)},
        {"text":"▼", "pos":Vector2(69, 133)},
        {"text":"◀", "pos":Vector2(7, 69)},
        {"text":"▶", "pos":Vector2(133, 69)}
    ]:
        var direction := Label.new()
        direction.text = mark.text
        direction.position = mark.pos
        direction.add_theme_font_size_override("font_size", 14)
        direction.add_theme_color_override("font_color", Color(0.85, 0.92, 0.86, 0.85))
        direction.mouse_filter = Control.MOUSE_FILTER_IGNORE
        base.add_child(direction)

    joystick_thumb = Panel.new()
    joystick_thumb.name = "JoystickThumb"
    joystick_thumb.position = Vector2(51, 51)
    joystick_thumb.size = Vector2(62, 62)
    joystick_thumb.mouse_filter = Control.MOUSE_FILTER_IGNORE
    var thumb_style := StyleBoxFlat.new()
    thumb_style.bg_color = Color(0.72, 0.82, 0.75, 0.9)
    thumb_style.border_color = Color(0.98, 1.0, 0.96, 0.98)
    thumb_style.set_border_width_all(2)
    thumb_style.set_corner_radius_all(31)
    joystick_thumb.add_theme_stylebox_override("panel", thumb_style)
    base.add_child(joystick_thumb)

func _button(root: Control, caption: String, offset: Vector2, size: Vector2, action: String) -> void:
    var b:=Button.new()
    b.text = ""
    b.tooltip_text = caption
    b.icon = load("res://assets/ui/icons/%s.svg" % action) as Texture2D
    b.icon_alignment = HORIZONTAL_ALIGNMENT_CENTER
    b.vertical_icon_alignment = VERTICAL_ALIGNMENT_CENTER
    b.expand_icon = true
    b.icon_max_width = int(min(size.x, size.y) * 0.52)
    b.size=size
    b.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_RIGHT)
    b.position=offset
    b.custom_minimum_size = size
    b.add_theme_font_size_override("font_size", 20 if caption == "FIRE" else 14)
    var normal := StyleBoxFlat.new()
    normal.bg_color = Color(0.055, 0.085, 0.075, 0.78)
    normal.border_color = Color(0.78, 0.88, 0.78, 0.92)
    normal.set_border_width_all(2)
    normal.set_corner_radius_all(64 if caption == "FIRE" else 44)
    b.add_theme_stylebox_override("normal", normal)
    var pressed_style := StyleBoxFlat.new()
    pressed_style.bg_color = Color(0.35, 0.48, 0.36, 0.94)
    pressed_style.border_color = Color(1.0, 1.0, 1.0, 1.0)
    pressed_style.set_border_width_all(3)
    pressed_style.set_corner_radius_all(64 if caption == "FIRE" else 44)
    b.add_theme_stylebox_override("pressed", pressed_style)
    b.add_theme_color_override("font_color", Color(0.94, 0.98, 0.92))
    b.add_theme_color_override("font_pressed_color", Color.WHITE)
    b.pressed.connect(func():
        match action:
            "fire": player.shoot()
            "reload": _reload()
            "jump": player.jump()
            "crouch": player.toggle_crouch()
            "aim": player.toggle_aim()
    )
    root.add_child(b)
func _reload() -> void:
    if ammo >= 30 or reserve <= 0:
        return
    var n: int=min(30-ammo,reserve)
    ammo+=n
    reserve-=n
    if reload_audio and reload_audio.stream:
        reload_audio.play()
    _update_ammo()
func _update_ammo() -> void:
    var l:=hud.get_node_or_null("Control/Ammo")
    if l: l.text="%02d / %03d" % [ammo,reserve]

func _place_prop(asset_path: String, pos: Vector3, scale_factor: float = 1.0, yaw: float = 0.0) -> void:
    if not ResourceLoader.exists(asset_path):
        return
    var packed := load(asset_path) as PackedScene
    if packed == null:
        return
    var instance := packed.instantiate()
    instance.position = pos
    instance.rotation.y = yaw
    instance.scale = Vector3.ONE * scale_factor
    add_child(instance)

func _add_smoke(pos: Vector3) -> void:
    var smoke := GPUParticles3D.new()
    smoke.position = pos
    smoke.amount = 48
    smoke.lifetime = 5.5
    smoke.emitting = true
    smoke.visibility_aabb = AABB(Vector3(-8,-2,-8), Vector3(16,18,16))
    var process := ParticleProcessMaterial.new()
    process.direction = Vector3(0.0, 1.0, 0.0)
    process.spread = 18.0
    process.initial_velocity_min = 0.8
    process.initial_velocity_max = 2.2
    process.gravity = Vector3(0, 0.15, 0)
    process.scale_min = 1.0
    process.scale_max = 2.8
    process.color = Color(0.16, 0.17, 0.16, 0.42)
    smoke.process_material = process
    var puff := SphereMesh.new()
    puff.radius = 0.65
    puff.height = 1.3
    var mat := StandardMaterial3D.new()
    mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
    mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
    mat.albedo_color = Color(0.18, 0.19, 0.18, 0.32)
    puff.material = mat
    smoke.draw_pass_1 = puff
    add_child(smoke)


func _enemy_killed() -> void:
    kills += 1
    if kills >= 9:
        mission_label.text = "OUTPOST SECURED  —  ALL HOSTILES ELIMINATED"
        status_label.text = "MISSION COMPLETE  //  PROCEED TO EXTRACTION"

func _enemy_shot(pos: Vector3) -> void:
    var path := "res://assets/ironline/audio/guns/ak74_enemy_distant.ogg"
    if not ResourceLoader.exists(path):
        return
    var sound := AudioStreamPlayer3D.new()
    sound.stream = load(path)
    sound.unit_size = 12.0
    sound.max_distance = 65.0
    add_child(sound)
    sound.global_position = pos
    sound.play()
    sound.finished.connect(sound.queue_free)


func _ensure_game_input_actions() -> void:
    var keys := {
        "move_forward": KEY_W,
        "move_back": KEY_S,
        "move_left": KEY_A,
        "move_right": KEY_D,
        "jump": KEY_SPACE,
        "reload": KEY_R,
        "crouch": KEY_CTRL,
        "aim": KEY_SHIFT
    }
    for action in keys:
        if not InputMap.has_action(action):
            InputMap.add_action(action)
        if InputMap.action_get_events(action).is_empty():
            var key_event := InputEventKey.new()
            key_event.physical_keycode = keys[action]
            InputMap.action_add_event(action, key_event)
    if not InputMap.has_action("fire"):
        InputMap.add_action("fire")
    if InputMap.action_get_events("fire").is_empty():
        var mouse_event := InputEventMouseButton.new()
        mouse_event.button_index = MOUSE_BUTTON_LEFT
        InputMap.action_add_event("fire", mouse_event)
