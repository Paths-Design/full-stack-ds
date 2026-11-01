@tool
class_name DSSwitch
extends "res://addons/full_stack_ds/runtime/control.gd"

func _init() -> void:
	configuration = JSON.parse_string("{\"operation\":\"boolean\",\"disclosure\":{\"focus\":{\"strategy\":\"auto\",\"orientation\":\"both\",\"wrap\":false},\"dismissal\":[]},\"defaults\":{\"size\":\"\\\"md\\\"\"},\"theme_color\":\"#141414\"}")
	label = "Switch"
