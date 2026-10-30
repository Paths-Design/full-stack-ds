@tool
extends VBoxContainer
signal value_requested(next: String)
signal value_changed(next: String)
var configuration: Dictionary = {}
@export var label: String = "Control":
	set(next):
		label = next
		_refresh()
@export var controlled: bool = false
@export var disabled: bool = false:
	set(next):
		disabled = next
		_refresh()
@export var value: String = "":
	set(next):
		if value == next: return
		value = next
		_refresh()
		value_changed.emit(value)
var trigger: Button
var items: Array[Dictionary] = []
var strip: BoxContainer
var content: VBoxContainer
var surface: PanelContainer
var overlay: CanvasLayer
var operation: String
var collapsible := true

func _ready() -> void:
	operation = configuration.get("operation", "boolean")
	collapsible = JSON.parse_string(configuration.get("defaults", {}).get("collapsible", "false"))
	add_theme_constant_override("separation", 8)
	var style := StyleBoxFlat.new()
	style.bg_color = Color("#f7f7f7")
	style.content_margin_left = 12
	style.content_margin_right = 12
	if theme == null: theme = Theme.new()
	theme.set_stylebox("normal", "Button", style)
	theme.set_stylebox("panel", "PanelContainer", style)
	trigger = CheckButton.new() if operation == "boolean" else Button.new()
	trigger.custom_minimum_size.y = 40
	add_child(trigger)
	trigger.pressed.connect(activate)
	strip = HBoxContainer.new()
	add_child(strip)
	content = VBoxContainer.new()
	add_child(content)
	if operation in ["select", "toggle-item"]:
		trigger.hide()
	else:
		value = "false" if value.is_empty() else value
	if operation == "surface": content.hide()
	_refresh()

func _refresh() -> void:
	if not is_instance_valid(trigger): return
	trigger.text = label
	if operation == "boolean": trigger.set_pressed_no_signal(value == "true")
	trigger.disabled = disabled
	for item in items:
		item.button.disabled = disabled or item.disabled
		item.button.button_pressed = value == item.key
		item.body.visible = value == item.key
		var has_indicator: bool = not configuration.get("itemButtonRefs", []).is_empty()
		item.button.text = item.label if has_indicator or operation != "toggle-item" else item.label + ("  −" if value == item.key else "  +")
	if operation == "surface":
		if value == "true" and not disabled: _show_surface()
		elif is_instance_valid(overlay):
			content.reparent(self)
			content.hide()
			overlay.queue_free()
			overlay = null

func activate(key: String = "") -> void:
	if disabled: return
	var next := "false" if value == "true" else "true"
	if operation in ["select", "toggle-item"]:
		var found := false
		for item in items:
			if item.key == key and not item.disabled: found = true
		if not found: return
		next = "" if operation == "toggle-item" and value == key and collapsible else key
	if next == value: return
	if not controlled: value = next
	value_requested.emit(next)
	_refresh()

func add_item(key: String, text: String, body: Control, locked := false) -> void:
	for item in items:
		assert(item.key != key, "Duplicate item key")
	var button := Button.new()
	button.text = text
	button.custom_minimum_size.y = 40
	button.toggle_mode = operation == "select"
	button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	if operation == "select": strip.add_child(button)
	else: content.add_child(button)
	for reference in configuration.get("itemButtonRefs", []):
		var target: String = reference.get("ref", "")
		var part: String = reference.get("part", "")
		var scene_path := "res://addons/full_stack_ds/components/%s/%s.tscn" % [target, target]
		var scene = load(scene_path)
		assert(scene is PackedScene, "Missing admitted componentRef scene: " + scene_path)
		var child: Control = scene.instantiate()
		child.name = part
		child.mouse_filter = Control.MOUSE_FILTER_IGNORE
		button.add_child(child)
		for prop in reference.get("attrs", {}): child.set_contract_prop(prop, reference.attrs[prop])
		child.set_anchors_and_offsets_preset(Control.PRESET_CENTER_RIGHT, Control.PRESET_MODE_MINSIZE, 8)
	var panel := PanelContainer.new()
	content.add_child(panel)
	panel.add_child(body)
	button.pressed.connect(activate.bind(key))
	items.append({"key":key,"label":text,"body":panel,"button":button,"disabled":locked})
	if operation == "select" and value.is_empty() and not locked: value = key
	_refresh()

func _show_surface() -> void:
	if is_instance_valid(overlay): return
	overlay = CanvasLayer.new()
	add_child(overlay)
	surface = PanelContainer.new()
	surface.theme = theme
	overlay.add_child(surface)
	content.reparent(surface)
	content.show()
	surface.size = Vector2(280, 90)
	var viewport_size := get_viewport_rect().size
	surface.position = Vector2(clampf(global_position.x, 0, maxf(0, viewport_size.x - 280)), clampf(global_position.y + size.y + 4, 0, maxf(0, viewport_size.y - 90)))

func _unhandled_key_input(event: InputEvent) -> void:
	if operation == "surface" and value == "true" and event.is_action_pressed("ui_cancel"):
		if not controlled: value = "false"
		value_requested.emit("false")
		trigger.grab_focus()
		get_viewport().set_input_as_handled()

func _exit_tree() -> void:
	if is_instance_valid(overlay): overlay.queue_free()
