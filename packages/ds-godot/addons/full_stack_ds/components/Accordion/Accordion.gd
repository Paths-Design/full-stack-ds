@tool
class_name DSAccordion
extends "res://addons/full_stack_ds/runtime/control.gd"

func _init() -> void:
	configuration = JSON.parse_string("{\"operation\":\"toggle-item\",\"itemButtonRefs\":[{\"ref\":\"Icon\",\"part\":\"chevron\",\"attrs\":{\"name\":\"chevron-down\",\"size\":\"sm\"}}],\"defaults\":{\"type\":\"\\\"single\\\"\",\"collapsible\":\"false\"},\"theme_color\":\"#141414\"}")
	label = "Accordion"
