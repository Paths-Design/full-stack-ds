@tool
extends VBoxContainer

# Source-bearing action rules are emitted from ComponentIR. This runtime has
# no component identity; the generated configuration supplies its axes/rules.
signal activated

var configuration: Dictionary = {}
@export var content: String = "":
	set(next):
		content = next
		_refresh()
@export var variant: String = "":
	set(next):
		variant = next
		_refresh()
@export var size_axis: String = "":
	set(next):
		size_axis = next
		_refresh()
@export var axis_values: Dictionary = {}:
	set(next):
		axis_values = next
		_refresh()
@export var token_overrides: Dictionary = {}:
	set(next):
		token_overrides = next
		_refresh()
@export var disabled: bool = false:
	set(next):
		disabled = next
		_refresh()
@export var loading: bool = false:
	set(next):
		loading = next
		_refresh()
@export var aria_label: String = "":
	set(next):
		aria_label = next
		_refresh()
@export var title: String = "":
	set(next):
		title = next
		_refresh()

var rendered: Button
var loading_indicator: ProgressBar

func _ready() -> void:
	rendered = Button.new()
	rendered.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	add_child(rendered)
	rendered.pressed.connect(_on_pressed)
	loading_indicator = ProgressBar.new()
	loading_indicator.indeterminate = true
	loading_indicator.show_percentage = false
	loading_indicator.mouse_filter = Control.MOUSE_FILTER_IGNORE
	loading_indicator.custom_minimum_size = Vector2(22, 4)
	loading_indicator.set_anchors_preset(Control.PRESET_CENTER)
	rendered.add_child(loading_indicator)
	_refresh()

func _on_pressed() -> void:
	if not disabled and not loading:
		activated.emit()

func _axis_value(axis: String) -> String:
	if axis_values.has(axis): return str(axis_values[axis])
	if axis == "variant" and not variant.is_empty(): return variant
	if axis == "size" and not size_axis.is_empty(): return size_axis
	var authored = configuration.get("defaults", {}).get(axis, "")
	var parsed = JSON.parse_string(authored)
	return str(parsed) if parsed != null else ""

func _active_rules(states: Array[String]) -> Array:
	var active: Array = []
	for rule in configuration.get("styles", []):
		var matches := true
		for predicate in rule.get("predicates", []):
			var kind: String = predicate.get("kind", "")
			if kind == "variant":
				if _axis_value(predicate.get("axis", "")) != predicate.get("value", ""):
					matches = false
					break
			elif not states.has(kind):
				matches = false
				break
		if matches: active.append(rule)
	return active

func _resolve(declaration: Dictionary, definitions: Dictionary, visiting: Array[String]) -> String:
	var slot: String = declaration.get("designSlot", "")
	if not slot.is_empty() and token_overrides.has(slot): return str(token_overrides[slot])
	var property: String = declaration.get("property", "")
	if token_overrides.has(property): return str(token_overrides[property])
	var token: String = declaration.get("token", "")
	if token.is_empty(): return str(declaration.get("value", ""))
	if token_overrides.has(token): return str(token_overrides[token])
	if not definitions.has(token): return str(declaration.get("value", ""))
	if visiting.has(token):
		push_error("GODOT_ACTION_TOKEN_CYCLE: " + token)
		return ""
	var next_stack := visiting.duplicate()
	next_stack.append(token)
	return _resolve(definitions[token], definitions, next_stack)

func _properties(states: Array[String] = []) -> Dictionary:
	var active := _active_rules(states)
	var definitions: Dictionary = {}
	var selected: Dictionary = {}
	for rule in active:
		for declaration in rule.get("declarations", []):
			var property: String = declaration.property
			if property.contains("."): definitions[property] = declaration
			else: selected[property] = declaration
	var resolved: Dictionary = {}
	for property in selected:
		resolved[property] = _resolve(selected[property], definitions, [])
	return resolved

func _pixels(raw: String) -> float:
	if raw.ends_with("rem"): return raw.trim_suffix("rem").to_float() * 16.0
	if raw.ends_with("px"): return raw.trim_suffix("px").to_float()
	return raw.to_float()

func _stylebox(style: Dictionary, focus := false) -> StyleBoxFlat:
	var box := StyleBoxFlat.new()
	box.bg_color = Color.TRANSPARENT if focus else Color(style.get("background-color", "transparent"))
	box.border_color = Color(style.get("border-color", "transparent"))
	var border := maxi(0, roundi(_pixels(style.get("border-width", "0px"))))
	box.set_border_width_all(border)
	box.set_corner_radius_all(maxi(0, roundi(_pixels(style.get("border-radius", "0px")))))
	if not focus:
		box.content_margin_top = _pixels(style.get("padding-block-start", "0px"))
		box.content_margin_bottom = _pixels(style.get("padding-block-end", "0px"))
		box.content_margin_left = _pixels(style.get("padding-inline-start", "0px"))
		box.content_margin_right = _pixels(style.get("padding-inline-end", "0px"))
	return box

func _refresh() -> void:
	if not is_instance_valid(rendered): return
	rendered.text = "" if loading else content
	rendered.disabled = disabled or loading
	rendered.accessibility_name = aria_label if not aria_label.is_empty() else content
	rendered.tooltip_text = title
	loading_indicator.visible = loading
	var base := _properties()
	var hover := _properties(["hover"])
	var pressed := _properties(["active"])
	var inactive := _properties(["disabled"])
	var focus := _properties(["focus"])
	rendered.custom_minimum_size = Vector2(_pixels(base.get("min-width", "0px")), _pixels(base.get("min-height", "0px")))
	for entry in [
		["normal", base], ["hover", hover], ["pressed", pressed], ["disabled", inactive]
	]:
		rendered.add_theme_stylebox_override(entry[0], _stylebox(entry[1]))
	rendered.add_theme_stylebox_override("focus", _stylebox(focus, true))
	for entry in [
		["font_color", base], ["font_hover_color", hover],
		["font_pressed_color", pressed], ["font_disabled_color", inactive],
		["font_focus_color", focus]
	]:
		rendered.add_theme_color_override(entry[0], Color(entry[1].get("color", "#141414")))
	rendered.add_theme_font_size_override("font_size", roundi(_pixels(base.get("font-size", "1rem"))))
	var font := SystemFont.new()
	font.font_weight = int(base.get("font-weight", "400"))
	rendered.add_theme_font_override("font", font)
