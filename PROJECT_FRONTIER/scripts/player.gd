extends CharacterBody3D
signal fired(origin: Vector3, direction: Vector3)
const SPEED := 6.2
const SENS := 0.0022
var camera: Camera3D
var pitch := 0.0
var health := 100
var aiming := false
var crouched := false
var fire_cd := 0.0
var look_touch := -1
var move_touch := -1
var last_touch := Vector2.ZERO
var move_origin := Vector2.ZERO
var move_vector := Vector2.ZERO
var recoil := 0.0
var muzzle_light: OmniLight3D
func _ready() -> void:
    _ensure_input_actions()
    var col := CollisionShape3D.new()
    var capsule := CapsuleShape3D.new()
    capsule.radius = 0.38
    capsule.height = 1.8
    col.shape = capsule
    add_child(col)
    camera = Camera3D.new()
    camera.position = Vector3(0, 1.52, 0)
    camera.current = true
    camera.fov = 82
    add_child(camera)
    var weapon_path := "res://assets/ironline/models/fp/m4a1.glb"
    if ResourceLoader.exists(weapon_path):
        var weapon_scene := load(weapon_path) as PackedScene
        if weapon_scene:
            var weapon := weapon_scene.instantiate()
            weapon.position = Vector3(0.28, -0.24, -0.58)
            weapon.scale = Vector3.ONE * 0.8
            camera.add_child(weapon)
    else:
        push_error("CRITICAL: M4A1 first-person model missing; refusing to display a primitive weapon placeholder.")
    muzzle_light = OmniLight3D.new()
    muzzle_light.light_color = Color(1.0, 0.63, 0.24)
    muzzle_light.light_energy = 0.0
    muzzle_light.omni_range = 3.5
    muzzle_light.position = Vector3(0.28, -0.22, -1.0)
    camera.add_child(muzzle_light)
    Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
func _physics_process(delta: float) -> void:
    fire_cd = maxf(0, fire_cd - delta)
    recoil = move_toward(recoil, 0.0, delta * 2.8)
    if is_instance_valid(camera):
        camera.rotation.x = clampf(pitch + recoil, -1.45, 1.45)
        if is_instance_valid(muzzle_light) and muzzle_light.light_energy > 0.0:
            muzzle_light.light_energy = maxf(0.0, muzzle_light.light_energy - delta * 24.0)
    var input := Vector2(Input.get_action_strength("move_right") - Input.get_action_strength("move_left"), Input.get_action_strength("move_back") - Input.get_action_strength("move_forward"))
    input += move_vector
    input = input.limit_length(1.0)
    var dir := (transform.basis * Vector3(input.x, 0, input.y)).normalized()
    velocity.x = dir.x * SPEED * (0.55 if crouched else 1.0)
    velocity.z = dir.z * SPEED * (0.55 if crouched else 1.0)
    if not is_on_floor(): velocity.y -= 24.0 * delta
    move_and_slide()
    if Input.is_action_just_pressed("fire"): shoot()
func _unhandled_input(event: InputEvent) -> void:
    if event is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
        rotate_y(-event.relative.x * SENS)
        pitch = clampf(pitch - event.relative.y * SENS, -1.45, 1.45)
        camera.rotation.x = pitch
    elif event is InputEventScreenTouch:
        var w := get_viewport().get_visible_rect().size.x
        if event.pressed:
            if event.position.x > w * 0.43:
                look_touch = event.index
                last_touch = event.position
            else:
                move_touch = event.index
                move_origin = event.position
                move_vector = Vector2.ZERO
        else:
            if event.index == look_touch: look_touch = -1
            if event.index == move_touch:
                move_touch = -1
                move_vector = Vector2.ZERO
    elif event is InputEventScreenDrag:
        if event.index == look_touch:
            var d: Vector2 = event.position - last_touch
            rotate_y(-d.x * 0.004)
            pitch = clampf(pitch - d.y * 0.004, -1.45, 1.45)
            camera.rotation.x = pitch
            last_touch = event.position
        elif event.index == move_touch:
            move_vector = ((event.position - move_origin) / 75.0).limit_length(1.0)
func shoot() -> void:
    if fire_cd > 0: return
    fire_cd = 0.105
    recoil = minf(recoil + (0.035 if aiming else 0.075), 0.22)
    if is_instance_valid(muzzle_light):
        muzzle_light.light_energy = 2.8
    fired.emit(camera.global_position, -camera.global_transform.basis.z)
func jump() -> void:
    if is_on_floor(): velocity.y = 8.2
func toggle_crouch() -> void:
    crouched = not crouched
    camera.position.y = 1.0 if crouched else 1.52
func toggle_aim() -> void:
    aiming = not aiming
    camera.fov = 58 if aiming else 82
func take_damage(amount: int) -> void:
    health = max(0, health - amount)
    if health == 0:
        global_position = Vector3(0, 1.2, 5)
        health = 100

func _ensure_input_actions() -> void:
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
        var ev := InputEventKey.new()
        ev.physical_keycode = keys[action]
        InputMap.action_add_event(action, ev)
    if not InputMap.has_action("fire"):
        InputMap.add_action("fire")
    var mouse_fire := InputEventMouseButton.new()
    mouse_fire.button_index = MOUSE_BUTTON_LEFT
    InputMap.action_add_event("fire", mouse_fire)
