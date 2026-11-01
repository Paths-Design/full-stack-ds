@tool
class_name DSToggleSwitch
extends "res://addons/full_stack_ds/runtime/control.gd"

func _init() -> void:
	configuration = JSON.parse_string("{\"operation\":\"boolean\",\"defaults\":{\"size\":\"\\\"medium\\\"\"},\"theme_color\":\"#141414\"}")
	label = "ToggleSwitch"
