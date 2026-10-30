@tool
extends VBoxContainer

# One renderer for every component with an admitted iconGlyph fact. The
# generated plan supplies prop identities and sizes; the generated catalog
# supplies exact authored paths. No component identity is read here.
var configuration: Dictionary = {}
@export var glyph_name: String = "":
	set(next):
		glyph_name = next
		_refresh()
@export var size_axis: String = "":
	set(next):
		size_axis = next
		_refresh()
@export var decorative: bool = true:
	set(next):
		decorative = next
		_refresh()
@export var aria_label: String = "":
	set(next):
		aria_label = next
		_refresh()

var rendered: TextureRect
var selected_grid := 0
var _catalog: Dictionary = {}

func _ready() -> void:
	rendered = TextureRect.new()
	rendered.name = "Glyph"
	rendered.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	rendered.stretch_mode = TextureRect.STRETCH_SCALE
	rendered.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(rendered)
	var raw := FileAccess.get_file_as_string("res://addons/full_stack_ds/runtime/glyph_catalog.json")
	var parsed = JSON.parse_string(raw)
	if parsed is Dictionary: _catalog = parsed
	var defaults: Dictionary = configuration.get("defaults", {})
	var size_prop: String = configuration.get("sizeProp", "")
	var decoration_prop: String = configuration.get("decorativeProp", "")
	if size_axis.is_empty() and defaults.has(size_prop): size_axis = str(JSON.parse_string(defaults[size_prop]))
	if defaults.has(decoration_prop): decorative = bool(JSON.parse_string(defaults[decoration_prop]))
	_refresh()

func _notification(what: int) -> void:
	if what == NOTIFICATION_THEME_CHANGED and is_inside_tree(): _refresh()
	if what == NOTIFICATION_ACCESSIBILITY_UPDATE and is_instance_valid(rendered):
		var element := rendered.get_accessibility_element()
		if element.is_valid(): AccessibilityServer.update_set_flag(element, AccessibilityServer.FLAG_HIDDEN, decorative or rendered.texture == null)

func set_contract_prop(prop: String, value: Variant) -> void:
	if prop == configuration.get("nameProp", ""): glyph_name = str(value)
	elif prop == configuration.get("sizeProp", ""): size_axis = str(value)
	elif prop == configuration.get("decorativeProp", ""): decorative = bool(value)
	elif prop == configuration.get("labelProp", ""): aria_label = str(value)
	else: push_error("Unsupported glyph prop: " + prop)

func get_contract_prop(prop: String) -> Variant:
	if prop == configuration.get("nameProp", ""): return glyph_name
	if prop == configuration.get("sizeProp", ""): return size_axis
	if prop == configuration.get("decorativeProp", ""): return decorative
	if prop == configuration.get("labelProp", ""): return aria_label
	return null

func _xml(value: Variant) -> String:
	return str(value).xml_escape()

func _svg(variant: Dictionary, foreground: String) -> String:
	var parts: Array[String] = []
	var attributes := {"d":"d", "fill":"fill", "stroke":"stroke", "strokeWidth":"stroke-width", "strokeLineCap":"stroke-linecap", "strokeLineJoin":"stroke-linejoin", "strokeDasharray":"stroke-dasharray", "fillRule":"fill-rule", "clipRule":"clip-rule"}
	for glyph_path in variant.get("paths", []):
		var attrs: Array[String] = []
		for key in attributes:
			if glyph_path.has(key): attrs.append('%s="%s"' % [attributes[key], _xml(str(glyph_path[key]).replace("currentColor", foreground))])
		parts.append("<path %s/>" % " ".join(attrs))
	return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="%s">%s</svg>' % [_xml(variant.get("viewBox", "")), "".join(parts)]

func _refresh() -> void:
	if not is_inside_tree() or not is_instance_valid(rendered): return
	var hints: Dictionary = configuration.get("sizeHints", {})
	var styles: Dictionary = configuration.get("sizeStyles", {})
	var frame := int(hints.get(size_axis, 0))
	if frame <= 0 or not styles.has(size_axis):
		rendered.texture = null
		selected_grid = 0
		return
	var style: Dictionary = styles[size_axis]
	var width := float(str(style.get("width", "0px")).trim_suffix("px"))
	var height := float(str(style.get("height", "0px")).trim_suffix("px"))
	custom_minimum_size = Vector2(width, height)
	rendered.custom_minimum_size = Vector2(width, height)
	rendered.accessibility_name = "" if decorative else aria_label
	rendered.tooltip_text = "" if decorative else aria_label
	queue_accessibility_update()
	var glyph: Dictionary = _catalog.get(glyph_name, {})
	var variants: Dictionary = glyph.get("sizes", {})
	if variants.is_empty():
		rendered.texture = null
		selected_grid = 0
		return
	var grids: Array[int] = []
	for key in variants: grids.append(int(key))
	grids.sort()
	selected_grid = grids[0]
	for grid in grids:
		if grid <= frame: selected_grid = grid
	var variant: Dictionary = variants[str(selected_grid)]
	var color := "#" + get_theme_color("font_color", "Label").to_html(false)
	var image := Image.new()
	if image.load_svg_from_string(_svg(variant, color), width / float(selected_grid)) != OK:
		rendered.texture = null
		push_error("Glyph SVG failed to rasterize: " + glyph_name)
		return
	rendered.texture = ImageTexture.create_from_image(image)
