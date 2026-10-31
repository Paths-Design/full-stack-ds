extends Control
class_name ParitySlider

## Lane-local parity slider: 300x6 graphite track, signal filled portion, 16px
## circular boneBright thumb, value 14/700 readout handled by the owning tab.
## The Godot allowlist admits no Slider component, so this is a ledgered
## fallback (`# NOT FSDS: no Slider component on this target`) that still consumes
## the parity JSON slider geometry.

signal value_changed(value: float)

var min_value := 0.0
var max_value := 100.0
var step := 5.0
var value := 0.0:
	set(next):
		var snapped := _snap(next)
		if is_equal_approx(snapped, value):
			return
		value = snapped
		queue_redraw()
		value_changed.emit(value)
var track_height := 6.0
var thumb_size := 16.0
var _dragging := false


func _ready() -> void:
	custom_minimum_size = Vector2(300, 20)
	size = custom_minimum_size
	mouse_filter = Control.MOUSE_FILTER_STOP
	focus_mode = Control.FOCUS_ALL
	var slider_data: Dictionary = DSFactory.parity.settings.get("slider", {})
	track_height = float(slider_data.get("h", 6))
	thumb_size = float(slider_data.get("thumb", 16))


func configure(minimum: float, maximum: float, step_size: float, initial: float, width: float) -> void:
	min_value = minimum
	max_value = maximum
	step = maxf(step_size, 0.001)
	value = initial
	custom_minimum_size = Vector2(width, 20)
	size = custom_minimum_size


func _snap(raw: float) -> float:
	var clamped := clampf(raw, min_value, max_value)
	var steps := roundf((clamped - min_value) / step)
	return clampf(min_value + steps * step, min_value, max_value)


func set_value_no_signal(raw: float) -> void:
	var snapped := _snap(raw)
	if is_equal_approx(snapped, value):
		return
	value = snapped
	queue_redraw()


func _value_from_position(local_x: float) -> float:
	var usable := maxf(size.x - thumb_size, 1.0)
	var t := clampf((local_x - thumb_size / 2.0) / usable, 0.0, 1.0)
	return _snap(min_value + t * (max_value - min_value))


func _gui_input(event: InputEvent) -> void:
	if event is InputEventMouseButton:
		var mouse := event as InputEventMouseButton
		if mouse.button_index == MOUSE_BUTTON_LEFT:
			_dragging = mouse.pressed
			if mouse.pressed:
				grab_focus()
				value = _value_from_position(mouse.position.x)
			accept_event()
	elif event is InputEventMouseMotion and _dragging:
		value = _value_from_position((event as InputEventMouseMotion).position.x)
		accept_event()


func _draw() -> void:
	var center_y := size.y / 2.0
	var track_rect := Rect2(Vector2(thumb_size / 2.0, center_y - track_height / 2.0), Vector2(size.x - thumb_size, track_height))
	draw_rect(track_rect, UI.color("graphite"))
	var ratio := 0.0
	if max_value > min_value:
		ratio = clampf((value - min_value) / (max_value - min_value), 0.0, 1.0)
	var fill_width := track_rect.size.x * ratio
	if fill_width > 0.0:
		draw_rect(Rect2(track_rect.position, Vector2(fill_width, track_height)), UI.color("signal"))
	var thumb_x := track_rect.position.x + fill_width
	draw_circle(Vector2(thumb_x, center_y), thumb_size / 2.0, UI.color("boneBright"))
