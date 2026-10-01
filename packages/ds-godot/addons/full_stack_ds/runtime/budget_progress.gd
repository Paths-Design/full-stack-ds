extends Control
## Decorative projection only. The sequence controller owns elapsed time.
var effect := "elapsed-width"
var elapsed := 0.0
var steps := 10
var reduced_motion := false
var foreground := Color("#141414")
var track := Color("#d0d0d0")

func fraction() -> float:
	var bounded := clampf(elapsed, 0.0, 1.0)
	return floorf(bounded * steps) / steps if reduced_motion else bounded

func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	focus_mode = Control.FOCUS_NONE

func _draw() -> void:
	if effect == "elapsed-ring":
		var radius := maxf(0.0, minf(size.x, size.y) / 2.0 - 2.0)
		draw_arc(size / 2.0, radius, -PI / 2.0, 3.0 * PI / 2.0, 64, track, 2.0, true)
		if fraction() > 0.0: draw_arc(size / 2.0, radius, -PI / 2.0, -PI / 2.0 + TAU * fraction(), 64, foreground, 2.0, true)
	else:
		var rect := Rect2(4.0, size.y / 2.0 - 3.0, maxf(0.0, size.x - 8.0), 6.0)
		draw_style_box(_pill(track), rect)
		if fraction() > 0.0: draw_style_box(_pill(foreground), Rect2(rect.position, Vector2(rect.size.x * fraction(), rect.size.y)))

func _pill(color: Color) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = color
	style.set_corner_radius_all(3)
	return style
