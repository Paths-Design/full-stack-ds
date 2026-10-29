@tool
extends VBoxContainer

# One runtime for passive text and rule shapes. The generated configuration
# carries source-bearing style rules; no component identity is inspected here.
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
@export var weight: String = "":
	set(next):
		weight = next
		_refresh()
@export var align: String = "":
	set(next):
		align = next
		_refresh()
@export var transform: String = "":
	set(next):
		transform = next
		_refresh()
@export var truncate: bool = false:
	set(next):
		truncate = next
		_refresh()
@export_enum("horizontal", "vertical") var orientation: String = "horizontal":
	set(next):
		orientation = next
		_refresh()
@export var decorative: bool = false
@export var thickness: String = "":
	set(next):
		thickness = next
		_refresh()
@export var title: String = "":
	set(next):
		title = next
		_refresh()

var rendered: Control
var host: Control

func _ready() -> void:
	_refresh()

func _axis_value(axis: String) -> String:
	match axis:
		"variant": return variant
		"size": return size_axis
		"weight": return weight
		"align": return align
		"transform": return transform
		"orientation": return orientation
	return ""

func _properties() -> Dictionary:
	var result: Dictionary = {}
	for rule in configuration.get("styles", []):
		var active := true
		for predicate in rule.get("predicates", []):
			if predicate.get("kind") != "variant" or _axis_value(predicate.get("axis", "")) != predicate.get("value", ""):
				active = false
				break
		if not active: continue
		for declaration in rule.get("declarations", []):
			result[declaration.property] = declaration.value
	return result

func _pixels(raw: String) -> float:
	if raw.ends_with("rem"): return raw.trim_suffix("rem").to_float() * 16.0
	if raw.ends_with("px"): return raw.trim_suffix("px").to_float()
	return raw.to_float()

func _refresh() -> void:
	if not is_inside_tree(): return
	var operation: String = configuration.get("operation", "")
	if operation != "rule" and operation != "static-text": return
	if is_instance_valid(host):
		remove_child(host)
		host.queue_free()
	var style := _properties()
	if operation == "static-text":
		var label := Label.new()
		var shown := content
		match transform:
			"uppercase": shown = shown.to_upper()
			"lowercase": shown = shown.to_lower()
			"capitalize": shown = shown.capitalize()
		label.text = shown
		label.autowrap_mode = TextServer.AUTOWRAP_OFF if truncate else TextServer.AUTOWRAP_WORD_SMART
		label.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS if truncate else TextServer.OVERRUN_NO_TRIMMING
		match align:
			"center": label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
			"right": label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
			"justify": label.horizontal_alignment = HORIZONTAL_ALIGNMENT_FILL
			_: label.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
		if style.has("color"): label.add_theme_color_override("font_color", Color(style.color))
		if style.has("font-size"): label.add_theme_font_size_override("font_size", roundi(_pixels(style["font-size"])))
		if style.has("font-weight") or style.has("letter-spacing"):
			var font := SystemFont.new()
			font.font_weight = int(style.get("font-weight", "400"))
			if style.has("letter-spacing"):
				var variation := FontVariation.new()
				variation.base_font = font
				variation.spacing_glyph = roundi(_pixels(style["letter-spacing"]))
				label.add_theme_font_override("font", variation)
			else:
				label.add_theme_font_override("font", font)
		if style.has("line-height"):
			var font_size := _pixels(style.get("font-size", "1rem"))
			label.add_theme_constant_override("line_spacing", roundi(font_size * (style["line-height"].to_float() - 1.0)))
		label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		rendered = label
		host = label
	else:
		var rule := ColorRect.new()
		var side := "border-left-color" if orientation == "vertical" else "border-top-color"
		rule.color = Color(style.get(side, "#d0d0d0"))
		var width_side := "border-left-width" if orientation == "vertical" else "border-top-width"
		var pixels := maxf(1.0, _pixels(thickness if not thickness.is_empty() else style.get(width_side, "1px")))
		if orientation == "vertical":
			rule.custom_minimum_size = Vector2(pixels, 16.0)
			rule.size_flags_vertical = Control.SIZE_EXPAND_FILL
		else:
			rule.custom_minimum_size = Vector2(0.0, pixels)
			rule.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		rule.mouse_filter = Control.MOUSE_FILTER_IGNORE
		rule.tooltip_text = title
		rendered = rule
		var margins := MarginContainer.new()
		for edge in ["left", "right", "top", "bottom"]:
			var margin := 0.0
			if (orientation == "vertical" and edge in ["left", "right"]) or (orientation == "horizontal" and edge in ["top", "bottom"]):
				margin = _pixels(style.get("margin-" + edge, "0px"))
			margins.add_theme_constant_override("margin_" + edge, roundi(margin))
		margins.add_child(rule)
		host = margins
	add_child(host)
