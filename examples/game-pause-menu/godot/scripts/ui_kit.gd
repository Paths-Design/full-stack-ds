class_name UI
extends RefCounted

## Native-chrome helpers for the lane's app-layer regions. Every geometry, colour
## and type size comes from the parsed parity layout (`ParityLayout`); this kit
## only provides placement and text primitives.

static var parity: ParityLayout
static var orion: OrionTheme


static func color(key: String) -> Color:
	return parity.color(key)


static func type_size(key: String) -> int:
	return parity.type_size(key)


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


# --- text --------------------------------------------------------------------

static func label(text: String, size := 13, weight := 400, color_key := "boneBright", spacing := 0.0) -> Label:
	var node := Label.new()
	node.text = text
	node.add_theme_font_override("font", orion.font(size, weight, spacing))
	node.add_theme_font_size_override("font_size", size)
	node.add_theme_color_override("font_color", color(color_key))
	return node


static func micro(text: String, color_key := "muted") -> Label:
	return label(text.to_upper(), type_size("micro"), 700, color_key, orion.micro_spacing())


static func sub(text: String, color_key := "muted") -> Label:
	return label(text, type_size("micro"), 400, color_key)


static func title(text: String, size := 24, color_key := "boneBright") -> Label:
	return label(text, size, 700, color_key, 0.0)


static func panel_title(text: String) -> Label:
	return label(text.to_upper(), type_size("panelTitle"), 700, "boneBright", orion.micro_spacing())


static func panel_meta(text: String) -> Label:
	return label(text.to_upper(), type_size("panelMeta"), 400, "textSecondary", orion.micro_spacing())


# --- layout ------------------------------------------------------------------

static func place(control: Control, x: float, y: float, width: float, height: float) -> void:
	control.position = Vector2(x, y)
	control.size = Vector2(width, height)
	control.custom_minimum_size = Vector2(width, height)


static func place_rect(control: Control, rect_value: Rect2) -> void:
	place(control, rect_value.position.x, rect_value.position.y, rect_value.size.x, rect_value.size.y)


## Global JSON rect -> lane-local rect relative to a global origin.
static func local(json_rect: Dictionary, origin: Vector2) -> Rect2:
	return parity.local_rect(json_rect, origin)


static func rect(json_rect: Dictionary) -> Rect2:
	return parity.rect(json_rect)


static func fill(control: Control) -> void:
	control.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)


static func frame(bg_key: String, border_key := "rule") -> Control:
	var node := PanelFrame.new()
	node.bg_color = color(bg_key)
	node.border_color = color(border_key)
	node.border_width = int(parity.style.get("panelBorder", 1))
	node.mouse_filter = Control.MOUSE_FILTER_PASS
	return node


static func rect_node(color_key: String) -> ColorRect:
	var node := ColorRect.new()
	node.color = color(color_key)
	node.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return node


static func rule(color_key := "rule", thickness := 1.0) -> ColorRect:
	var node := rect_node(color_key)
	node.custom_minimum_size = Vector2(0, thickness)
	node.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	return node


static func vrule(color_key := "rule", width := 1.0) -> ColorRect:
	var node := rect_node(color_key)
	node.custom_minimum_size = Vector2(width, 0)
	node.size_flags_vertical = Control.SIZE_EXPAND_FILL
	return node


static func vbox(separation := 0) -> VBoxContainer:
	var node := VBoxContainer.new()
	node.add_theme_constant_override("separation", separation)
	return node


static func hbox(separation := 0) -> HBoxContainer:
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


static func hspace(width: float) -> Control:
	var node := Control.new()
	node.custom_minimum_size = Vector2(width, 0)
	node.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return node


## Children of clickable rows/buttons must not swallow the activation event.
static func ignore_mouse(node: Control) -> void:
	node.mouse_filter = Control.MOUSE_FILTER_IGNORE
	for child in node.get_children():
		if child is Control:
			ignore_mouse(child)


## Standard data-panel header: 40px strip with title left, meta right, and a 1px
## rule on the strip's bottom edge (parity.md "Component styling defaults").
static func panel_header(parent: Control, panel_width: float, title_text: String, meta_text: String, background_key := "") -> Label:
	var header_height := int(parity.panels.get("headerHeight", 40))
	var padding := int(parity.panels.get("padding", 16))
	var strip := rect_node(background_key if not background_key.is_empty() else str(parity.panels["background"]))
	place(strip, 0, 0, panel_width, header_height)
	parent.add_child(strip)
	var title_label := panel_title(title_text)
	place(title_label, padding, (header_height - type_size("panelTitle") - 6) / 2.0, panel_width - padding * 2, type_size("panelTitle") + 6)
	parent.add_child(title_label)
	var meta_label := panel_meta(meta_text)
	meta_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	place(meta_label, padding, (header_height - type_size("panelMeta") - 6) / 2.0, panel_width - padding * 2, type_size("panelMeta") + 6)
	parent.add_child(meta_label)
	var rule_node := rule("rule", 1)
	place(rule_node, 0, header_height - 1, panel_width, 1)
	parent.add_child(rule_node)
	return meta_label


static func pips(count: int, maximum := 2, color_key := "signal", size := 6.0) -> HBoxContainer:
	var row := hbox(3)
	for index in range(maximum):
		var pip := ColorRect.new()
		pip.color = color(color_key) if index < count else color("graphite")
		pip.custom_minimum_size = Vector2(size, size)
		pip.mouse_filter = Control.MOUSE_FILTER_IGNORE
		row.add_child(pip)
	return row


## Parity icon-art tile: graphite square + 1px ruleStrong border + centred
## two-letter code in boneBright (app-authority pin, not a package component).
## `# NOT FSDS: parity icon-art language (portable code tiles)`.
static func code_tile(code: String, tile_size: float, font_size: float, background := "graphite", border := "ruleStrong") -> Control:
	var art: Dictionary = parity.raw.get("iconArt", {})
	var radius := float(art.get("rowTile", {}).get("radius", 0))
	var tile := PanelFrame.new()
	tile.bg_color = color(background)
	tile.border_color = color(border)
	tile.border_width = int(art.get("rowTile", {}).get("borderWidth", 1))
	tile.custom_minimum_size = Vector2(tile_size, tile_size)
	tile.size = Vector2(tile_size, tile_size)
	tile.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var label := label(code, int(font_size), 800, "boneBright", 0.0)
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	place(label, 0, 0, tile_size, tile_size)
	tile.add_child(label)
	return tile


## Thin progress bar styled from the lane theme (graphite track, signal fill).
static func progress_bar(width: float, height: float, value: float, maximum: float) -> ProgressBar:
	var bar := ProgressBar.new()
	bar.min_value = 0.0
	bar.max_value = maxf(maximum, 1.0)
	bar.value = value
	bar.show_percentage = false
	bar.custom_minimum_size = Vector2(width, height)
	bar.size = Vector2(width, height)
	var track := orion.flat(color("graphite"), Color.TRANSPARENT, 0, 0.0)
	var fill := orion.flat(color("signal"), Color.TRANSPARENT, 0, 0.0)
	bar.add_theme_stylebox_override("background", track)
	bar.add_theme_stylebox_override("fill", fill)
	return bar
