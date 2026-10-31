extends Button
class_name MarkerButton

## Lane-local parity map marker: 24x24 square, fill from the JSON marker colour
## map, 1px ink border and an 11px monogram; nav target gets a 3px signal outline.
## (`# NOT FSDS: the package admits no map-marker component`)

var icon_data: Dictionary = {}
var marker_kind := "relay"
var fill_color := Color("#141412")
var nav_target := false

var _marker_size := 24.0
var _nav_outline := 3.0
var _monogram: Label


func _ready() -> void:
	_marker_size = float(DSFactory.parity.map["marker"]["size"])
	_nav_outline = float(DSFactory.parity.map["marker"].get("navOutline", 3))
	fill_color = DSFactory.parity.marker_color(marker_kind)
	custom_minimum_size = Vector2(_marker_size, _marker_size)
	size = Vector2(_marker_size, _marker_size)
	mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	tooltip_text = str(icon_data.get("label", ""))
	for state in ["normal", "hover", "pressed", "focus", "disabled"]:
		add_theme_stylebox_override(state, StyleBoxEmpty.new())
	focus_mode = Control.FOCUS_ALL
	_monogram = UI.label(
		DSFactory.parity.marker_monogram(marker_kind),
		int(DSFactory.parity.map["marker"].get("monogram", 11)),
		800,
		"boneBright" if fill_color.is_equal_approx(UI.color("onSignal")) else "ink",
		0.0
	)
	_monogram.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_monogram.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	UI.place(_monogram, 0, 0, _marker_size, _marker_size)
	_monogram.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_monogram)


func set_nav_target(value: bool) -> void:
	if nav_target == value:
		return
	nav_target = value
	queue_redraw()


func _draw() -> void:
	# Marker body + 1px ink border.
	draw_rect(Rect2(Vector2.ZERO, Vector2(_marker_size, _marker_size)), fill_color)
	draw_rect(Rect2(Vector2.ZERO, Vector2(_marker_size, _marker_size)), UI.color("ink"), false, 1.0)
	if nav_target:
		var offset := _nav_outline / 2.0 + 1.0
		draw_rect(
			Rect2(Vector2(-offset, -offset), Vector2(_marker_size + offset * 2.0, _marker_size + offset * 2.0)),
			UI.color("signal"),
			false,
			_nav_outline
		)
