class_name DSFactory
extends RefCounted

## Factory for the admitted generated Full Stack DS Godot components, restyled to
## the parity-pass geometry/colour/type authority (`fixtures/parity-layout.json`).
##
## The lane consumes the package only through its shipped `.tscn` scenes and the
## documented channel API (`value`, `controlled`, `value_requested`/
## `value_changed`, `add_item`, Popover `content`, `token_overrides`,
## `set_contract_prop`). Lane-local fallbacks are centralized here and ledgered in
## the README:
##   1. control-family components (Switch/Tabs/Popover) have no `token_overrides`
##      channel and their authored theme projects a light-theme foreground, so a
##      lane-local Theme plus `add_theme_*_override` shapes their generated nodes;
##   2. the generated Popover is trigger-driven, so the app anchors and sizes the
##      surface itself and hides the generated trigger;
##   3. the switch track/thumb are Godot default CheckButton icons on this target,
##      so the lane supplies 64x32 SVG icon overrides for checked/unchecked.

static var orion: OrionTheme
static var parity: ParityLayout

const TABS_SCENE := "res://addons/full_stack_ds/components/Tabs/Tabs.tscn"
const SWITCH_SCENE := "res://addons/full_stack_ds/components/Switch/Switch.tscn"
const POPOVER_SCENE := "res://addons/full_stack_ds/components/Popover/Popover.tscn"
const BUTTON_SCENE := "res://addons/full_stack_ds/components/Button/Button.tscn"
const BADGE_SCENE := "res://addons/full_stack_ds/components/Badge/Badge.tscn"
const CARD_SCENE := "res://addons/full_stack_ds/components/Card/Card.tscn"
const ICON_SCENE := "res://addons/full_stack_ds/components/Icon/Icon.tscn"
const TEXT_SCENE := "res://addons/full_stack_ds/components/Text/Text.tscn"
const DIVIDER_SCENE := "res://addons/full_stack_ds/components/Divider/Divider.tscn"

static var _switch_icons: Dictionary = {}


static func _instantiate(scene_path: String):
	var packed := load(scene_path)
	if not packed is PackedScene:
		push_error("DSFACTORY_MISSING_SCENE: " + scene_path)
		return null
	return packed.instantiate()


# --- tabs --------------------------------------------------------------------

static func tabs():
	var node = _instantiate(TABS_SCENE)
	if node == null:
		return null
	# NOT FSDS: generated Tabs projects a light-theme trigger foreground and has
	# no token channel; a lane-local theme keeps native children legible on ink.
	node.theme = orion.control_theme()
	return node


## Forces the generated Tabs strip to the parity tab-bar geometry: four 320x56
## buttons at x=0/320/640/960, then the content body at the parity content rect.
static func style_tabs(node) -> void:
	var tab_type := parity.type_size("tab")
	var label_inset := float(parity.tab_bar.get("labelInset", 32))
	var tab_background := str(parity.tab_bar["background"])
	var active_background := str(parity.tab_bar["activeBackground"])
	var inactive_text := str(parity.tab_bar["inactiveText"])
	var active_text := str(parity.tab_bar["activeText"])
	var inactive := _tab_style(orion.color(tab_background), Color.TRANSPARENT, label_inset)
	var hover := _tab_style(orion.color("signalHot"), Color.TRANSPARENT, label_inset)
	var active := _tab_style(orion.color(active_background), orion.color(active_background), label_inset)
	# Ops: pinned tab label inset (parity.tabBar.labelInset).
	for style in [inactive, hover, active]:
		style.content_margin_left = 32
		style.content_margin_right = 0
	var tab_width := float(parity.tab_bar["tabs"][0]["w"])
	var tab_height := float(parity.tab_bar["rect"]["h"])
	for index in range(node.items.size()):
		var item: Dictionary = node.items[index]
		var button: Button = item.button
		button.custom_minimum_size = Vector2(tab_width, tab_height)
		button.size = Vector2(tab_width, tab_height)
		button.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
		button.size_flags_vertical = Control.SIZE_FILL
		button.add_theme_stylebox_override("normal", inactive)
		button.add_theme_stylebox_override("hover", hover)
		button.add_theme_stylebox_override("pressed", active)
		button.add_theme_stylebox_override("focus", StyleBoxEmpty.new())
		button.alignment = HORIZONTAL_ALIGNMENT_LEFT
		button.add_theme_color_override("font_color", orion.color(inactive_text))
		button.add_theme_color_override("font_hover_color", orion.color(active_text))
		button.add_theme_color_override("font_pressed_color", orion.color(active_text))
		button.add_theme_font_override("font", orion.font(tab_type, 700))
		button.add_theme_font_size_override("font_size", tab_type)
		button.alignment = HORIZONTAL_ALIGNMENT_LEFT
		item.body.add_theme_stylebox_override("panel", StyleBoxEmpty.new())
	node.strip.add_theme_constant_override("separation", 0)
	var content_y := float(parity.panels["content"]["y"])
	var head_y := float(parity.tab_bar["rect"]["y"])
	node.add_theme_constant_override("separation", int(content_y - head_y - tab_height))
	node.add_theme_constant_override("separation", int(content_y - head_y - tab_height))


static func _tab_style(bg: Color, border: Color, label_inset: float) -> StyleBoxFlat:
	var box := orion.flat(bg, border, 0, 0.0)
	box.content_margin_left = label_inset
	box.content_margin_right = label_inset
	return box


# --- switch ------------------------------------------------------------------

static func toggle(_label := ""):
	var node = _instantiate(SWITCH_SCENE)
	if node == null:
		return null
	# NOT FSDS: generated Switch projects a light-theme label foreground and has
	# no token channel; a lane-local theme keeps the CheckButton legible on ink.
	node.theme = orion.control_theme()
	node.label = ""
	return node


## Applies the parity switch geometry + SVG icon overrides. Call after the node
## entered the tree (the generated trigger exists from `_ready`).
static func prepare_switch(node) -> void:
	var switch_width := float(parity.switch_data["width"])
	var switch_height := float(parity.switch_data["height"])
	node.custom_minimum_size = Vector2(switch_width, switch_height)
	var trigger: CheckButton = node.trigger
	trigger.text = ""
	trigger.custom_minimum_size = Vector2(switch_width, switch_height)
	trigger.size = Vector2(switch_width, switch_height)
	trigger.add_theme_icon_override("checked", switch_icon(true))
	trigger.add_theme_icon_override("unchecked", switch_icon(false))
	trigger.add_theme_icon_override("checked_disabled", switch_icon(true))
	trigger.add_theme_icon_override("unchecked_disabled", switch_icon(false))
	trigger.add_theme_constant_override("icon_max_width", int(switch_width))
	trigger.add_theme_constant_override("h_separation", 0)
	# Remove the theme styleboxes so their content margins cannot inflate the
	# CheckButton minimum height (the 40px box vertically centred the 32px pill
	# and shifted every switch down by 4px relative to the parity rect).
	for state in ["normal", "hover", "pressed", "focus", "disabled"]:
		trigger.add_theme_stylebox_override(state, StyleBoxEmpty.new())
	# The parity pill has no visible label: hide the generated empty strip/content
	# rows so the widget box collapses to exactly 64x32 instead of 48px (the VBox
	# separation between the empty rows otherwise pushes the pill 8px low).
	if node.strip != null:
		node.strip.hide()
	if node.content != null:
		node.content.hide()


## 64x32 stadium track + 24px circular thumb, rendered from the parity switch
## geometry as an SVG and cached per state. Rasterised at 2x for crispness and
## drawn at 64x32 by the CheckButton's icon_max_width cap.
static func switch_icon(checked: bool) -> ImageTexture:
	var key := "checked" if checked else "unchecked"
	if _switch_icons.has(key):
		return _switch_icons[key]
	var width := float(parity.switch_data["width"])
	var height := float(parity.switch_data["height"])
	var radius := float(parity.switch_data["radius"])
	var thumb := float(parity.switch_data["thumb"])
	var inset := float(parity.switch_data["inset"])
	var track_color: Color = parity.color(str(parity.switch_data["onTrack"])) if checked else parity.color(str(parity.switch_data["offTrack"]))
	var thumb_color: Color = parity.color(str(parity.switch_data["onThumb"])) if checked else parity.color(str(parity.switch_data["offThumb"]))
	var thumb_x := float(parity.switch_data["checkedThumbOffset"]) if checked else inset
	var thumb_center := Vector2(thumb_x + thumb / 2.0, height / 2.0)
	var border := ""
	if not checked:
		border = ' stroke="%s" stroke-width="%d"' % [
			"#" + parity.color(str(parity.switch_data["offBorder"])).to_html(false),
			int(parity.switch_data["borderWidth"]),
		]
	# The generated CheckButton reserves icon height + 8px; draw the 64x32 pill at the
	# top of a 64x40 canvas so it paints flush to the parity rect inside that box.
	var canvas_height := height + 8.0
	var svg := '<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 %d %d">' % [int(width), int(canvas_height), int(width), int(canvas_height)]
	svg += '<rect x="%s" y="%s" width="%s" height="%s" rx="%s" fill="%s"%s/>' % [
		"0.5" if not checked else "0",
		"0.5" if not checked else "0",
		"%d" % (int(width) - (1 if not checked else 0)),
		"%d" % (int(height) - (1 if not checked else 0)),
		"%d" % int(radius),
		"#" + track_color.to_html(false),
		border,
	]
	svg += '<circle cx="%s" cy="%s" r="%s" fill="%s"/>' % [
		String.num(thumb_center.x, 1),
		String.num(thumb_center.y, 1),
		String.num(thumb / 2.0, 1),
		"#" + thumb_color.to_html(false),
	]
	svg += "</svg>"
	var image := Image.new()
	var err := image.load_svg_from_string(svg, 2.0)
	if err != OK:
		push_error("DSFACTORY_SWITCH_SVG_FAILED")
		var fallback := Image.create(int(width), int(height), false, Image.FORMAT_RGBA8)
		fallback.fill(track_color)
		var texture := ImageTexture.create_from_image(fallback)
		_switch_icons[key] = texture
		return texture
	var texture := ImageTexture.create_from_image(image)
	_switch_icons[key] = texture
	return texture


# --- popover -----------------------------------------------------------------

static func popover():
	var node = _instantiate(POPOVER_SCENE)
	if node == null:
		return null
	# NOT FSDS: generated Popover projects a light-theme trigger foreground and
	# has no token channel; a lane-local theme shapes its native surface.
	node.theme = orion.control_theme()
	return node


## Hides the generated trigger: the app anchors the surface to an external node
## (marker/card) or to the parity capture rect.
static func prepare_popover(node) -> void:
	node.label = ""
	# NOT FSDS: generated Popover is trigger-driven; the app drives the surface
	# from external app state and closes it from app state.
	# The app owns outside dismissal so a click on another tab can activate that
	# tab before the old surface closes. The generated handler consumes the press.
	node.close_on_outside_click = false
	node.trigger.hide()
	node.trigger.mouse_filter = Control.MOUSE_FILTER_IGNORE


static func style_popover_surface(node, rect_value: Rect2, content_style: Dictionary = {}) -> void:
	if node.surface == null:
		return
	# NOT FSDS: generated surface node has no token/theme channel; the lane sets
	# the parity surface style + size after the surface is attached.
	var shared_content := not content_style.is_empty()
	node.surface.add_theme_stylebox_override("panel", orion.flat(
		orion.color(str(content_style.get("background", "charcoal"))),
		orion.color(str(content_style.get("border", "rule"))),
		int(content_style.get("borderWidth", parity.style.get("panelBorder", 1))),
		0.0 if shared_content else 16.0
	))
	node.surface.size = rect_value.size
	node.surface.position = rect_value.position
	if shared_content:
		node.content.custom_minimum_size = rect_value.size
		node.content.set_deferred("size", rect_value.size)
		node.surface.set_deferred("size", rect_value.size)


# --- actions -----------------------------------------------------------------

## Role styles pinned by parity.md "Component styling defaults".
static func action(text: String, role := "primary", width := 0.0, height := 0.0, font_size := 0):
	var node = _instantiate(BUTTON_SCENE)
	if node == null:
		return null
	node.theme = orion.control_theme()
	node.content = text
	var overrides := action_overrides(role)
	if font_size <= 0:
		font_size = _role_font_size(role)
	overrides["button.design.root.typography.size"] = "%dpx" % font_size
	overrides["button.design.root.typography.weight"] = str(_role_weight(role))
	if height > 0.0:
		overrides["min-height"] = "%dpx" % int(height)
	if width > 0.0:
		overrides["min-width"] = "%dpx" % int(width)
	node.token_overrides = overrides
	if width > 0.0 or height > 0.0:
		node.custom_minimum_size = Vector2(width, height)
	return node


static func _role_font_size(role: String) -> int:
	match role:
		"primary":
			return 13
		"binding":
			return 11
		_:
			return 11


static func _role_weight(role: String) -> int:
	match role:
		"primary":
			return 700
		_:
			return 700


static func action_overrides(role: String) -> Dictionary:
	var signal_color := orion.color("signal")
	var on_signal := orion.color("onSignal")
	var bone_bright := orion.color("boneBright")
	var graphite := orion.color("graphite")
	var rule_strong := orion.color("ruleStrong")
	var ink := orion.color("ink")
	var overrides := {
		"button.design.root.shape.radius": "0",
		"button.design.root.border.width": "1",
		"button.design.focus.border.color": signal_color.to_html(false),
		"padding-block-start": "0px",
		"padding-block-end": "0px",
		"padding-inline-start": "8px",
		"padding-inline-end": "8px",
	}
	match role:
		"primary":
			overrides["button.design.root.background.fill"] = signal_color.to_html(false)
			overrides["button.design.root.foreground.color"] = on_signal.to_html(false)
			overrides["button.design.root.border.color"] = signal_color.to_html(false)
			overrides["button.design.hover.background.fill"] = orion.color("signalHot").to_html(false)
			overrides["button.design.hover.border.color"] = orion.color("signalHot").to_html(false)
			overrides["button.design.active.background.fill"] = orion.color("signalDeep").to_html(false)
			overrides["button.design.disabled.background.fill"] = graphite.to_html(false)
			overrides["button.design.disabled.foreground.color"] = orion.color("muted").to_html(false)
		"outline", "paper-outline":
			var text_color: Color = bone_bright if role == "outline" else ink
			overrides["button.design.root.background.fill"] = "transparent"
			overrides["button.design.root.foreground.color"] = text_color.to_html(false)
			overrides["button.design.root.border.color"] = rule_strong.to_html(false)
			overrides["button.design.hover.background.fill"] = graphite.to_html(false)
			overrides["button.design.hover.border.color"] = text_color.to_html(false)
		"binding":
			overrides["button.design.root.background.fill"] = graphite.to_html(false)
			overrides["button.design.root.foreground.color"] = bone_bright.to_html(false)
			overrides["button.design.root.border.color"] = rule_strong.to_html(false)
			overrides["button.design.hover.background.fill"] = orion.color("charcoal").to_html(false)
			overrides["button.design.hover.border.color"] = orion.color("muted").to_html(false)
		_:
			push_error("DSFACTORY_UNKNOWN_ACTION_ROLE: " + role)
	return overrides


# --- chips -------------------------------------------------------------------

## Status / rarity / installed chip built from the generated Badge component.
static func chip(text: String, bg: Color, fg: Color, border: Color, width: float, height: float, font_size := 10, border_width := 1):
	var node = _instantiate(BADGE_SCENE)
	if node == null:
		return null
	node.theme = orion.control_theme()
	node.set_meta("parity_chip_font_size", font_size)
	node.set_meta("parity_chip_text", text)
	node.set_meta("parity_chip_fg", fg)
	node.set_meta("parity_chip_size", Vector2(width, height))
	node.size_axis = "sm"
	node.custom_minimum_size = Vector2(width, height)
	node.token_overrides = {
		"badge.design.root.background.fill": "transparent" if bg.a <= 0.0 else bg.to_html(false),
		"badge.design.root.foreground.color": fg.to_html(false),
		"badge.design.root.border.color": border.to_html(false),
		"badge.design.root.border.width": str(border_width),
		"badge.design.root.shape.radius": "0",
		"badge.design.root.sizing.min-height": "%dpx" % int(height),
		"badge.design.root.spacing.padding-block": "0px",
		"badge.design.root.spacing.padding-inline": "0px",
		"badge.design.root.spacing.gap": "0px",
		"badge.design.root.typography.size": "%dpx" % font_size,
		"badge.design.root.typography.weight": "700",
	}
	node.content = text
	return node


## Rarity chip with the JSON rarity colour maps (9px/800, 18px tall).
static func rarity_chip(rarity_name: String, width: float, height: float) -> Control:
	var colors := parity.rarity(rarity_name)
	return chip(rarity_name.to_upper(), colors["bg"], colors["fg"], colors["bg"], width, height, 9, 0)


## Centers the projected badge content label after the composite enters the tree.
static func prepare_chip(node: Control) -> void:
	# NOT FSDS: generated Badge exposes no content alignment channel; the lane
	# centers its projected content label for parity chip geometry.
	if node == null:
		return
	if not node.is_node_ready():
		node.ready.connect(prepare_chip.bind(node), CONNECT_ONE_SHOT)
		return
	# Typography parity: the generated Badge exposes no font-family channel, so
	# pin the bundled Inter Bold face at the chip's own size and let the content
	# label fill the chip box so Godot's horizontal alignment can centre it.
	if node.content_label != null:
		var font_size := int(node.get_meta("parity_chip_font_size", 10))
		var chip_size: Vector2 = node.get_meta("parity_chip_size", Vector2(76, 22))
		node.content_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		node.content_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		node.content_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		node.content_label.size_flags_vertical = Control.SIZE_EXPAND_FILL
		node.content_label.custom_minimum_size = Vector2(chip_size.x, 0)
		node.content_label.add_theme_font_override("font", orion.font(font_size, 700))
		node.content_label.add_theme_font_size_override("font_size", font_size)


# --- card / icon / passive ---------------------------------------------------

static func card():
	var node = _instantiate(CARD_SCENE)
	if node == null:
		return null
	node.token_overrides = {
		"card.design.root.background.fill": orion.color("charcoal").to_html(false),
		"card.design.root.border.color": orion.color("rule").to_html(false),
		"card.design.root.shape.radius": "0",
		"card.design.root.border.width": "1",
		"card.design.root.spacing.padding": "0",
		"card.design.root.spacing.gap": "0",
	}
	return node


## Generated Icon scaled to an arbitrary pixel size (authored grids cap at 32).
static func icon(glyph_name: String, target_px: float, tint := Color.TRANSPARENT):
	var node = _instantiate(ICON_SCENE)
	if node == null:
		return null
	var axis := "xl"
	var frame := 32.0
	if target_px <= 16.0:
		axis = "sm"
		frame = 16.0
	elif target_px <= 20.0:
		axis = "md"
		frame = 20.0
	elif target_px <= 24.0:
		axis = "lg"
		frame = 24.0
	node.decorative = true
	node.size_axis = axis
	if tint.a > 0.0:
		node.theme = orion.label_color_theme(tint)
	node.glyph_name = glyph_name
	if not is_equal_approx(frame, target_px):
		node.scale = Vector2(target_px / frame, target_px / frame)
	return node


static func text(content: String, variant := "body"):
	var node = _instantiate(TEXT_SCENE)
	if node == null:
		return null
	node.content = content
	node.variant = variant
	return node


static func divider():
	return _instantiate(DIVIDER_SCENE)
