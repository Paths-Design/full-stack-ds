@tool
class_name DSTabs
extends "res://addons/full_stack_ds/runtime/control.gd"

func _init() -> void:
	configuration = JSON.parse_string("{\"operation\":\"select\",\"disclosure\":{\"focus\":{\"strategy\":\"roving\",\"orientation\":\"horizontal\",\"wrap\":true,\"initialFocus\":\"tab\"},\"dismissal\":[],\"portal\":{\"enabled\":false}},\"accessibility\":{\"relationships\":[{\"from\":\"tab\",\"to\":\"panel\",\"attribute\":\"aria-controls\"},{\"from\":\"panel\",\"to\":\"tab\",\"attribute\":\"aria-labelledby\"}],\"stateAria\":[{\"category\":\"selection\",\"attribute\":\"aria-selected\",\"values\":{\"unselected\":\"false\",\"selected\":\"true\"}}],\"labeling\":[\"aria-label\",\"aria-labelledby\"]},\"defaults\":{\"orientation\":\"\\\"horizontal\\\"\",\"appearance\":\"\\\"underline\\\"\",\"activationMode\":\"\\\"automatic\\\"\",\"loop\":\"true\"},\"theme_color\":\"#141414\"}")
	label = "Tabs"
