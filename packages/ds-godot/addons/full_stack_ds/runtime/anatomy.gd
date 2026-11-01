@tool
extends Control

## Shared base for generated generic-anatomy scenes.
##
## The generated scene owns the structure: one named host per contract part,
## flattened to the nearest declared part, with the consumer content region
## exposed by `contentPart`. This runtime owns only what every anatomy shape
## needs: the configuration mount, part-host lookup, a generic contract-prop
## store, and the painted/typographic subset of the projected style rules.
##
## It inspects no component identity. Part names, style rules, projected prop
## names and the excluded/omitted facts all arrive from the planner through
## `configuration`; the emitted capability receipt carries the same data, so a
## consumer can tell exactly which contract facts this target does not lower.

signal prop_changed(prop: String, value: Variant)

var configuration: Dictionary = {}
## Contract prop values a consumer sets through `set_contract_prop`.
var props: Dictionary = {}
## Variant axis values; defaults to `props`, overridable per axis.
var axis_values: Dictionary = {}

var _root_stylebox: StyleBoxFlat
var _theme_base: Theme
## Focus outlines projected from the contract's `:focus-visible` rules, keyed by
## the part host they belong to. The host becomes focusable; the ring is painted
## by this runtime so a non-Button host can still show focus.
var _focus_rings: Dictionary = {}
var _focus_ring_active: Control = null

func _ready() -> void:
	_theme_base = theme
	refresh()
	_apply_focus_rings()

## Mount nothing; the scene tree is generated. Re-resolve the projected styles.
func refresh() -> void:
	if not is_inside_tree():
		return
	var active := _active_rules()
	_apply_root(_properties("root", active))
	for part in configuration.get("parts", []):
		var style := _properties(str(part), active)
		for host in _part_hosts(str(part)):
			_apply_host(host, style)

func set_contract_prop(prop: String, value: Variant) -> void:
	props[prop] = value
	axis_values[prop] = value
	prop_changed.emit(prop, value)
	refresh()

func get_contract_prop(prop: String) -> Variant:
	return props.get(prop)

## The first generated host for a contract part (self for the root region).
func get_part(part: String) -> Control:
	if part == "root":
		return self
	var hosts := _part_hosts(part)
	return hosts[0] if not hosts.is_empty() else null

## Every generated host for a part, in scene order. Repeated parts (a contract
## part that appears more than once) are named `<part>`, `<part>_2`, ...
func get_parts() -> Dictionary:
	var result := {}
	for part in configuration.get("parts", []):
		var host := get_part(str(part))
		if host != null:
			result[part] = host
	return result

func _part_hosts(part: String) -> Array[Control]:
	var found: Array[Control] = []
	if part == "root":
		found.append(self)
		return found
	var direct := find_child(part, true, false)
	if direct is Control:
		found.append(direct as Control)
	for child in find_children(part + "_*", "", true, false):
		if child is Control and not found.has(child):
			found.append(child)
	return found

func _axis_value(axis: String) -> String:
	if axis_values.has(axis):
		return str(axis_values[axis])
	if props.has(axis):
		return str(props[axis])
	return ""

func _active_rules() -> Array:
	var active: Array = []
	for rule in configuration.get("styles", []):
		var matches := true
		for predicate in rule.get("predicates", []):
			if predicate.get("kind") != "variant" or _axis_value(predicate.get("axis", "")) != predicate.get("value", ""):
				matches = false
				break
		if matches:
			active.append(rule)
	return active

func _resolve(declaration: Dictionary, definitions: Dictionary, visiting: Array[String]) -> String:
	var property: String = declaration.get("property", "")
	var token: String = declaration.get("token", "")
	if token.is_empty():
		return str(declaration.get("value", ""))
	if not definitions.has(token):
		return str(declaration.get("value", ""))
	if visiting.has(token):
		push_error("GODOT_ANATOMY_TOKEN_CYCLE: " + token)
		return ""
	var next_stack: Array[String] = visiting.duplicate()
	next_stack.append(token)
	return _resolve(definitions[token], definitions, next_stack)

## Declarations for one part: dotted properties are token definitions shared by
## the rules that target the root or this part; plain properties are the painted
## style subset the planner projected.
func _properties(part: String, active: Array) -> Dictionary:
	var definitions := {}
	var selected := {}
	for rule in active:
		for declaration in rule.get("declarations", []):
			var property: String = declaration.property
			if property.contains("."):
				if rule.get("part") == "root" or rule.get("part") == part:
					definitions[property] = declaration
			elif rule.get("part") == part:
				selected[property] = declaration
	var resolved := {}
	for property in selected:
		resolved[property] = _resolve(selected[property], definitions, [])
	return resolved

## The generated root may be a container, a label or a control. The script's
## own base is `Control`, so capability is a runtime cast rather than a static
## subclass test (a script type cannot be tested with `is` against a native
## class).
func _box(control: Control) -> BoxContainer:
	return control as BoxContainer

func _panel(control: Control) -> PanelContainer:
	return control as PanelContainer

func _apply_root(style: Dictionary) -> void:
	var root := _box(self)
	if root != null:
		root.add_theme_constant_override("separation", maxi(0, roundi(_pixels(style.get("gap", "0px")))))
		# A container root paints its own panel behind its generated hosts, and
		# propagates its typography to the descendant labels through the theme.
		var painted: bool = style.has("background-color") or style.has("border-color") or style.has("border-width") or style.has("border-radius")
		_root_stylebox = _stylebox(style) if painted else null
		queue_redraw()
		_apply_typography(self, style, true)
	custom_minimum_size.y = _pixels(style.get("min-height", "0px"))
	if root == null:
		_apply_typography(self, style, false)

func _draw() -> void:
	if _root_stylebox != null:
		draw_style_box(_root_stylebox, Rect2(Vector2.ZERO, size))
	if _focus_ring_active != null and _focus_rings.has(_focus_ring_active):
		draw_style_box(_focus_ring_box(_focus_rings[_focus_ring_active]), _focus_ring_rect(_focus_ring_active))

## Make each projected focus part focusable and remember its outline. The ring is
## painted in this runtime's own coordinates, so a host of any Control subclass
## can show focus without being a Button.
func _apply_focus_rings() -> void:
	for ring in configuration.get("focusRings", []):
		var host := get_part(str(ring.get("part", "")))
		if host == null or host == self: continue
		host.focus_mode = Control.FOCUS_ALL
		_focus_rings[host] = ring
		if not host.focus_entered.is_connected(_on_focus_ring_entered):
			host.focus_entered.connect(_on_focus_ring_entered.bind(host))
		if not host.focus_exited.is_connected(_on_focus_ring_exited):
			host.focus_exited.connect(_on_focus_ring_exited.bind(host))

func _on_focus_ring_entered(host: Control) -> void:
	_focus_ring_active = host
	queue_redraw()

## Whether a projected focus ring is currently shown (witness hook).
func has_focus_ring() -> bool:
	return _focus_ring_active != null

func _on_focus_ring_exited(host: Control) -> void:
	if _focus_ring_active == host: _focus_ring_active = null
	queue_redraw()

func _focus_ring_rect(host: Control) -> Rect2:
	var origin := get_global_transform().affine_inverse() * host.global_position
	return Rect2(origin, host.size)

func _focus_ring_box(ring: Dictionary) -> StyleBoxFlat:
	var box := StyleBoxFlat.new()
	box.draw_center = false
	var color := str(ring.get("color", "#ffffff"))
	box.border_color = Color(color) if color.begins_with("#") else Color("#ffffff")
	var width := int(ring.get("width", 2))
	box.border_width_left = width
	box.border_width_top = width
	box.border_width_right = width
	box.border_width_bottom = width
	var offset := int(ring.get("offset", 0))
	if offset > 0:
		box.expand_margin_left = offset
		box.expand_margin_top = offset
		box.expand_margin_right = offset
		box.expand_margin_bottom = offset
	return box

func _apply_host(host: Control, style: Dictionary) -> void:
	var box := _box(host)
	if box != null:
		box.add_theme_constant_override("separation", maxi(0, roundi(_pixels(style.get("gap", "0px")))))
	host.custom_minimum_size.y = _pixels(style.get("min-height", "0px"))
	var panel := _panel(host)
	if panel != null:
		panel.add_theme_stylebox_override("panel", _stylebox(style))
	elif host is Label or host is Button or host is LineEdit or host is TextEdit or host is CheckBox:
		_apply_typography(host, style, false)

## Root typography propagates through a cloned theme so descendant labels pick
## it up; a specific text host applies the same declarations directly.
func _apply_typography(host: Control, style: Dictionary, propagate: bool) -> void:
	var color: Variant = style.get("color")
	var font_size: Variant = style.get("font-size")
	var font_weight: Variant = style.get("font-weight")
	if color == null and font_size == null and font_weight == null:
		return
	if propagate:
		var base: Theme = _theme_base.duplicate() if _theme_base != null else Theme.new()
		if color != null:
			base.set_color("font_color", "Label", Color(str(color)))
		if font_size != null:
			base.set_font_size("font_size", "Label", roundi(_pixels(str(font_size))))
		if font_weight != null:
			var propagated := SystemFont.new()
			propagated.font_weight = int(font_weight)
			base.set_font("font", "Label", propagated)
		theme = base
		return
	if color != null:
		host.add_theme_color_override("font_color", Color(str(color)))
	if font_size != null:
		host.add_theme_font_size_override("font_size", roundi(_pixels(str(font_size))))
	if font_weight != null:
		var font := SystemFont.new()
		font.font_weight = int(font_weight)
		host.add_theme_font_override("font", font)

func _pixels(raw: String) -> float:
	if raw.ends_with("rem"):
		return raw.trim_suffix("rem").to_float() * 16.0
	if raw.ends_with("px"):
		return raw.trim_suffix("px").to_float()
	return raw.to_float()

func _stylebox(style: Dictionary) -> StyleBoxFlat:
	var box := StyleBoxFlat.new()
	box.bg_color = Color(str(style.get("background-color", "transparent")))
	box.border_color = Color(str(style.get("border-color", "transparent")))
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
