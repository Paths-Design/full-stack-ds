extends Button
class_name MarkerButton

## Lane-local map marker: the package admits no map/drawing/marker component, so
## this Control draws the stylized Orion marker shapes and hosts the generated
## Icon component for the fixture glyph. (`# NOT FSDS: no map-marker component`)

const SIZE := 30.0

var icon_data: Dictionary = {}
var marker_kind := "relay"
var shape_color := Color("#141412")
var border_color := Color("#F4F1E6")
var accent_color := Color("#EF6C3C")
var is_nav_target := false
var glyph = null


func _ready() -> void:
	custom_minimum_size = Vector2(SIZE, SIZE)
	mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	tooltip_text = str(icon_data.get("label", ""))
	for state in ["normal", "hover", "pressed", "focus", "disabled"]:
		add_theme_stylebox_override(state, StyleBoxEmpty.new())
	focus_mode = Control.FOCUS_ALL
	glyph = DSFactory.icon(
		PauseFixtures.glyph_name_for(str(icon_data.get("icon", ""))),
		"md",
		icon_tint()
	)
	glyph.position = Vector2((SIZE - 20.0) / 2.0, (SIZE - 20.0) / 2.0)
	glyph.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(glyph)


func icon_tint() -> Color:
	if is_nav_target:
		return accent_color
	return border_color


func set_nav_target(value: bool) -> void:
	if is_nav_target == value:
		return
	is_nav_target = value
	if glyph != null:
		glyph.theme = DSFactory.orion.label_color_theme(icon_tint())
	custom_minimum_size = Vector2(SIZE + (4.0 if value else 0.0), SIZE + (4.0 if value else 0.0))
	queue_redraw()


func _draw() -> void:
	# Zero-radius, hard-edged marker shapes; shape distinguishes icon kind.
	var fill := shape_color
	var outline := border_color
	if is_nav_target:
		fill = accent_color
		outline = DSFactory.orion.palette["boneBright"]
	var center := size / 2.0
	var points := _shape_points(center)
	if points.is_empty():
		draw_rect(Rect2(center - Vector2(11, 11), Vector2(22, 22)), fill)
		draw_rect(Rect2(center - Vector2(11, 11), Vector2(22, 22)), outline, false, 2.0)
	else:
		draw_colored_polygon(points, fill)
		var closed := points.duplicate()
		closed.append(points[0])
		draw_polyline(closed, outline, 2.0)
	if is_nav_target:
		draw_rect(Rect2(Vector2(1, 1), size - Vector2(2, 2)), outline, false, 1.0)
	# Status tone square at the marker's top-right corner.
	var status_tone := _status_tone()
	draw_rect(Rect2(center + Vector2(8, -14), Vector2(6, 6)), status_tone)


func _status_tone() -> Color:
	match str(icon_data.get("status", "")):
		"ONLINE", "GARRISONED":
			return DSFactory.orion.palette["clear"]
		"ACTIVE", "WARNING":
			return DSFactory.orion.palette["alert"]
		_:
			return DSFactory.orion.surface["muted"]


func _shape_points(center: Vector2) -> PackedVector2Array:
	var r := 13.0
	var points := PackedVector2Array()
	match marker_kind:
		"relay": # diamond
			points = PackedVector2Array([
				center + Vector2(0, -r), center + Vector2(r, 0),
				center + Vector2(0, r), center + Vector2(-r, 0),
			])
		"cache": # square
			points = PackedVector2Array([
				center + Vector2(-r + 2, -r + 2), center + Vector2(r - 2, -r + 2),
				center + Vector2(r - 2, r - 2), center + Vector2(-r + 2, r - 2),
			])
		"pad": # circle
			for index in range(16):
				points.append(center + Vector2(cos(TAU * index / 16.0), sin(TAU * index / 16.0)) * (r - 1))
		"vein": # triangle
			points = PackedVector2Array([
				center + Vector2(0, -r), center + Vector2(r, r - 1), center + Vector2(-r, r - 1),
			])
		"beacon": # inverted triangle (distress)
			points = PackedVector2Array([
				center + Vector2(-r, -r + 2), center + Vector2(r, -r + 2), center + Vector2(0, r),
			])
		"weather": # hexagon
			for index in range(6):
				points.append(center + Vector2(cos(TAU * index / 6.0 + PI / 6.0), sin(TAU * index / 6.0 + PI / 6.0)) * r)
		"rover": # chevron
			points = PackedVector2Array([
				center + Vector2(-r, -r + 4), center + Vector2(0, 2), center + Vector2(r, -r + 4),
				center + Vector2(r, -r + 9), center + Vector2(0, 9), center + Vector2(-r, -r + 9),
			])
		"camp": # house pentagon
			points = PackedVector2Array([
				center + Vector2(0, -r), center + Vector2(r, -r + 6), center + Vector2(r - 3, r),
				center + Vector2(-r + 3, r), center + Vector2(-r, -r + 6),
			])
	return points
