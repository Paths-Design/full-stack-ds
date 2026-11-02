@tool
extends LineEdit

## Native text ownership for any generated text form control. Configuration
## carries the contract's prop names and source-resolved paint values.
signal value_requested(value: String)

var configuration: Dictionary = {}
var controlled := false
var _current := ""
var _default := ""
var _assigned := false
var _syncing := false
var _invalid := false

func _ready() -> void:
	_current = text
	text_changed.connect(_on_text_changed)
	_apply_colors()

func set_contract_prop(prop: String, value: Variant) -> bool:
	if configuration.get("excludedProps", []).has(prop):
		return false
	var form: Dictionary = configuration.get("form", {})
	if prop == form.get("valueProp", ""):
		controlled = true
		set_value_without_notify(str(value))
	elif prop == form.get("defaultValueProp", ""):
		_default = str(value)
		if not _assigned and not controlled:
			set_value_without_notify(_default)
	elif prop == form.get("placeholderProp", ""):
		placeholder_text = str(value)
	elif prop == form.get("disabledProp", ""):
		editable = not bool(value)
		_apply_colors()
	elif prop == form.get("invalidProp", ""):
		_invalid = bool(value)
		_apply_colors()
	else:
		return false
	return true

func get_contract_prop(prop: String) -> Variant:
	var form: Dictionary = configuration.get("form", {})
	if prop == form.get("valueProp", ""):
		return _current
	if prop == form.get("defaultValueProp", ""):
		return _default
	if prop == form.get("placeholderProp", ""):
		return placeholder_text
	if prop == form.get("disabledProp", ""):
		return not editable
	if prop == form.get("invalidProp", ""):
		return _invalid
	return null

func set_value_without_notify(next: String) -> void:
	_assigned = true
	_syncing = true
	_current = next
	text = next
	_syncing = false

func request_value(next: String) -> void:
	if not editable or next == _current:
		return
	if not controlled:
		set_value_without_notify(next)
	value_requested.emit(next)

func _on_text_changed(next: String) -> void:
	if _syncing or next == _current:
		return
	if not editable or controlled:
		_syncing = true
		text = _current
		_syncing = false
		if not editable:
			return
	else:
		_current = next
		_assigned = true
	value_requested.emit(next)

func _apply_colors() -> void:
	var colors: Dictionary = configuration.get("colors", {})
	if colors.is_empty():
		return
	var disabled := not editable
	var background := str(colors.get("disabledBackground" if disabled else "background", colors.get("background", "#ffffff")))
	var foreground := str(colors.get("disabledForeground" if disabled else "foreground", colors.get("foreground", "#141414")))
	var border := str(colors.get("disabledBorder" if disabled else "invalid" if _invalid else "border", colors.get("border", "#a0a0a1")))
	var normal := StyleBoxFlat.new()
	normal.bg_color = Color.html(background)
	normal.border_color = Color.html(border)
	normal.border_width_left = 1
	normal.border_width_right = 1
	normal.border_width_top = 1
	normal.border_width_bottom = 1
	add_theme_stylebox_override("normal", normal)
	add_theme_stylebox_override("read_only", normal)
	var focus_style := normal.duplicate() as StyleBoxFlat
	focus_style.border_color = Color.html(str(colors.get("invalid" if _invalid else "focus", border)))
	add_theme_stylebox_override("focus", focus_style)
	add_theme_color_override("font_color", Color.html(foreground))
	if colors.has("placeholder"):
		add_theme_color_override("font_placeholder_color", Color.html(str(colors["placeholder"])))
