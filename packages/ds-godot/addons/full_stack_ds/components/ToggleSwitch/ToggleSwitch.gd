@tool
class_name DSToggleSwitch
extends "res://addons/full_stack_ds/runtime/control.gd"

func _init() -> void:
	configuration = JSON.parse_string("{\"operation\":\"boolean\",\"disclosure\":{\"focus\":{\"strategy\":\"auto\",\"orientation\":\"both\",\"wrap\":false},\"dismissal\":[]},\"styles\":[{\"source\":\"root\",\"part\":\"root\",\"predicates\":[],\"declarations\":[{\"property\":\"color\",\"value\":\"#141414\",\"designSlot\":\"toggle-switch.design.root.foreground.color\"}]}],\"defaults\":{\"size\":\"\\\"medium\\\"\"},\"theme_color\":\"#141414\"}")
	label = "ToggleSwitch"
