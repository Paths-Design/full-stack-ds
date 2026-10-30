@tool
extends VBoxContainer

# Generated scenes own the part nodes. This runtime only changes their native
# style resources, so consumer children keep their identity across restyling.
var configuration: Dictionary = {}
@export var content: String = "":
	set(next):
		content = next
		_refresh()
@export var variant: String = "":
	set(next):
		variant = next
		_refresh()
@export var intent: String = "":
	set(next):
		intent = next
		_refresh()
@export var size_axis: String = "":
	set(next):
		size_axis = next
		_refresh()
@export var density: String = "":
	set(next):
		density = next
		_refresh()
@export var interactive: bool = false:
	set(next):
		interactive = next
		_refresh()
@export var axis_values: Dictionary = {}:
	set(next):
		axis_values = next
		_refresh()
@export var token_overrides: Dictionary = {}:
	set(next):
		token_overrides = next
		_refresh()

var chrome: PanelContainer
var body: BoxContainer
var content_label: Label
var hovered := false

func _ready() -> void:
	chrome = get_node_or_null("Chrome") as PanelContainer
	body = get_node_or_null("Chrome/Body") as BoxContainer
	if chrome == null or body == null:
		push_error("GODOT_COMPOSITE_MISSING_SCENE_HOST")
		return
	chrome.mouse_entered.connect(_hover_entered)
	chrome.mouse_exited.connect(_hover_exited)
	var content_part: String = configuration.get("contentPart", "")
	if not content_part.is_empty():
		var slot := get_part(content_part)
		if slot != null:
			content_label = Label.new()
			content_label.name = "ProjectedContent"
			slot.add_child(content_label)
	for part in configuration.get("parts", []):
		var slot := get_part(part)
		if slot != null:
			slot.child_entered_tree.connect(func(_child): _refresh())
			slot.child_exiting_tree.connect(func(_child): _refresh.call_deferred())
	_refresh()

func get_part(part: String) -> Control:
	if not configuration.get("parts", []).has(part): return null
	return get_node_or_null("Chrome/Body/Part_%s/Slot" % part) as Control

func _hover_entered() -> void:
	hovered = true
	_refresh()

func _hover_exited() -> void:
	hovered = false
	_refresh()

func _axis_value(axis: String) -> String:
	if axis_values.has(axis): return str(axis_values[axis])
	match axis:
		"variant": if not variant.is_empty(): return variant
		"intent": if not intent.is_empty(): return intent
		"size": if not size_axis.is_empty(): return size_axis
		"density": if not density.is_empty(): return density
		"interactive": return "true" if interactive else "false"
	var authored = configuration.get("defaults", {}).get(axis, "")
	if str(authored).is_empty(): return ""
	var parsed = JSON.parse_string(str(authored))
	return str(parsed) if parsed != null else ""

func _active_rules() -> Array:
	var active: Array = []
	for rule in configuration.get("styles", []):
		var matches := true
		for predicate in rule.get("predicates", []):
			if predicate.get("kind") == "variant":
				if _axis_value(predicate.get("axis", "")) != predicate.get("value", ""):
					matches = false
					break
			elif predicate.get("kind") == "hover":
				if not hovered:
					matches = false
					break
			else:
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
		push_error("GODOT_COMPOSITE_TOKEN_CYCLE: " + token)
		return ""
	var next_stack := visiting.duplicate()
	next_stack.append(token)
	return _resolve(definitions[token], definitions, next_stack)

func _properties(part: String, active: Array) -> Dictionary:
	var definitions: Dictionary = {}
	var selected: Dictionary = {}
	for rule in active:
		for declaration in rule.get("declarations", []):
			var property: String = declaration.property
			if property.contains("."):
				if rule.get("part") == "root" or rule.get("part") == part:
					definitions[property] = declaration
			elif rule.get("part") == part:
				# A later shorthand resets earlier box-model axis defaults.
				if property == "padding":
					selected.erase("padding-block")
					selected.erase("padding-inline")
				selected[property] = declaration
	var resolved: Dictionary = {}
	for property in selected:
		resolved[property] = _resolve(selected[property], definitions, [])
	return resolved

func _pixels(raw: String) -> float:
	if raw.ends_with("rem"): return raw.trim_suffix("rem").to_float() * 16.0
	if raw.ends_with("px"): return raw.trim_suffix("px").to_float()
	return raw.to_float()

func _stylebox(style: Dictionary) -> StyleBoxFlat:
	var box := StyleBoxFlat.new()
	box.bg_color = Color(style.get("background-color", "transparent"))
	box.border_color = Color(style.get("border-color", "transparent"))
	box.set_border_width_all(maxi(0, roundi(_pixels(style.get("border-width", "0px")))))
	box.set_corner_radius_all(maxi(0, roundi(_pixels(style.get("border-radius", "0px")))))
	var all_padding := _pixels(style.get("padding", "0px"))
	var block := _pixels(style.get("padding-block", str(all_padding)))
	var inline := _pixels(style.get("padding-inline", str(all_padding)))
	box.content_margin_top = block
	box.content_margin_bottom = block
	box.content_margin_left = inline
	box.content_margin_right = inline
	return box

func _has_visible_content(slot: Control) -> bool:
	for child in slot.get_children():
		if child is CanvasItem and child.visible:
			return true
	return false

func _refresh() -> void:
	if not is_inside_tree() or not is_instance_valid(chrome) or not is_instance_valid(body): return
	var active := _active_rules()
	var root_style := _properties("root", active)
	chrome.add_theme_stylebox_override("panel", _stylebox(root_style))
	chrome.custom_minimum_size.y = _pixels(root_style.get("min-height", "0px"))
	body.add_theme_constant_override("separation", maxi(0, roundi(_pixels(root_style.get("gap", "0px")))))
	if is_instance_valid(content_label):
		content_label.text = content
		content_label.visible = not content.is_empty()
	for part in configuration.get("parts", []):
		var panel := get_node_or_null("Chrome/Body/Part_%s" % part) as PanelContainer
		var slot := get_part(part) as BoxContainer
		if panel == null or slot == null: continue
		var style := _properties(part, active)
		panel.add_theme_stylebox_override("panel", _stylebox(style))
		panel.custom_minimum_size.y = _pixels(style.get("min-height", "0px"))
		slot.add_theme_constant_override("separation", maxi(0, roundi(_pixels(style.get("gap", "0px")))))
		panel.visible = _has_visible_content(slot)
	if is_instance_valid(content_label):
		var text_style := _properties(configuration.get("contentPart", ""), active)
		content_label.add_theme_color_override("font_color", Color(text_style.get("color", root_style.get("color", "#141414"))))
		content_label.add_theme_font_size_override("font_size", roundi(_pixels(text_style.get("font-size", root_style.get("font-size", "16px")))))
		var font := SystemFont.new()
		font.font_weight = int(text_style.get("font-weight", root_style.get("font-weight", "400")))
		content_label.add_theme_font_override("font", font)
