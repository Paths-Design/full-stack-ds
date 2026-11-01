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
## Structural ARIA state: the DOM binding the anatomy declares for this control
## (`aria-expanded`), projected onto the native control. The Godot accessibility
## tree is not populated by this project, so this is a structural projection, not
## assistive-technology delivery.
@export var aria_expanded: bool = false
## Dismissal gates, initialized from the contract's declared default expressions
## (`closeOnEscape` / `closeOnOutsideClick` / `closeOnBlur`) and overridable by the
## consumer. Only surface-shaped controls consult them.
@export var close_on_escape: bool = true
@export var close_on_outside_click: bool = true
@export var close_on_blur: bool = true
## Activation mode for selection controls: `automatic` selects the item the focus
## ring lands on, `manual` moves focus only and waits for an explicit activation.
@export var activation_mode: String = "automatic"
## Declared form-state props, projected as structural state (validation itself is
## the consumer's responsibility).
@export var required: bool = false:
	set(next):
		required = next
		_refresh()
@export var invalid: bool = false:
	set(next):
		invalid = next
		_refresh()
## Accessibility labeling props: a node path the label/description node the
## consumer owns. Godot exposes no accessible-role property.
@export var aria_labelledby: String = "":
	set(next):
		aria_labelledby = next
		_wire_declared_aria("labelled")
@export var aria_describedby: String = "":
	set(next):
		aria_describedby = next
		_wire_declared_aria("described")
var trigger: Button
var items: Array[Dictionary] = []
var strip: BoxContainer
var content: VBoxContainer
var surface: PanelContainer
var overlay: CanvasLayer
var operation: String
var collapsible := true
var disclosure: Dictionary = {}
## Projected native style declarations from the contract (typography, focus ring,
## opacity, cursor, hit testing). Applied to the trigger, the item buttons and the
## text nodes consumer content mounts under an item body.
var style_facts: Dictionary = {}
## Accessibility facts projected from the contract: labeling attributes, the
## authored role, the state-to-ARIA projection and the part relationships.
var accessibility: Dictionary = {}
## Whether `accessibility_name` is still derived from the visible label; a consumer
## assignment clears it so the runtime stops overwriting their value.
var _a11y_name_from_label := false
var _last_label := ""
## Whether focus has entered the revealed surface since it opened; blur dismissal
## only fires after that, so opening a surface from an unrelated focus owner does
## not close it on the first frame.
var _surface_focused := false

func _ready() -> void:
	operation = configuration.get("operation", "boolean")
	collapsible = JSON.parse_string(configuration.get("defaults", {}).get("collapsible", "false"))
	disclosure = configuration.get("disclosure", {})
	accessibility = configuration.get("accessibility", {})
	close_on_escape = _default_bool("closeOnEscape", close_on_escape)
	close_on_outside_click = _default_bool("closeOnOutsideClick", close_on_outside_click)
	close_on_blur = _default_bool("closeOnBlur", close_on_blur)
	required = _default_bool("required", required)
	invalid = _default_bool("invalid", invalid)
	aria_labelledby = _default_string("ariaLabelledby", aria_labelledby)
	aria_describedby = _default_string("ariaDescribedby", aria_describedby)
	var raw_mode = configuration.get("defaults", {}).get("activationMode", "")
	if raw_mode is String and not raw_mode.is_empty():
		var declared_mode = JSON.parse_string(raw_mode)
		if declared_mode is String: activation_mode = declared_mode
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
	style_facts = _collect_style_facts()
	_apply_style_facts()
	_apply_focus_ring()
	_apply_accessibility()
	_wire_declared_aria("labelled")
	_wire_declared_aria("described")
	_refresh()

## Read a declared default expression as a boolean, falling back when the
## component does not declare the prop at all.
## Read a declared default expression as a string, empty when absent.
func _default_string(prop: String, fallback: String) -> String:
	var raw = configuration.get("defaults", {}).get(prop, "")
	if not (raw is String) or raw.is_empty(): return fallback
	var parsed = JSON.parse_string(raw)
	return parsed if parsed is String else fallback

func _default_bool(prop: String, fallback: bool) -> bool:
	var raw = configuration.get("defaults", {}).get(prop, null)
	if raw == null: return fallback
	var parsed = JSON.parse_string(raw)
	return parsed if parsed is bool else fallback


## Collect the projected control style declarations, keyed by the part they
## address: the runtime hosts `root`/`trigger` (the trigger and item buttons) and
## `content`/`contentInner` (the text under an item body). Rules for other parts
## are omitted by the planner, never dropped here.
func _collect_style_facts() -> Dictionary:
	var facts := {}
	for rule in configuration.get("styles", []):
		if not (rule.get("predicates", []) as Array).is_empty(): continue
		var part: String = rule.get("part", "root")
		var table: Dictionary = facts.get(part, {})
		for declaration in rule.get("declarations", []):
			table[declaration.get("property", "")] = declaration.get("value", "")
		facts[part] = table
	return facts

func _px(value: String) -> float:
	var parsed := value.trim_suffix("px")
	return float(parsed) if parsed.is_valid_float() else -1.0

## Apply the collected directives to the trigger and any mounted item buttons.
func _apply_style_facts() -> void:
	var control_table: Dictionary = style_facts.get("trigger", style_facts.get("root", {}))
	for item in items: _apply_control_style(item.button, control_table)
	_apply_control_style(trigger, control_table)
	for item in items:
		_apply_text_style(item.body, style_facts.get("contentInner", style_facts.get("content", {})))

func _apply_style_to(node: Control) -> void:
	if not is_instance_valid(node): return
	_apply_control_style(node, style_facts.get("trigger", style_facts.get("root", {})))

func _apply_control_style(node: Control, table: Dictionary) -> void:
	if not is_instance_valid(node) or table.is_empty(): return
	var font_size := _px(table.get("font-size", ""))
	if font_size > 0: node.add_theme_font_size_override("font_size", int(font_size))
	var color: String = table.get("color", "")
	if color.begins_with("#"): node.add_theme_color_override("font_color", Color(color))
	var opacity: String = table.get("opacity", "")
	if opacity.is_valid_float(): node.modulate.a = float(opacity)
	match table.get("cursor", ""):
		"pointer": node.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
		"not-allowed": node.mouse_default_cursor_shape = Control.CURSOR_FORBIDDEN
		"text": node.mouse_default_cursor_shape = Control.CURSOR_IBEAM
		"default": node.mouse_default_cursor_shape = Control.CURSOR_ARROW
	if table.get("pointer-events", "") == "none":
		node.mouse_filter = Control.MOUSE_FILTER_IGNORE

## Text-level directives apply to the label nodes under a hosted content part:
## line spacing and horizontal alignment have no Control-level property.
func _apply_text_style(node: Node, table: Dictionary) -> void:
	if not is_instance_valid(node): return
	if node is Label and not table.is_empty():
		var spacing := _px(table.get("line-height", ""))
		if spacing > 0: node.add_theme_constant_override("line_spacing", int(spacing))
		var color: String = table.get("color", "")
		if color.begins_with("#"): node.add_theme_color_override("font_color", Color(color))
		var size := _px(table.get("font-size", ""))
		if size > 0: node.add_theme_font_size_override("font_size", int(size))
		match table.get("text-align", ""):
			"center": node.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
			"right": node.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
			"left": node.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
			"justify": node.horizontal_alignment = HORIZONTAL_ALIGNMENT_FILL
	for child in node.get_children(): _apply_text_style(child, table)

## Focus ring: the contract's `:focus-visible` outline declarations become the
## native focus StyleBox. Width/colour/offset only — outline-style is not
## differentiated, and a focus ring is a focus state, not a conditional style.
func _apply_focus_ring() -> void:
	if not is_instance_valid(trigger): return
	var ring_facts: Dictionary = configuration.get("focusRing", {})
	var width := _px(ring_facts.get("width", ""))
	if width <= 0: return
	var ring := StyleBoxFlat.new()
	ring.draw_center = false
	var color: String = ring_facts.get("color", "#ffffff")
	ring.border_color = Color(color) if color.begins_with("#") else Color("#ffffff")
	ring.border_width_left = int(width)
	ring.border_width_top = int(width)
	ring.border_width_right = int(width)
	ring.border_width_bottom = int(width)
	var offset := _px(ring_facts.get("offset", ""))
	if offset > 0:
		ring.expand_margin_left = offset
		ring.expand_margin_top = offset
		ring.expand_margin_right = offset
		ring.expand_margin_bottom = offset
	trigger.add_theme_stylebox_override("focus", ring)

## Accessibility projection: the accessible name carries the visible label, and
## the contract's part relationships become native node relations. Godot exposes
## no accessible-role property, so the authored role stays a boundary refusal.
func _apply_accessibility() -> void:
	if not is_instance_valid(trigger): return
	if trigger.accessibility_name.is_empty():
		trigger.accessibility_name = label
		_a11y_name_from_label = true
	_last_label = label
	for relation in accessibility.get("relationships", []):
		# Item-scoped relations (tab↔panel, trigger↔region) are wired per item so
		# every item carries its own relation rather than only the first.
		var pairs := _relation_nodes(String(relation.get("from", "")), String(relation.get("to", "")))
		for pair in pairs:
			_wire_relation(pair[0], pair[1], String(relation.get("attribute", "")))

func _relation_nodes(from_part: String, to_part: String) -> Array:
	if not items.is_empty() and _is_item_part(from_part) and _is_item_part(to_part):
		var pairs: Array = []
		for item in items: pairs.append([_item_node(item, from_part), _item_node(item, to_part)])
		return pairs
	var from_node := _node_for_part(from_part)
	var to_node := _node_for_part(to_part)
	return [[from_node, to_node]] if from_node != null and to_node != null else []

func _is_item_part(part: String) -> bool:
	return part in ["tab", "panel", "trigger", "content", "summary", "region"]

## The node inside one item that a contract part refers to: the trigger-like part
## is the item button, the content-like part is the revealed body.
func _item_node(item: Dictionary, part: String) -> Control:
	if part in ["tab", "panel", "content", "region", "body"]: return item.body
	return item.button

func _wire_relation(from_node: Control, to_node: Control, attribute: String) -> void:
	if from_node == null or to_node == null: return
	# The native accessibility relations are NodePath arrays, not node references.
	var target := to_node.get_path()
	match attribute:
		"aria-controls":
			var controls: Array[NodePath] = from_node.accessibility_controls_nodes.duplicate()
			if not controls.has(target): controls.append(target)
			from_node.accessibility_controls_nodes = controls
		"aria-labelledby":
			var labelled: Array[NodePath] = from_node.accessibility_labeled_by_nodes.duplicate()
			if not labelled.has(target): labelled.append(target)
			from_node.accessibility_labeled_by_nodes = labelled
		"aria-describedby":
			var described: Array[NodePath] = from_node.accessibility_described_by_nodes.duplicate()
			if not described.has(target): described.append(target)
			from_node.accessibility_described_by_nodes = described


## Wire the declared labeling props (node paths the consumer owns) onto the
## trigger's native accessibility relations. Unresolvable paths leave the
## relation untouched rather than inventing a target.
func _wire_declared_aria(kind: String) -> void:
	if not is_instance_valid(trigger): return
	var raw: String = aria_labelledby if kind == "labelled" else aria_describedby
	if raw.is_empty(): return
	var target := get_node_or_null(NodePath(raw))
	if target == null: return
	var path := target.get_path()
	if kind == "labelled":
		var labelled: Array[NodePath] = trigger.accessibility_labeled_by_nodes.duplicate()
		if not labelled.has(path): labelled.append(path)
		trigger.accessibility_labeled_by_nodes = labelled
	else:
		var described: Array[NodePath] = trigger.accessibility_described_by_nodes.duplicate()
		if not described.has(path): described.append(path)
		trigger.accessibility_described_by_nodes = described

## Resolve a contract part to the node the control runtime hosts for it. Parts the
## runtime does not host resolve to null and their relation is simply not wired —
## the planner names that gap in the receipt, it is never a silent drop here.
func _node_for_part(part: String) -> Control:
	match part:
		"trigger", "summary", "tab", "button":
			if not items.is_empty() and operation in ["select", "toggle-item"]:
				return items[0].button
			return trigger
		"content", "panel", "region", "body":
			if is_instance_valid(surface): return surface
			if not items.is_empty(): return items[0].body
			return content
		"root":
			return self
	return null

func _refresh() -> void:
	if not is_instance_valid(trigger): return
	trigger.text = label
	if _a11y_name_from_label and trigger.accessibility_name == _last_label:
		trigger.accessibility_name = label
	_last_label = label
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
	aria_expanded = operation == "surface" and value == "true"
	_refresh_disclosure_state()

## Structural disclosure state on the native controls: an overlay trigger reports
## aria-expanded/aria-controls, a select reports aria-selected per item and a
## toggle-item reports aria-expanded per item — the states the DOM bindings carry.
## The Godot accessibility tree is not populated by this project, so these are
## structural projections, not assistive-technology delivery.
func _refresh_disclosure_state() -> void:
	if not is_instance_valid(trigger): return
	trigger.set_meta("aria_expanded", aria_expanded)
	trigger.set_meta("aria_controls", operation == "surface")
	trigger.set_meta("aria_disabled", disabled)
	trigger.set_meta("aria_required", required)
	trigger.set_meta("aria_invalid", invalid)
	if operation == "boolean": trigger.set_meta("aria_checked", value == "true")
	for item in items:
		item.button.set_meta("aria_selected", operation == "select" and value == item.key)
		item.button.set_meta("aria_expanded", operation == "toggle-item" and value == item.key)
		item.button.set_meta("aria_disabled", disabled or item.disabled)
	# Authored state-to-ARIA projection: each declared state dimension maps its
	# semantic value onto the accessible attribute the contract names.
	for entry in accessibility.get("stateAria", []):
		var category: String = entry.get("category", "")
		var attribute: String = String(entry.get("attribute", "")).replace("-", "_")
		var values: Dictionary = entry.get("values", {})
		if category == "disclosure":
			trigger.set_meta(attribute, _aria_value(values.get("open" if aria_expanded else "closed", aria_expanded), aria_expanded))
		elif category == "selection":
			for item in items:
				item.button.set_meta(attribute, _aria_value(values.get("selected" if value == item.key else "unselected", value == item.key), value == item.key))
		elif category == "availability":
			trigger.set_meta(attribute, _aria_value(values.get("disabled" if disabled else "enabled", disabled), disabled))

## Authored ARIA state values are strings ("true"/"false"); the structural meta
## keeps the native boolean so consumers and witnesses read one type.
func _aria_value(raw, fallback):
	if raw is bool: return raw
	if raw is String:
		if raw == "true": return true
		if raw == "false": return false
	return fallback

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
	_apply_style_to(button)
	_apply_text_style(panel, style_facts.get("contentInner", style_facts.get("content", {})))
	# Item-scoped accessibility relations can only be wired once the item exists.
	_apply_accessibility()
	if operation == "select" and value.is_empty() and not locked: value = key
	_refresh()

func _show_surface() -> void:
	if is_instance_valid(overlay): return
	overlay = CanvasLayer.new()
	overlay.name = "SurfaceLayer"
	add_child(overlay)
	surface = PanelContainer.new()
	surface.theme = theme
	overlay.add_child(surface)
	content.reparent(surface)
	content.show()
	surface.size = Vector2(280, 90)
	var viewport_size := get_viewport_rect().size
	surface.position = Vector2(clampf(global_position.x, 0, maxf(0, viewport_size.x - 280)), clampf(global_position.y + size.y + 4, 0, maxf(0, viewport_size.y - 90)))
	_focus_initial()

## Focus facts: `initialFocus` names the part that receives focus when the
## component opens. `trigger`/`tab` focus the invoking control; anything else is
## deferred to the platform so the runtime does not invent a target.
func _focus_initial() -> void:
	var target = disclosure.get("focus", {}).get("initialFocus", "")
	if target in ["trigger", "tab", "summary"]:
		if is_instance_valid(trigger): trigger.grab_focus()
	elif target != "" and not items.is_empty():
		items[0].button.grab_focus()

## Focusable controls the roving/manual strategy moves between.
func _focus_targets() -> Array:
	var targets: Array = []
	if operation in ["select", "toggle-item"]:
		for item in items:
			if not item.button.disabled: targets.append(item.button)
	elif is_instance_valid(trigger):
		targets.append(trigger)
	return targets

## Roving/manual focus: move the focus ring by one control in `direction`,
## honouring the declared orientation and wrap behaviour. Focus only moves; it
## never activates the control, so activation stays with the native input path.
func _move_focus(direction: int) -> bool:
	var targets := _focus_targets()
	if targets.is_empty(): return false
	var owner := get_viewport().gui_get_focus_owner()
	var index := targets.find(owner)
	var wrap: bool = disclosure.get("focus", {}).get("wrap", false)
	if index == -1:
		index = 0 if direction > 0 else targets.size() - 1
	else:
		index += direction
		if index >= targets.size(): index = 0 if wrap else targets.size() - 1
		elif index < 0: index = targets.size() - 1 if wrap else 0
	targets[index].grab_focus()
	if activation_mode == "automatic" and operation == "select":
		for item in items:
			if item.button == targets[index]: activate(item.key)
	return true

func dismiss() -> void:
	if operation != "surface" or value != "true": return
	_surface_focused = false
	if not controlled: value = "false"
	value_requested.emit("false")
	if is_instance_valid(trigger): trigger.grab_focus()

## Disclosure keyboard handling runs in `_input`, ahead of Godot's built-in
## directional focus navigation, so the contract's own focus strategy decides
## where the focus ring goes. Escape dismissal and arrow navigation both live here.
func _handle_disclosure_key(event: InputEventKey) -> void:
	if operation == "surface" and value == "true" and event.keycode == KEY_ESCAPE and close_on_escape:
		dismiss()
		get_viewport().set_input_as_handled()
		return
	var focus_facts: Dictionary = disclosure.get("focus", {})
	var strategy: String = focus_facts.get("strategy", "auto")
	if not strategy in ["roving", "manual"]: return
	var targets := _focus_targets()
	if not targets.has(get_viewport().gui_get_focus_owner()): return
	var orientation: String = focus_facts.get("orientation", "both")
	var direction := 0
	match event.keycode:
		KEY_RIGHT: direction = 1 if orientation in ["horizontal", "both"] else 0
		KEY_LEFT: direction = -1 if orientation in ["horizontal", "both"] else 0
		KEY_DOWN: direction = 1 if orientation in ["vertical", "both"] else 0
		KEY_UP: direction = -1 if orientation in ["vertical", "both"] else 0
	if direction == 0: return
	if _move_focus(direction): get_viewport().set_input_as_handled()

## Outside-click dismissal for anchored surfaces. The dismissal triggers and
## their gating props come from the contract; this runtime only honours the
## trigger events the contract declares.
func _input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		_handle_disclosure_key(event)
		return
	if operation != "surface" or value != "true": return
	if not event is InputEventMouseButton: return
	if not event.pressed: return
	if not close_on_outside_click: return
	if not is_instance_valid(surface): return
	if surface.get_global_rect().has_point(event.position): return
	dismiss()
	get_viewport().set_input_as_handled()

## Focus-leave dismissal for surfaces whose contract declares it: focus moving to
## a control outside the trigger and the revealed content closes the surface.
func _process(_delta: float) -> void:
	if operation != "surface" or value != "true" or not close_on_blur: return
	if not is_instance_valid(overlay) or not is_instance_valid(surface): return
	var owner := get_viewport().gui_get_focus_owner()
	if owner == null: return
	if surface.is_ancestor_of(owner):
		_surface_focused = true
		return
	if owner == trigger: return
	if _surface_focused: dismiss()

func _exit_tree() -> void:
	if is_instance_valid(overlay): overlay.queue_free()
