extends Control
class_name PanelFrame

## Lane-local hard-edged panel chrome: filled rect, hairline border, optional
## corner ticks and dashed inner rules. The design-system package admits no
## layout/panel primitive for app-level regions (`# NOT FSDS: app chrome`).

var bg_color := Color("#232320")
var border_color := Color("#3A3A34")
var border_width := 1
var ticks := false
var tick_length := 10.0
var tick_color := Color("#56564C")


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_PASS


func _draw() -> void:
	draw_rect(Rect2(Vector2.ZERO, size), bg_color)
	if border_width > 0:
		draw_rect(Rect2(Vector2.ZERO, size), border_color, false, border_width)
	if ticks:
		var corners := [
			Vector2(0, 0), Vector2(size.x, 0), Vector2(0, size.y), Vector2(size.x, size.y),
		]
		for corner in corners:
			var along_x := 1.0 if corner.x == 0.0 else -1.0
			var along_y := 1.0 if corner.y == 0.0 else -1.0
			draw_line(corner, corner + Vector2(along_x * tick_length, 0), tick_color, 1.0)
			draw_line(corner, corner + Vector2(0, along_y * tick_length), tick_color, 1.0)
