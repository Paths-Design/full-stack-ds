@tool
class_name DSCheckbox
extends "res://addons/full_stack_ds/runtime/control.gd"

func _init() -> void:
	configuration = JSON.parse_string("{\"operation\":\"boolean\",\"defaults\":{\"size\":\"\\\"md\\\"\"},\"theme_color\":\"#141414\"}")
	label = "Checkbox"
