extends Control
class_name CornerTicks

## App-level decoration used by the Orion N5 graphic grammar: corner ticks.
## The design-system package admits no drawing/decoration component, so this is
## lane-local chrome (`# NOT FSDS` at the construction sites in app.gd/tabs).

@export var tick_length := 10.0
@export var color := Color("#56564C")
@export var thickness := 1.0

func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE

func _draw() -> void:
	var corners := [
		[Vector2(0, 0), Vector2(1, 0), Vector2(0, 1)],
		[Vector2(size.x, 0), Vector2(-1, 0), Vector2(0, 1)],
		[Vector2(0, size.y), Vector2(1, 0), Vector2(0, -1)],
		[Vector2(size.x, size.y), Vector2(-1, 0), Vector2(0, -1)],
	]
	for corner in corners:
		var origin: Vector2 = corner[0]
		var along_x: Vector2 = corner[1]
		var along_y: Vector2 = corner[2]
		draw_line(origin, origin + along_x * tick_length, color, thickness)
		draw_line(origin, origin + along_y * tick_length, color, thickness)
