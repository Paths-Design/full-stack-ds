extends Control
class_name DashedRule

## Lane-local dashed separator from the Orion graphic grammar.
## (`# NOT FSDS: no dashed-rule component is admitted on this target`)

var color := Color("#3A3A34")
var dash := 6.0
var gap := 4.0
var thickness := 1.0


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	custom_minimum_size = Vector2(0, thickness)


func _draw() -> void:
	var x := 0.0
	while x < size.x:
		draw_line(Vector2(x, 0), Vector2(minf(x + dash, size.x), 0), color, thickness)
		x += dash + gap
