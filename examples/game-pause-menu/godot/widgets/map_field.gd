extends Control
class_name MapField

## Stylized top-down map plot: `# NOT FSDS: the package admits no map/drawing
## component`. Draws the grid, contour ticks, sector chrome and hosts one
## MarkerButton per fixture map icon, positioned by normalized x/y.

var sector := ""
var scale_label := ""
var icons: Array = []
var visibility: Dictionary = {}
var nav_target := ""
var markers: Dictionary = {}

var _sector_text = null
var _scale_text = null


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_PASS
	clip_contents = true
	_build_chrome()
	_build_markers()


func _build_chrome() -> void:
	# Generated Text/Divider are admitted for passive content; both are used here
	# on the light telemetry ground where their authored light-theme foreground
	# (the only foreground the Godot projection supplies) is legible.
	# The generated Text projects autowrap with a ~1-character minimum width, so
	# absolutely-positioned DSText chrome needs an explicit minimum width or it
	# collapses to one character per line. (`# NOT FSDS: no min-width channel`)
	_sector_text = DSFactory.text(sector, "overline")
	_sector_text.custom_minimum_size = Vector2(430, 14)
	_sector_text.position = Vector2(16, 8)
	add_child(_sector_text)
	_scale_text = DSFactory.text(scale_label, "overline")
	_scale_text.custom_minimum_size = Vector2(220, 14)
	_scale_text.position = Vector2(16, size.y - 26)
	add_child(_scale_text)
	var divider = DSFactory.divider()
	divider.position = Vector2(16, 30)
	divider.size = Vector2(size.x - 32, 0)
	add_child(divider)


func _build_markers() -> void:
	for icon in icons:
		var marker := MarkerButton.new()
		marker.icon_data = icon
		marker.marker_kind = str(icon.get("kind", "relay"))
		marker.shape_color = DSFactory.orion.color("ink")
		marker.border_color = DSFactory.orion.color("boneBright")
		marker.accent_color = DSFactory.orion.palette["signal"]
		marker.name = "Marker_" + str(icon.get("id", ""))
		add_child(marker)
		markers[str(icon.get("id", ""))] = marker
	apply_state(visibility, nav_target)


func _position_marker(marker: Control, icon: Dictionary) -> void:
	var inset_x := 40.0
	var top := 48.0
	var bottom := 16.0
	var width := maxf(size.x - inset_x * 2.0, 32.0)
	var height := maxf(size.y - top - bottom, 32.0)
	var point := Vector2(inset_x + float(icon.get("x", 0.5)) * width, top + float(icon.get("y", 0.5)) * height)
	marker.position = point - Vector2(MarkerButton.SIZE / 2.0, MarkerButton.SIZE / 2.0)


func apply_state(next_visibility: Dictionary, next_nav_target: String) -> void:
	visibility = next_visibility
	nav_target = next_nav_target
	for icon in icons:
		var icon_id := str(icon.get("id", ""))
		var marker: MarkerButton = markers.get(icon_id)
		if marker == null:
			continue
		_position_marker(marker, icon)
		marker.visible = bool(visibility.get(icon_id, false))
		marker.set_nav_target(icon_id == nav_target)
	queue_redraw()


func _draw() -> void:
	var orion = DSFactory.orion
	var sage := orion.color("sage")
	var moss := orion.color("moss")
	var ink := orion.color("ink")
	draw_rect(Rect2(Vector2.ZERO, size), sage)

	# Survey grid.
	var grid_color := Color(moss, 0.35)
	var step := 64.0
	var x := step
	while x < size.x:
		draw_line(Vector2(x, 0), Vector2(x, size.y), grid_color, 1.0)
		x += step
	var y := step
	while y < size.y:
		draw_line(Vector2(0, y), Vector2(size.x, y), grid_color, 1.0)
		y += step

	# Contour ticks along the field edges.
	var tick := Color(moss, 0.7)
	x = 0.0
	while x < size.x:
		draw_line(Vector2(x, 0), Vector2(x, 6), tick, 1.0)
		draw_line(Vector2(x, size.y - 6), Vector2(x, size.y), tick, 1.0)
		x += 32.0
	y = 0.0
	while y < size.y:
		draw_line(Vector2(0, y), Vector2(6, y), tick, 1.0)
		draw_line(Vector2(size.x - 6, y), Vector2(size.x, y), tick, 1.0)
		y += 32.0

	# Sector frame.
	draw_rect(Rect2(Vector2(0.5, 0.5), size - Vector2(1, 1)), ink, false, 1.0)

	# A quiet contour line across the plot so the field reads as terrain.
	var contour := PackedVector2Array()
	for index in range(10):
		var t := index / 9.0
		contour.append(Vector2(t * size.x, size.y * (0.58 + 0.06 * sin(t * PI * 2.0))))
	draw_polyline(contour, Color(moss, 0.45), 1.0)

	# Normalized coordinate ticks in the plot corners.
	if not icons.is_empty():
		draw_rect(Rect2(size - Vector2(9, 9), Vector2(5, 5)), ink, false, 1.0)
