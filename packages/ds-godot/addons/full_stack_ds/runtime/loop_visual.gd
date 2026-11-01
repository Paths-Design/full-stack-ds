@tool
extends VBoxContainer

# The generated plan supplies every visual and timing fact. This runtime has
# no component identity and does not infer missing styles from a theme.
var configuration: Dictionary = {}
@export var size_axis: String = "":
	set(next):
		size_axis = next
		_refresh()
@export var thickness_axis: String = "":
	set(next):
		thickness_axis = next
		_refresh()
@export var reduced_motion: bool = false:
	set(next):
		reduced_motion = next
		_refresh()
@export var aria_hidden: bool = false:
	set(next):
		aria_hidden = next
		_refresh()
@export var aria_label: String = "":
	set(next):
		aria_label = next
		_refresh()

var rendered: Control
var elapsed_ms := 0.0
var angle_degrees := 0.0
var selected_size := 0.0
var selected_thickness := 0.0

func _ready() -> void:
	rendered = Control.new()
	rendered.name = str(configuration.get("targetPart", "Visual"))
	rendered.mouse_filter = Control.MOUSE_FILTER_IGNORE
	rendered.draw.connect(_paint)
	add_child(rendered)
	var defaults: Dictionary = configuration.get("defaults", {})
	var size_prop: String = configuration.get("sizeAxis", "")
	var thickness_prop: String = configuration.get("thicknessAxis", "")
	if size_axis.is_empty() and defaults.has(size_prop): size_axis = str(JSON.parse_string(defaults[size_prop]))
	if thickness_axis.is_empty() and defaults.has(thickness_prop): thickness_axis = str(JSON.parse_string(defaults[thickness_prop]))
	_refresh()

func set_contract_prop(prop: String, value: Variant) -> void:
	if prop == configuration.get("sizeAxis", ""): size_axis = str(value)
	elif prop == configuration.get("thicknessAxis", ""): thickness_axis = str(value)
	elif prop == configuration.get("hiddenProp", ""): aria_hidden = bool(value)
	elif prop == configuration.get("labelProp", ""): aria_label = str(value)
	else: push_error("Unsupported loop visual prop: " + prop)

func get_contract_prop(prop: String) -> Variant:
	if prop == configuration.get("sizeAxis", ""): return size_axis
	if prop == configuration.get("thicknessAxis", ""): return thickness_axis
	if prop == configuration.get("hiddenProp", ""): return aria_hidden
	if prop == configuration.get("labelProp", ""): return aria_label
	return null

func _notification(what: int) -> void:
	if what == NOTIFICATION_THEME_CHANGED and is_instance_valid(rendered): _refresh()
	if what == NOTIFICATION_ACCESSIBILITY_UPDATE and is_instance_valid(rendered):
		var element := rendered.get_accessibility_element()
		if element.is_valid(): AccessibilityServer.update_set_flag(element, AccessibilityServer.FLAG_HIDDEN, aria_hidden)

func _refresh() -> void:
	if not is_instance_valid(rendered): return
	var sizes: Dictionary = configuration.get("sizePixels", {})
	var thicknesses: Dictionary = configuration.get("thicknessPixels", {})
	if (not size_axis.is_empty() and not sizes.has(size_axis)) or (not thickness_axis.is_empty() and not thicknesses.has(thickness_axis)):
		push_error("Unsupported loop visual size/thickness: " + size_axis + "/" + thickness_axis)
		return
	selected_size = float(sizes[size_axis]) if not size_axis.is_empty() else float(get_theme_default_font_size())
	selected_thickness = float(thicknesses[thickness_axis]) if not thickness_axis.is_empty() else float(configuration.get("baseThicknessPx", 0.0))
	custom_minimum_size = Vector2(selected_size, selected_size)
	rendered.custom_minimum_size = Vector2(selected_size, selected_size)
	rendered.accessibility_name = "" if aria_hidden else aria_label
	queue_accessibility_update()
	if reduced_motion: angle_degrees = float(configuration.get("reducedValue", 0.0))
	rendered.queue_redraw()

func _bezier(progress: float) -> float:
	var curve: Array = configuration.get("easing", [0.0, 0.0, 1.0, 1.0])
	var lo := 0.0
	var hi := 1.0
	var t := progress
	for step in range(16):
		var inverse := 1.0 - t
		var x := 3.0 * inverse * inverse * t * float(curve[0]) + 3.0 * inverse * t * t * float(curve[2]) + t * t * t
		if x < progress: lo = t
		else: hi = t
		t = (lo + hi) * 0.5
	var inverse := 1.0 - t
	return 3.0 * inverse * inverse * t * float(curve[1]) + 3.0 * inverse * t * t * float(curve[3]) + t * t * t

func _process(delta: float) -> void:
	if reduced_motion or not is_instance_valid(rendered): return
	var duration := float(configuration.get("durationMs", 0.0))
	if duration <= 0.0: return
	elapsed_ms = fposmod(elapsed_ms + delta * 1000.0 * float(configuration.get("multiplier", 1.0)), duration)
	angle_degrees = 360.0 * _bezier(elapsed_ms / duration)
	rendered.queue_redraw()

func _paint() -> void:
	if selected_size <= 0.0 or selected_thickness <= 0.0: return
	var center := Vector2(selected_size * 0.5, selected_size * 0.5)
	var radius := (selected_size - selected_thickness) * 0.5
	var angle := deg_to_rad(angle_degrees)
	rendered.draw_arc(center, radius, 0.0, TAU, 64, Color(str(configuration.get("trackColor", "#000000"))), selected_thickness, true)
	rendered.draw_arc(center, radius, angle - PI * 0.75, angle - PI * 0.25, 32, Color(str(configuration.get("accentColor", "#000000"))), selected_thickness, true)
