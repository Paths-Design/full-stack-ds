@tool
class_name DSPopover
extends "res://addons/full_stack_ds/runtime/control.gd"

func _init() -> void:
	configuration = JSON.parse_string("{\"operation\":\"surface\",\"disclosure\":{\"focus\":{\"strategy\":\"none\",\"orientation\":\"both\",\"wrap\":false},\"dismissal\":[{\"event\":\"escape\",\"enabledByProp\":\"closeOnEscape\",\"defaultEnabled\":true},{\"event\":\"outsideClick\",\"enabledByProp\":\"closeOnOutsideClick\",\"defaultEnabled\":true},{\"event\":\"blur\",\"enabledByProp\":\"closeOnBlur\",\"defaultEnabled\":true}],\"portal\":{\"enabled\":true,\"layering\":\"popover\"},\"modality\":\"non-blocking\",\"surfaceKind\":\"popover\"},\"accessibility\":{\"relationships\":[{\"from\":\"trigger\",\"to\":\"content\",\"attribute\":\"aria-controls\"},{\"from\":\"trigger\",\"to\":\"content\",\"attribute\":\"aria-expanded\"}],\"stateAria\":[{\"category\":\"disclosure\",\"attribute\":\"aria-expanded\",\"values\":{\"closed\":\"false\",\"open\":\"true\"}}],\"labeling\":[\"aria-controls\",\"aria-expanded\"],\"role\":\"group\"},\"defaults\":{\"closeOnEscape\":\"true\",\"closeOnOutsideClick\":\"true\",\"closeOnBlur\":\"true\"},\"theme_color\":\"#141414\"}")
	label = "Popover"
