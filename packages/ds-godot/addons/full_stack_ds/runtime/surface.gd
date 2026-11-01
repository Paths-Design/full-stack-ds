@tool
extends PanelContainer

# Scene root type is part of the contract: the wider surface plan emits
# `rootType: "PanelContainer"` and the generated scene instantiates this base
# on that node, so the generated script and scene cannot disagree about the
# host class.
#
# One runtime for every component whose IR declares a presence surface the
# narrower anchored control does not own (blocking dialogs, viewport-edge
# sheets, transient toasts, hover/focus tooltips, selector-anchored
# coachmarks). The generated configuration carries the plan facts (anchor
# mode, declared modality, open triggers) and the declared prop defaults; no
# component identity is inspected here.
#
# This base realises overlay PRESENCE only: an open/close flag and signal, and
# an inert projection of the declared prop values. It deliberately does not
# invent backdrop, focus-containment, dismissal, anchoring or scheduling
# behaviour. Every such gap is named in the generated capability receipt
# (capabilities.json `omissions`) so the emitted receipt and this runtime
# cannot disagree about what it does.
signal open_changed(is_open: bool)

var configuration: Dictionary = {}

## The declared prop values, projected from the generated configuration
## defaults. Inert data: no declared prop drives behaviour here.
@export var declared_props: Dictionary = {}

## Overlay presence. Consumers open and close the surface through this flag;
## the node's scene children are the surface content host.
@export var open: bool = false:
	set(next):
		if open == next: return
		open = next
		_apply_presence()
		open_changed.emit(open)

func _ready() -> void:
	# A panel is a layout host, not an input barrier: modality and input
	# isolation are unlowered, so the host must not claim them by swallowing
	# events. Content children keep their own input handling.
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	_apply_declared_props()
	_apply_presence()

func _apply_declared_props() -> void:
	var defaults: Dictionary = configuration.get("defaults", {})
	for prop in defaults:
		if declared_props.has(prop): continue
		declared_props[prop] = JSON.parse_string(str(defaults[prop]))

## Write one declared prop value from consumer code. The value is projected
## back out unchanged; this runtime attaches no behaviour to it.
func set_contract_prop(prop: String, value: Variant) -> void:
	declared_props[prop] = value

func get_contract_prop(prop: String, fallback: Variant = null) -> Variant:
	return declared_props.get(prop, fallback)

## Declared plan facts, exposed so consumer code can branch on what the
## contract declared without this runtime claiming the behaviour.
func anchor_mode() -> String:
	return str(configuration.get("anchor", "none"))

func modality() -> String:
	return str(configuration.get("modality", "none"))

func open_triggers() -> PackedStringArray:
	return PackedStringArray(configuration.get("openTriggers", []))

func open_surface() -> void:
	open = true

func close_surface() -> void:
	open = false

func toggle_surface() -> void:
	open = not open

func is_open() -> bool:
	return open

func _apply_presence() -> void:
	# Editor preview stays inspectable; presence is a runtime concern.
	if Engine.is_editor_hint(): return
	visible = open
