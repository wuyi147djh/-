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
    for i in range(9):
        _spawn_enemy(Vector3(randf_range(-48, 48), 1.0, randf_range(-85, -20)))
func _process(delta: float) -> void:
    mission_time += delta
    status_label.text = "OPERATION: IRON FRONTIER   |   HOSTILES %02d   |   %02d:%02d" % [enemies.size(), int(mission_time) / 60, int(mission_time) % 60]
    mission_label.text = "PRIMARY OBJECTIVE: SECURE THE OUTPOST" if enemies.size() > 0 else "OUTPOST SECURED  —  MOVE TO EXTRACTION"
    health_label.text = "VITALS  %03d" % player.health
func _build_world() -> void:
    var we := WorldEnvironment.new()
    var env := Environment.new()
    env.background_mode = Environment.BG_SKY
    var sky := Sky.new()
    var hdr_path := "res://assets/ironline/hdr/bambanani_sunset_2k.hdr"
    if ResourceLoader.exists(hdr_path):
        var panorama := PanoramaSkyMaterial.new()
        panorama.panorama = load(hdr_path)
        panorama.energy_multiplier = 0.72
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
    env.ambient_light_color = Color(0.48, 0.52, 0.58)
    env.ambient_light_energy = 0.7
    env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
    env.fog_enabled = true
    env.fog_light_color = Color(0.48, 0.55, 0.58)
    env.fog_density = 0.0018
    we.environment = env
    add_child(we)
    var sun := DirectionalLight3D.new()
    sun.rotation_degrees = Vector3(-42, -28, 0)
    sun.light_energy = 1.45
    sun.shadow_enabled = true
    sun.directional_shadow_max_distance = 180
    add_child(sun)
    _box("Terrain", Vector3(0,-1.2,-45), Vector3(150,2,180), Color(0.20,0.24,0.19), true)
    _box("Highway", Vector3(0,0.03,-48), Vector3(13,0.12,150), Color(0.12,0.13,0.13), true)
    for z in range(-115,20,8): _box("Road marking", Vector3(0,0.105,z), Vector3(0.22,0.025,3.4), Color(0.82,0.78,0.61), false)
    _box("River", Vector3(47,-0.12,-60), Vector3(22,0.15,160), Color(0.055,0.19,0.24), false)
    _box("Bridge", Vector3(44,0.4,-38), Vector3(35,0.8,12), Color(0.29,0.31,0.30), true)
    _box("Command bunker", Vector3(-18,3,-75), Vector3(26,8,19), Color(0.25,0.29,0.27), true)
    _box("Bunker roof", Vector3(-18,7.2,-75), Vector3(29,0.8,22), Color(0.16,0.19,0.18), false)
    _box("Watch tower", Vector3(3,5,-82), Vector3(4,10,4), Color(0.28,0.30,0.27), true)
    _build_mountain_range()
    for i in range(7):
        var x := randf_range(-42,42)
        var z := randf_range(-125,-90)
        if abs(x)>10:
            var sz := Vector3(randf_range(7,13),randf_range(4,8),randf_range(7,12))
            _box("Abandoned structure", Vector3(x,sz.y/2,z), sz, Color(0.28,0.27,0.23), true)
    _place_prop("res://assets/ironline/models/props/old_military_crate/old_military_crate.glb", Vector3(-7,0.1,-28), 1.4, 0.4)
    _place_prop("res://assets/ironline/models/props/ammo_box/ammo_box.glb", Vector3(-5,0.1,-29), 1.0, -0.2)
    _place_prop("res://assets/ironline/models/props/portable_generator/portable_generator.glb", Vector3(7,0.1,-38), 1.0, 1.2)
    _place_prop("res://assets/ironline/models/props/metal_jerrycan_green/metal_jerrycan_green.glb", Vector3(8,0.1,-37), 0.9, 0.7)
    _place_prop("res://assets/ironline/models/props/concrete_road_barrier/concrete_road_barrier.glb", Vector3(-9,0.1,-46), 1.0, 0.0)
    _place_prop("res://assets/ironline/models/props/covered_car/covered_car.glb", Vector3(18,0.1,-66), 1.0, -1.0)
    # Replace cone-tree and cube-rock placeholders with authored military assets.
    _place_prop("res://assets/ironline/ambience/models/uh60/uh60.glb", Vector3(27,0.25,-88), 1.0, -0.7)
    _place_prop("res://assets/ironline/ambience/models/burnt_car/burnt_car.glb", Vector3(-31,0.05,-55), 1.0, 0.8)
    _place_prop("res://assets/ironline/models/props/barrel_03/barrel_03.glb", Vector3(-11,0.1,-43), 1.0, 0.3)
    _place_prop("res://assets/ironline/models/props/old_tyre/old_tyre.glb", Vector3(-13,0.1,-44), 1.0, 0.9)
    _place_prop("res://assets/ironline/models/props/security_light/security_light.glb", Vector3(-26,0.1,-73), 1.0, 0.0)
    _place_prop("res://assets/ironline/models/props/street_lamp_02/street_lamp_02.glb", Vector3(13,0.1,-58), 1.0, 0.0)
    _place_prop("res://assets/ironline/models/props/utility_box_01/utility_box_01.glb", Vector3(-22,0.1,-78), 1.0, 0.0)
    _place_prop("res://assets/ironline/models/props/modular_industrial_pipes_01/modular_industrial_pipes_01.glb", Vector3(-28,0.1,-79), 1.0, 0.0)
    _add_smoke(Vector3(-31,1.5,-55))
func _spawn_player() -> void:
    player = CharacterBody3D.new()
    player.set_script(PLAYER_SCRIPT)
    player.position = Vector3(0,1.2,5)
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
    ai.source_code = "extends CharacterBody3D\nvar hp=100.0\nvar target: Node3D\nvar game: Node\nvar attack_cd=0.0\nfunc _physics_process(d):\n if not is_instance_valid(target): return\n var v=target.global_position-global_position; v.y=0\n if v.length()>13.0: velocity=v.normalized()*2.7\n else: velocity=Vector3.ZERO\n if v.length()>0.2: look_at(global_position+v,Vector3.UP)\n velocity.y-=24.0*d; move_and_slide()\n attack_cd-=d\n if v.length()<32.0 and attack_cd<=0: attack_cd=1.35; target.take_damage(5); if is_instance_valid(game): game._enemy_shot(global_position)\nfunc hit(dmg):\n hp-=dmg\n if hp<=0: queue_free()\n"
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
    var n: int=min(30-ammo,reserve)
    ammo+=n
    reserve-=n
    if reload_audio and reload_audio.stream:
        reload_audio.play()
    _update_ammo()
func _update_ammo() -> void:
    var l:=hud.get_node_or_null("Control/Ammo")
    if l: l.text="%02d / %03d" % [ammo,reserve]

func _surface_material(surface_name: String, tint: Color) -> StandardMaterial3D:
    var m := StandardMaterial3D.new()
    m.albedo_color = tint
    m.roughness = 0.88
    var key := ""
    if surface_name == "Terrain":
        key = "Ground110"
    elif surface_name == "Highway" or surface_name == "Road marking":
        key = "Asphalt031"
    elif surface_name.find("Bunker") >= 0 or surface_name.find("structure") >= 0:
        key = "Concrete047A"
    elif surface_name.find("Rock") >= 0:
        key = "Concrete034"
    var base := "res://assets/ironline/textures/" + key + "/"
    if key != "" and ResourceLoader.exists(base + "Color.webp"):
        m.albedo_texture = load(base + "Color.webp")
        if ResourceLoader.exists(base + "NormalGL.webp"):
            m.normal_enabled = true
            m.normal_texture = load(base + "NormalGL.webp")
            m.normal_scale = 0.7
        if ResourceLoader.exists(base + "Roughness.webp"):
            m.roughness_texture = load(base + "Roughness.webp")
    return m

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

func _box(n: String,p: Vector3,s: Vector3,c: Color,collide: bool) -> void:
    var b: StaticBody3D=StaticBody3D.new() if collide else StaticBody3D.new()
    b.name=n
    b.position=p
    var mi:=MeshInstance3D.new()
    var bm:=BoxMesh.new()
    bm.size=s
    mi.mesh=bm
    mi.material_override=_surface_material(n,c)
    b.add_child(mi)
    if collide:
        var cs:=CollisionShape3D.new()
        var bs:=BoxShape3D.new()
        bs.size=s
        cs.shape=bs
        b.add_child(cs)
    else:
        b.collision_layer=0
        b.collision_mask=0
    add_child(b)
func _cylinder(p: Vector3,r: float,h: float,c: Color) -> void:
    var mi:=MeshInstance3D.new()
    var m:=CylinderMesh.new()
    m.top_radius=r*0.75
    m.bottom_radius=r
    m.height=h
    mi.mesh=m
    mi.position=p
    var mat:=StandardMaterial3D.new()
    mat.albedo_color=c
    mat.roughness=1.0
    mi.material_override=mat
    add_child(mi)
func _cone(p: Vector3,r: float,h: float,c: Color) -> void:
    var mi:=MeshInstance3D.new()
    var m:=CylinderMesh.new()
    m.top_radius=0.0
    m.bottom_radius=r
    m.height=h
    mi.mesh=m
    mi.position=p
    var mat:=StandardMaterial3D.new()
    mat.albedo_color=c
    mat.roughness=0.95
    mi.material_override=mat
    add_child(mi)


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


func _build_mountain_range() -> void:
    var vertices := PackedVector3Array()
    var uvs := PackedVector2Array()
    var indices := PackedInt32Array()
    var noise := FastNoiseLite.new()
    noise.seed = 4172
    noise.frequency = 0.018
    noise.fractal_octaves = 4
    var nx := 121
    var nz := 24
    for iz in range(nz):
        for ix in range(nx):
            var x := -120.0 + float(ix) * 2.0
            var z := -180.0 + float(iz) * 2.4
            var peaks := 8.0
            peaks += 26.0 * exp(-pow((x + 62.0) / 25.0, 2.0))
            peaks += 38.0 * exp(-pow((x - 4.0) / 31.0, 2.0))
            peaks += 23.0 * exp(-pow((x - 76.0) / 22.0, 2.0))
            var detail := noise.get_noise_2d(x * 1.4, z) * 3.8
            var vertical_profile := 0.78 + 0.22 * sin(float(iz) / float(nz - 1) * PI)
            vertices.append(Vector3(x, maxf(2.0, (peaks + detail) * vertical_profile), z))
            uvs.append(Vector2(float(ix) / 12.0, float(iz) / 4.0))
    for iz in range(nz - 1):
        for ix in range(nx - 1):
            var a := iz * nx + ix
            var b := a + nx
            indices.append_array(PackedInt32Array([a, b, a + 1, a + 1, b, b + 1]))
    var arrays := []
    arrays.resize(Mesh.ARRAY_MAX)
    arrays[Mesh.ARRAY_VERTEX] = vertices
    arrays[Mesh.ARRAY_TEX_UV] = uvs
    arrays[Mesh.ARRAY_INDEX] = indices
    var raw_mesh := ArrayMesh.new()
    raw_mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arrays)
    var smooth_builder := SurfaceTool.new()
    smooth_builder.create_from(raw_mesh, 0)
    smooth_builder.generate_normals()
    var mountain_mesh := smooth_builder.commit()
    var mountain := MeshInstance3D.new()
    mountain.name = "Distant mountain range"
    mountain.mesh = mountain_mesh
    mountain.position = Vector3(0, -1.5, 0)
    var rock_material := _surface_material("Rock", Color(0.24, 0.29, 0.30))
    rock_material.uv1_scale = Vector3(5.0, 5.0, 1.0)
    rock_material.roughness = 1.0
    mountain.material_override = rock_material
    mountain.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
    add_child(mountain)


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
