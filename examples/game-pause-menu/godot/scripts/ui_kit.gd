class_name UI
extends RefCounted

## Native-chrome helpers for the lane's app-layer regions. Everything created
## here is engine-native Control chrome (no admitted component covers general
## layout/drawing), and each use site is ledgered in the lane README.

static var orion: OrionTheme


static func fmt_int(value: int) -> String:
	var digits := str(absi(value))
	var out := ""
	var count := 0
	for index in range(digits.length() - 1, -1, -1):
		out = digits[index] + out
		count += 1
		if count % 3 == 0 and index > 0:
			out = "," + out
	return ("-" if value < 0 else "") + out


static func label(text: String, size := 13, weight := 500, color_key := "bone", spacing := 0.0) -> Label:
	var node := Label.new()
	node.text = text
	var font: Font = orion.font(size, weight, spacing)
	node.add_theme_font_override("font", font)
	node.add_theme_font_size_override("font_size", size)
	node.add_theme_color_override("font_color", orion.color(color_key))
	return node


static func micro(text: String, color_key := "muted") -> Label:
	var node := label(text.to_upper(), 10, 600, color_key, orion.micro_spacing())
	return node


static func heavy(text: String, size := 26, color_key := "bone") -> Label:
	return label(text, size, 800, color_key, -0.2)


static func title(text: String, size := 18, color_key := "boneBright") -> Label:
	return label(text, size, 700, color_key, 0.2)


static func color_rect(color_key: String, alpha := 1.0) -> ColorRect:
	var node := ColorRect.new()
	var tint: Color = orion.color(color_key)
	tint.a = alpha
	node.color = tint
	node.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return node


static func rule(color_key := "rule", height := 1.0) -> ColorRect:
	var node := color_rect(color_key)
	node.custom_minimum_size = Vector2(0, height)
	node.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	return node


static func vrule(color_key := "rule", width := 1.0) -> ColorRect:
	var node := color_rect(color_key)
	node.custom_minimum_size = Vector2(width, 0)
	node.size_flags_vertical = Control.SIZE_EXPAND_FILL
	return node


static func panel(bg_key: String, border_key := "", margin := 0.0) -> PanelContainer:
	var node := PanelContainer.new()
	node.add_theme_stylebox_override("panel", orion.panel_style(bg_key, border_key, -1 if border_key.is_empty() else orion.border_width(), margin))
	return node


static func frame(bg_key: String, border_key := "rule", ticks := false) -> Control:
	var node := PanelFrame.new()
	node.bg_color = orion.color(bg_key)
	node.border_color = orion.color(border_key)
	node.border_width = orion.border_width()
	node.ticks = ticks
	node.tick_color = orion.surface["ruleStrong"]
	node.tick_length = 10.0
	node.mouse_filter = Control.MOUSE_FILTER_PASS
	return node


static func dashed(color_key := "ruleStrong") -> Control:
	var node := DashedRule.new()
	node.color = orion.color(color_key)
	node.thickness = 1.0
	node.custom_minimum_size = Vector2(0, 1)
	return node


static func vbox(separation := 6) -> VBoxContainer:
	var node := VBoxContainer.new()
	node.add_theme_constant_override("separation", separation)
	return node


static func hbox(separation := 6) -> HBoxContainer:
	var node := HBoxContainer.new()
	node.add_theme_constant_override("separation", separation)
	return node


static func spacer() -> Control:
	var node := Control.new()
	node.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	node.size_flags_vertical = Control.SIZE_EXPAND_FILL
	node.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return node


static func vspace(height: float) -> Control:
	var node := Control.new()
	node.custom_minimum_size = Vector2(0, height)
	node.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return node


static func margin(child: Control, left: int, top: int, right: int, bottom: int) -> MarginContainer:
	var node := MarginContainer.new()
	node.add_theme_constant_override("margin_left", left)
	node.add_theme_constant_override("margin_top", top)
	node.add_theme_constant_override("margin_right", right)
	node.add_theme_constant_override("margin_bottom", bottom)
	node.add_child(child)
	return node


static func place(control: Control, x: float, y: float, width: float, height: float) -> void:
	control.position = Vector2(x, y)
	control.size = Vector2(width, height)


## Full-rect child placement for a non-container parent (used by fixed shells).
static func fill(control: Control) -> void:
	control.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)


## Children of clickable rows/buttons must not swallow the activation event.
static func ignore_mouse(node: Control) -> void:
	node.mouse_filter = Control.MOUSE_FILTER_IGNORE
	for child in node.get_children():
		if child is Control:
			ignore_mouse(child)


static func pips(count: int, maximum := 2, color_key := "signal") -> HBoxContainer:
	var row := hbox(3)
	for index in range(maximum):
		var pip := ColorRect.new()
		pip.color = orion.color(color_key) if index < count else orion.color("rule")
		pip.custom_minimum_size = Vector2(8, 8)
		pip.mouse_filter = Control.MOUSE_FILTER_IGNORE
		row.add_child(pip)
	return row


## An optional-state text toggle used beside generated Switches (ON/OFF chip).
static func value_chip(on: bool) -> Label:
	var text := "ON" if on else "OFF"
	var node := micro(text, "signalHot" if on else "muted")
	node.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	node.custom_minimum_size = Vector2(34, 0)
	return node


## App-layer key hint: `[KEY] ACTION` pair.
static func hint(key: String, action: String) -> HBoxContainer:
	var row := hbox(8)
	var key_label := label(key, 11, 700, "boneBright")
	key_label.add_theme_stylebox_override("normal", orion.flat(orion.surface["raised"], orion.surface["ruleStrong"], orion.border_width(), 0.0))
	row.add_child(_boxed_label(key_label))
	row.add_child(micro(action, "muted"))
	return row


static func _boxed_label(label_node: Label) -> PanelContainer:
	var panel := PanelContainer.new()
	panel.add_theme_stylebox_override("panel", orion.flat(orion.surface["raised"], orion.surface["ruleStrong"], orion.border_width(), 0.0))
	panel.add_theme_constant_override("margin_left", 6)
	panel.add_theme_constant_override("margin_right", 6)
	panel.add_theme_constant_override("margin_top", 2)
	panel.add_theme_constant_override("margin_bottom", 2)
	panel.add_child(label_node)
	return panel
