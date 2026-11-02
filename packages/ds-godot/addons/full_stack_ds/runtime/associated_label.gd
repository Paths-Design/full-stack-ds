@tool
extends Label

## Native activation follows the authored htmlFor binding through a named
## sibling/ancestor control, or a direct consumer supplied control reference.
var configuration: Dictionary = {}
var associated_control: Control
var _target_name := ""

func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_STOP
	focus_mode = Control.FOCUS_ALL
	var foreground: String = str(configuration.get("colors", {}).get("foreground", "#141414"))
	add_theme_color_override("font_color", Color.html(foreground))

func set_contract_prop(prop: String, value: Variant) -> bool:
	if configuration.get("excludedProps", []).has(prop):
		return false
	var form: Dictionary = configuration.get("form", {})
	if prop == form.get("targetProp", ""):
		_target_name = str(value)
		return true
	return false

func get_contract_prop(prop: String) -> Variant:
	if prop == configuration.get("form", {}).get("targetProp", ""):
		return _target_name
	return null

func activate() -> void:
	var target := associated_control
	if target == null and not _target_name.is_empty():
		var ancestor := get_parent()
		while ancestor != null and target == null:
			var candidate := ancestor.find_child(_target_name, true, false)
			if candidate is Control and candidate != self:
				target = candidate
			ancestor = ancestor.get_parent()
	if target != null and target.is_visible_in_tree() and target.focus_mode != Control.FOCUS_NONE and not (target is LineEdit and not (target as LineEdit).editable):
		target.grab_focus()

func _gui_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		activate()
		accept_event()
	elif event is InputEventKey and event.pressed and not event.echo and (event.keycode == KEY_ENTER or event.keycode == KEY_SPACE):
		activate()
		accept_event()
