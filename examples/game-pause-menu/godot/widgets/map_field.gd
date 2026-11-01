extends Control
class_name MapField

## Parity map plot: sage ground, 60px survey grid, 12px corner ticks and one
## 24px marker per fixture icon positioned by normalized x/y.
## (`# NOT FSDS: the package admits no map/drawing component`)

var sector := ""
var scale_label := ""
var icons: Array = []
var visibility: Dictionary = {}
var nav_target := ""
var markers: Dictionary = {}

var _note: Label


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	var field_rect := UI.rect(DSFactory.parity.map["field"])
	custom_minimum_size = field_rect.size
	size = field_rect.size
	_build_note()
	_build_markers()


func _build_note() -> void:
	var note_data: Dictionary = DSFactory.parity.map["fieldNote"]
	_note = UI.sub(str(note_data.get("text", "")), "ink")
	var note_y := size.y + float(note_data.get("yOffsetFromFieldBottom", -26))
	UI.place(_note, 8, note_y, size.x - 16, 14)
	_note.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_note)


func _build_markers() -> void:
	for icon in icons:
		var marker := MarkerButton.new()
		marker.icon_data = icon
		marker.marker_kind = str(icon.get("kind", "relay"))
		marker.name = "Marker_" + str(icon.get("id", ""))
		add_child(marker)
		markers[str(icon.get("id", ""))] = marker
	apply_state(visibility, nav_target)


func _marker_center(icon: Dictionary) -> Vector2:
	# Normalized fixture coordinates map onto the field interior; the marker is
	# clamped fully inside the field (half marker + 4px breathing room).
	var marker_size := float(DSFactory.parity.map["marker"]["size"])
	var half := marker_size / 2.0
	var x := float(icon.get("x", 0.5)) * size.x
	var y := float(icon.get("y", 0.5)) * size.y
	x = clampf(x, half + 4.0, size.x - half - 4.0)
	y = clampf(y, half + 4.0, size.y - half - 4.0)
	return Vector2(x, y)


func apply_state(next_visibility: Dictionary, next_nav_target: String) -> void:
	visibility = next_visibility
	nav_target = next_nav_target
	var marker_size := float(DSFactory.parity.map["marker"]["size"])
	for icon in icons:
		var icon_id := str(icon.get("id", ""))
		var marker: MarkerButton = markers.get(icon_id)
		if marker == null:
			continue
		marker.position = _marker_center(icon) - Vector2(marker_size / 2.0, marker_size / 2.0)
		marker.visible = bool(visibility.get(icon_id, false))
		marker.set_nav_target(icon_id == nav_target)


func _draw() -> void:
	var sage := UI.color("sage")
	var ink := UI.color("ink")
	draw_rect(Rect2(Vector2.ZERO, size), sage)

	# 60px survey grid.
	var grid_step := 60.0
	# Pinned: 1px ink grid lines at 12% opacity (parity.md corrections).
	var grid_color := Color(ink, 0.12)
	var x := grid_step
	while x < size.x:
		draw_line(Vector2(x, 0), Vector2(x, size.y), grid_color, 1.0)
		x += grid_step
	var y := grid_step
	while y < size.y:
		draw_line(Vector2(0, y), Vector2(size.x, y), grid_color, 1.0)
		y += grid_step

	# 12px corner ticks.
	var tick := float(DSFactory.parity.map.get("fieldCornerTicks", 12))
	var corners := [Vector2(0, 0), Vector2(size.x, 0), Vector2(0, size.y), Vector2(size.x, size.y)]
	for corner in corners:
		var along_x := 1.0 if corner.x == 0.0 else -1.0
		var along_y := 1.0 if corner.y == 0.0 else -1.0
		draw_line(corner, corner + Vector2(along_x * tick, 0), ink, 1.0)
		draw_line(corner, corner + Vector2(0, along_y * tick), ink, 1.0)

	# Sector frame.
	draw_rect(Rect2(Vector2(0.5, 0.5), size - Vector2(1, 1)), Color(ink, 0.55), false, 1.0)
