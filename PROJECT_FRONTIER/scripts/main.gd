extends Node3D
const PLAYER_SCRIPT = preload("res://scripts/player.gd")
var player: CharacterBody3D
var hud: CanvasLayer
var status_label: Label
var mission_label: Label
var health_label: Label
var player_audio: AudioStreamPlayer
var reload_audio: AudioStreamPlayer
var enemies: Array[Node3D] = []
var ammo := 30
var reserve := 180
var mission_time := 0.0
var kills := 0
var kills_label: Label
func _ready() -> void:
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
        Vector3(-8.0, 1.0, 8.0), Vector3(8.0, 1.0, 8.0),
        Vector3(-12.0, 1.0, 2.0), Vector3(12.0, 1.0, 2.0),
        Vector3(-6.0, 1.0, -4.0), Vector3(6.0, 1.0, -4.0),
        Vector3(-2.0, 1.0, 12.0), Vector3(2.0, 1.0, -6.0),
        Vector3(0.0, 1.0, 5.0)
    ]
    for spawn_point in enemy_spawns:
        _spawn_enemy(spawn_point)
    var intro := CanvasLayer.new()
    intro.set_script(load("res://scripts/frontier_intro.gd"))
    intro.setup(self, player)
    add_child(intro)
func _process(delta: float) -> void:
    mission_time += delta
    status_label.text = "OPERATION: IRON FRONTIER   |   HOSTILES %02d   |   KIA %02d   |   %02d:%02d" % [enemies.size(), kills, int(mission_time) / 60, int(mission_time) % 60]
    mission_label.text = "PRIMARY OBJECTIVE: SECURE THE OUTPOST" if enemies.size() > 0 else "OUTPOST SECURED  —  MOVE TO EXTRACTION"
    health_label.text = "VITALS  %03d" % player.health
    if is_instance_valid(kills_label):
        kills_label.text = "CONFIRMED KILLS  %02d / 09" % kills
func _build_world() -> void:
    var we := WorldEnvironment.new()
    var env := Environment.new()
    env.background_mode = Environment.BG_SKY
    var sky := Sky.new()
    var panorama := PanoramaSkyMaterial.new()
    var hdr_path := "res://assets/ironline/hdr/bambanani_sunset_2k.hdr"
    if ResourceLoader.exists(hdr_path):
        panorama.panorama = load(hdr_path)
        panorama.energy_multiplier = 0.82
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
    env.ambient_light_color = Color(0.52, 0.56, 0.62)
    env.ambient_light_energy = 0.78
    env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
    env.fog_enabled = true
    env.fog_light_color = Color(0.48, 0.55, 0.58)
    env.fog_density = 0.0009
    env.sdfgi_enabled = false
    we.environment = env
    add_child(we)

    var sun := DirectionalLight3D.new()
    sun.rotation_degrees = Vector3(-38, -32, 0)
    sun.light_energy = 1.55
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
    world_instance.name = "TACTICAL_HILL_TOWN_OBJECTIVE_SITE_A"
    world_instance.position = Vector3.ZERO
    world_instance.scale = Vector3.ONE
    add_child(world_instance)
    _add_static_collisions(world_instance)

    # Supplemental authored military props; no primitive buildings or cube props.
    _place_prop("res://assets/ironline/models/props/old_military_crate/old_military_crate.glb", Vector3(-8,0.0,-27), 1.25, 0.4)
    _place_prop("res://assets/ironline/models/props/ammo_box/ammo_box.glb", Vector3(-6,0.0,-28), 1.0, -0.2)
    _place_prop("res://assets/ironline/models/props/portable_generator/portable_generator.glb", Vector3(8,0.0,-35), 1.0, 1.2)
    _place_prop("res://assets/ironline/models/props/metal_jerrycan_green/metal_jerrycan_green.glb", Vector3(9,0.0,-34), 0.9, 0.7)
    _place_prop("res://assets/ironline/ambience/models/burnt_car/burnt_car.glb", Vector3(-24,0.0,-39), 1.0, 0.8)
    _add_smoke(Vector3(-24,1.5,-39))

func _add_static_collisions(root: Node) -> void:
    for child in root.get_children():
        if child is MeshInstance3D and child.mesh != null:
            child.create_trimesh_collision()
        _add_static_collisions(child)

func _spawn_player() -> void:
    player = CharacterBody3D.new()
    player.set_script(PLAYER_SCRIPT)
    # Spawn just outside the south entrance, facing into the objective square.
    player.position = Vector3(0.0, 1.2, 20.5)
    add_child(player)
    player.fired.connect(_on_player_fired)
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
    if v.length() > 13.0:
        velocity = v.normalized() * 2.7
    else:
        velocity = Vector3.ZERO
    if v.length() > 0.2:
        look_at(global_position + v, Vector3.UP)
    velocity.y -= 24.0 * d
    move_and_slide()
    attack_cd -= d
    if v.length() < 32.0 and attack_cd <= 0.0:
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
    kills_label = Label.new()
    kills_label.set_anchors_and_offsets_preset(Control.PRESET_TOP_RIGHT)
    kills_label.position = Vector2(-250, 52)
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
    _button(root,"FIRE",Vector2(-145,-205),Vector2(115,82),"fire")
    _button(root,"RELOAD",Vector2(-285,-105),Vector2(105,60),"reload")
    _button(root,"JUMP",Vector2(-155,-105),Vector2(95,60),"jump")
    _button(root,"CROUCH",Vector2(-420,-105),Vector2(110,60),"crouch")
    _button(root,"AIM",Vector2(-285,-195),Vector2(95,60),"aim")
    var hint:=Label.new()
    hint.text="LEFT SIDE: MOVE   |   RIGHT SIDE: LOOK"
    hint.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_LEFT)
    hint.position=Vector2(25,-55)
    hint.add_theme_font_size_override("font_size",15)
    hint.add_theme_color_override("font_color",Color(0.85,0.88,0.82,0.8))
    root.add_child(hint)
func _button(root: Control, caption: String, offset: Vector2, size: Vector2, action: String) -> void:
    var b:=Button.new()
    b.text=caption
    b.size=size
    b.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_RIGHT)
    b.position=offset
    b.modulate=Color(0.8,0.9,0.82,0.84)
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
