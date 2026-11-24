extends Node3D
const PLAYER_SCRIPT = preload("res://scripts/player.gd")
var player: CharacterBody3D
var hud: CanvasLayer
var status_label: Label
var enemies: Array[Node3D] = []
var ammo := 30
var reserve := 180
var mission_time := 0.0
func _ready() -> void:
    _build_world()
    _spawn_player()
    _build_hud()
    for i in range(9):
        _spawn_enemy(Vector3(randf_range(-48, 48), 1.0, randf_range(-85, -20)))
func _process(delta: float) -> void:
    mission_time += delta
    status_label.text = "OPERATION: IRON FRONTIER   |   HOSTILES %02d   |   %02d:%02d" % [enemies.size(), int(mission_time) / 60, int(mission_time) % 60]
func _build_world() -> void:
    var we := WorldEnvironment.new()
    var env := Environment.new()
    env.background_mode = Environment.BG_SKY
    var sky := Sky.new()
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
    for i in range(22):
        var x := -95.0 + i * 9.0
        var h := randf_range(18,38)
        _box("Distant ridge", Vector3(x,h*0.25-1,-145-randf_range(0,30)), Vector3(randf_range(12,24),h,18), Color(0.17,0.22,0.23), false)
    for i in range(7):
        var x := randf_range(-42,42)
        var z := randf_range(-125,-90)
        if abs(x)>10:
            var sz := Vector3(randf_range(7,13),randf_range(4,8),randf_range(7,12))
            _box("Abandoned structure", Vector3(x,sz.y/2,z), sz, Color(0.28,0.27,0.23), true)
    for i in range(230):
        var x := randf_range(-82,82)
        var z := randf_range(-138,28)
        if abs(x)<9 or (x>34 and x<59): continue
        var th := randf_range(3.5,6.5)
        _cylinder(Vector3(x,th/2,z),randf_range(0.18,0.32),th,Color(0.20,0.15,0.10))
        _cone(Vector3(x,th+2.1,z),randf_range(1.3,2.3),randf_range(4.5,6.5),Color(0.09,randf_range(0.19,0.25),0.15))
    for i in range(70):
        _box("Rock",Vector3(randf_range(-70,70),0.5,randf_range(-130,25)),Vector3(randf_range(0.8,3.5),randf_range(0.7,2.5),randf_range(0.8,3.0)),Color(0.25,0.27,0.25),false)
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
    var body := MeshInstance3D.new()
    var mesh := CapsuleMesh.new()
    mesh.radius = 0.42
    mesh.height = 1.8
    body.mesh = mesh
    body.position.y = 0.9
    var mat := StandardMaterial3D.new()
    mat.albedo_color = Color(0.20,0.24,0.19)
    mat.roughness = 0.92
    body.material_override = mat
    e.add_child(body)
    var head := MeshInstance3D.new()
    head.mesh = SphereMesh.new()
    head.scale = Vector3(0.75,0.75,0.75)
    head.position.y = 1.85
    head.material_override = mat
    e.add_child(head)
    var ai := GDScript.new()
    ai.source_code = "extends CharacterBody3D\nvar hp=100.0\nvar target: Node3D\nvar attack_cd=0.0\nfunc _physics_process(d):\n if not is_instance_valid(target): return\n var v=target.global_position-global_position; v.y=0\n if v.length()>7.0: velocity=v.normalized()*2.1\n else: velocity=Vector3.ZERO\n if v.length()>0.2: look_at(global_position+v,Vector3.UP)\n velocity.y-=24.0*d; move_and_slide()\n attack_cd-=d\n if v.length()<2.3 and attack_cd<=0: attack_cd=1.2; target.take_damage(8)\nfunc hit(dmg):\n hp-=dmg\n if hp<=0: queue_free()\n"
    e.set_script(ai)
    e.set("target",player)
    add_child(e)
    enemies.append(e)
    e.tree_exited.connect(func(): enemies.erase(e))
func _on_player_fired(origin: Vector3, direction: Vector3) -> void:
    if ammo<=0: return
    ammo-=1
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
    _update_ammo()
func _update_ammo() -> void:
    var l:=hud.get_node_or_null("Control/Ammo")
    if l: l.text="%02d / %03d" % [ammo,reserve]
func _box(n: String,p: Vector3,s: Vector3,c: Color,collide: bool) -> void:
    var b: StaticBody3D=StaticBody3D.new() if collide else StaticBody3D.new()
    b.name=n
    b.position=p
    var mi:=MeshInstance3D.new()
    var bm:=BoxMesh.new()
    bm.size=s
    mi.mesh=bm
    var m:=StandardMaterial3D.new()
    m.albedo_color=c
    m.roughness=0.9
    mi.material_override=m
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
