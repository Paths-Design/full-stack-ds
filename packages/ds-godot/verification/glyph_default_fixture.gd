@tool
extends "res://addons/full_stack_ds/runtime/glyph.gd"

func _init() -> void:
	var icon = load("res://addons/full_stack_ds/components/Icon/Icon.gd").new()
	configuration = icon.configuration.duplicate(true)
	icon.free()
	configuration.defaults["name"] = '"check"'
	configuration.defaults["decorative"] = "false"
	configuration.defaults["ariaLabel"] = '"Default check"'
