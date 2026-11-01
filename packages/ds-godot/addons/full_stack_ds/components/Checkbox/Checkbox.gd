@tool
class_name DSCheckbox
extends "res://addons/full_stack_ds/runtime/control.gd"

func _init() -> void:
	configuration = JSON.parse_string("{\"operation\":\"boolean\",\"disclosure\":{\"focus\":{\"strategy\":\"auto\",\"orientation\":\"both\",\"wrap\":false},\"dismissal\":[],\"portal\":{\"enabled\":false}},\"accessibility\":{\"stateAria\":[{\"category\":\"selection\",\"attribute\":\"aria-checked\",\"values\":{\"unchecked\":\"false\",\"checked\":\"true\"}}],\"labeling\":[\"aria-label\",\"aria-labelledby\",\"aria-checked\"]},\"defaults\":{\"size\":\"\\\"md\\\"\"},\"theme_color\":\"#141414\"}")
	label = "Checkbox"
