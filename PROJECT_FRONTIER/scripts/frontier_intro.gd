extends CanvasLayer
## PROJECT FRONTIER — in-engine opening cinematic and main menu.
## Uses the actual imported 3D world as the cinematic backdrop; no fake 2D gameplay screenshot.

var game: Node3D
var player: CharacterBody3D
var root: Control
var shade: ColorRect
var title: Label
var subtitle: Label
var story: Label
var status: Label
var start_button: Button
var skip_button: Button
var _sequence_running := true

func setup(game_node: Node3D, player_node: CharacterBody3D) -> void:
    game = game_node
    player = player_node

func _ready() -> void:
    _build_interface()
    if is_instance_valid(player):
        player.set_physics_process(false)
        player.set_process_unhandled_input(false)
    _play_opening_sequence()

func _build_interface() -> void:
    root = Control.new()
    root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
    add_child(root)

    shade = ColorRect.new()
    shade.color = Color(0.015, 0.022, 0.027, 1.0)
    shade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
    root.add_child(shade)

    var top_line := ColorRect.new()
    top_line.color = Color(0.78, 0.67, 0.42, 0.9)
    top_line.position = Vector2(38, 48)
    top_line.size = Vector2(100, 3)
    root.add_child(top_line)

    title = Label.new()
    title.text = "PROJECT  FRONTIER"
    title.position = Vector2(38, 65)
    title.add_theme_font_size_override("font_size", 38)
    title.add_theme_color_override("font_color", Color(0.92, 0.94, 0.90))
    root.add_child(title)

    subtitle = Label.new()
    subtitle.text = "A MODERN MILITARY OPEN-WORLD FPS"
    subtitle.position = Vector2(40, 116)
    subtitle.add_theme_font_size_override("font_size", 14)
    subtitle.add_theme_color_override("font_color", Color(0.76, 0.69, 0.51))
    root.add_child(subtitle)

    story = Label.new()
    story.position = Vector2(40, 0)
    story.size = Vector2(620, 150)
    story.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
    story.add_theme_font_size_override("font_size", 18)
    story.add_theme_color_override("font_color", Color(0.88, 0.90, 0.87))
    root.add_child(story)

    status = Label.new()
    status.text = "CLASSIFIED  //  FRONTIER COMMAND"
    status.position = Vector2(40, 0)
    status.add_theme_font_size_override("font_size", 12)
    status.add_theme_color_override("font_color", Color(0.72, 0.66, 0.50))
    root.add_child(status)

    skip_button = Button.new()
    skip_button.text = "跳过开场"
    skip_button.position = Vector2(0, 28)
    skip_button.size = Vector2(130, 46)
    skip_button.anchor_left = 1.0
    skip_button.anchor_right = 1.0
    skip_button.offset_left = -166
    skip_button.offset_right = -36
    skip_button.pressed.connect(_show_main_menu)
    root.add_child(skip_button)

    start_button = Button.new()
    start_button.text = "进入战区  /  DEPLOY"
    start_button.size = Vector2(250, 62)
    start_button.anchor_left = 0.5
    start_button.anchor_right = 0.5
    start_button.anchor_top = 0.78
    start_button.anchor_bottom = 0.78
    start_button.offset_left = -125
    start_button.offset_top = 0
    start_button.offset_right = 125
    start_button.offset_bottom = 62
    start_button.add_theme_font_size_override("font_size", 20)
    start_button.visible = false
    start_button.pressed.connect(_deploy)
    root.add_child(start_button)

func _play_opening_sequence() -> void:
    var reveal := create_tween()
    reveal.tween_property(shade, "color:a", 0.30, 2.4)
    if is_instance_valid(player):
        var camera := player.get_node_or_null("Camera3D") as Camera3D
        var pan := create_tween()
        pan.set_parallel(true)
        pan.tween_property(player, "rotation:y", deg_to_rad(28.0), 8.0).from(0.0)
        if camera:
            pan.tween_property(camera, "fov", 68.0, 5.0).from(82.0)
    var beats := [
        ["2031年，全球能源与航运网络接连中断。", "YEAR 2031  //  GLOBAL CRISIS"],
        ["边境通讯突然沉默。一支联合侦察队在北部群山失联。", "SIGNAL LOST  //  NORTHERN FRONTIER"],
        ["最后一段加密讯息指向一座被遗弃的前沿机场。", "LAST KNOWN POSITION  //  AIRFIELD"],
        ["你的呼号：SPECTER- actual。任务：进入战区，查明真相。", "MISSION 01  //  IRON SILENCE"]
    ]
    for beat in beats:
        if not _sequence_running:
            return
        story.text = beat[0]
        status.text = beat[1]
        story.position.y = get_viewport().get_visible_rect().size.y * 0.58
        var t := create_tween()
        t.tween_property(story, "modulate:a", 1.0, 0.55).from(0.0)
        t.tween_interval(2.0)
        t.tween_property(story, "modulate:a", 0.0, 0.4)
        await t.finished
    _show_main_menu()

func _show_main_menu() -> void:
    if not _sequence_running and start_button.visible:
        return
    _sequence_running = false
    story.text = "北部战区仍在等待回应。整片区域已失去联络。\n\n独自深入，找到失联小队，并夺回前沿机场。"
    story.position.y = get_viewport().get_visible_rect().size.y * 0.48
    story.modulate.a = 1.0
    status.text = "CAMPAIGN  //  CHAPTER 01: IRON SILENCE"
    skip_button.visible = false
    start_button.visible = true
    var fade := create_tween()
    fade.tween_property(shade, "color:a", 0.48, 0.8)
    title.modulate.a = 1.0
    subtitle.modulate.a = 1.0

func _deploy() -> void:
    if is_instance_valid(player):
        player.set_physics_process(true)
        player.set_process_unhandled_input(true)
    var fade := create_tween()
    fade.tween_property(root, "modulate:a", 0.0, 0.65)
    await fade.finished
    queue_free()
