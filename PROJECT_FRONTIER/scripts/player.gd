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
func _ready() -> void:
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
    var gun := MeshInstance3D.new()
    var gm := BoxMesh.new()
    gm.size = Vector3(0.16, 0.16, 0.72)
    gun.mesh = gm
    gun.position = Vector3(0.28, -0.24, -0.58)
    var mat := StandardMaterial3D.new()
    mat.albedo_color = Color(0.075, 0.085, 0.078)
    mat.metallic = 0.72
    mat.roughness = 0.34
    gun.material_override = mat
    camera.add_child(gun)
    Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
func _physics_process(delta: float) -> void:
    fire_cd = maxf(0, fire_cd - delta)
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
