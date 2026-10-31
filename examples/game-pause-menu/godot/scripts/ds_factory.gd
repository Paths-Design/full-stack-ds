class_name DSFactory
extends RefCounted

## Factory for the admitted generated Full Stack DS Godot components.
##
## The lane consumes the package only through its shipped `.tscn` scenes and the
## documented channel API (`value`, `controlled`, `value_requested`/
## `value_changed`, `add_item`, Popover `content`, `token_overrides`,
## `set_contract_prop`). Two fallbacks are centralized here and ledgered in the
## README:
##   1. Control-family components (Switch/Tabs/Popover) have no `token_overrides`
##      channel and their authored theme projects a light-theme foreground, so a
##      lane-local Theme is assigned and `add_theme_*_override` shapes their
##      generated trigger/surface nodes.
##   2. The generated Popover is trigger-driven; the app anchors its surface to
##      map markers / ability cards, so the generated trigger node is hidden.
## Every such site is marked `# NOT FSDS:` below.

static var orion: OrionTheme

const TABS_SCENE := "res://addons/full_stack_ds/components/Tabs/Tabs.tscn"
const SWITCH_SCENE := "res://addons/full_stack_ds/components/Switch/Switch.tscn"
const POPOVER_SCENE := "res://addons/full_stack_ds/components/Popover/Popover.tscn"
const BUTTON_SCENE := "res://addons/full_stack_ds/components/Button/Button.tscn"
const BADGE_SCENE := "res://addons/full_stack_ds/components/Badge/Badge.tscn"
const CARD_SCENE := "res://addons/full_stack_ds/components/Card/Card.tscn"
const ICON_SCENE := "res://addons/full_stack_ds/components/Icon/Icon.tscn"
const TEXT_SCENE := "res://addons/full_stack_ds/components/Text/Text.tscn"
const DIVIDER_SCENE := "res://addons/full_stack_ds/components/Divider/Divider.tscn"


static func _instantiate(scene_path: String):
	var packed := load(scene_path)
	if not packed is PackedScene:
		push_error("DSFACTORY_MISSING_SCENE: " + scene_path)
		return null
	return packed.instantiate()


# --- control-family ----------------------------------------------------------

static func tabs():
	var node = _instantiate(TABS_SCENE)
	if node == null:
		return null
	# NOT FSDS: generated Tabs projects a light-theme trigger foreground and has
	# no token channel; a lane-local theme keeps native children legible on ink.
	node.theme = orion.control_theme()
	return node


static func toggle(label_text := ""):
	var node = _instantiate(SWITCH_SCENE)
	if node == null:
		return null
	# NOT FSDS: generated Switch projects a light-theme label foreground and has
	# no token channel; a lane-local theme keeps the CheckButton legible on ink.
	node.theme = orion.control_theme()
	node.label = label_text
	return node


static func popover():
	var node = _instantiate(POPOVER_SCENE)
	if node == null:
		return null
	# NOT FSDS: generated Popover projects a light-theme trigger foreground and
	# has no token channel; a lane-local theme shapes its native surface.
	node.theme = orion.control_theme()
	return node


## Must be called after the popover node entered the tree (its trigger node is
## created in `_ready`). Hides the generated trigger: the app drives the surface
## from an external anchor (marker/card), not from the popover's own button.
static func prepare_popover(node) -> void:
	node.label = ""
	# NOT FSDS: generated Popover is trigger-driven; the app anchors this surface
	# to an external map marker / ability-card anchor and closes it from app state.
	node.trigger.hide()
	node.trigger.mouse_filter = Control.MOUSE_FILTER_IGNORE


## Styles the generated attached surface once it exists (`popover.value = "true"`).
static func style_popover_surface(node, bg_key: String) -> void:
	if node.surface == null:
		return
	# NOT FSDS: generated surface node has no token/theme channel; the lane
	# applies a brand StyleBox override after the surface is attached.
	node.surface.add_theme_stylebox_override("panel", orion.flat(orion.color(bg_key), orion.color("ruleStrong"), orion.border_width(), 14.0))


## Generated Tabs exposes content slots (`add_item`) but no per-tab style channel;
## the active tab block is app-level brand styling on generated trigger nodes.
static func style_tabs(node) -> void:
	# NOT FSDS: generated Tabs has no selected-tab style channel; lane-local
	# styleboxes/typography are applied to its generated trigger Buttons.
	var normal: StyleBoxFlat = orion.flat(orion.surface["panel"], orion.surface["rule"], orion.border_width(), 0.0)
	var hover: StyleBoxFlat = orion.flat(orion.surface["raised"], orion.surface["rule"], orion.border_width(), 0.0)
	var pressed: StyleBoxFlat = orion.flat(orion.palette["signal"], orion.palette["signal"], orion.border_width(), 0.0)
	for item in node.items:
		var button: Button = item.button
		button.add_theme_stylebox_override("normal", normal)
		button.add_theme_stylebox_override("hover", hover)
		button.add_theme_stylebox_override("pressed", pressed)
		button.add_theme_stylebox_override("focus", StyleBoxEmpty.new())
		button.add_theme_color_override("font_color", orion.color("muted"))
		button.add_theme_color_override("font_hover_color", orion.color("bone"))
		button.add_theme_color_override("font_pressed_color", orion.color("onSignal"))
		button.add_theme_font_override("font", orion.font(12, 700, 1.2))
		button.add_theme_font_size_override("font_size", 12)
		item.body.add_theme_stylebox_override("panel", StyleBoxEmpty.new())
	node.strip.add_theme_constant_override("separation", 2)


# --- action / composite ------------------------------------------------------

static func action(text: String, style := "primary", size_axis := "medium"):
	var node = _instantiate(BUTTON_SCENE)
	if node == null:
		return null
	node.content = text
	node.size_axis = size_axis
	node.token_overrides = _action_overrides(style)
	return node


static func _action_overrides(style: String) -> Dictionary:
	var signal_color: Color = orion.palette["signal"]
	var hot: Color = orion.palette["signalHot"]
	var deep: Color = orion.palette["signalDeep"]
	var on_signal: Color = orion.palette["onSignal"]
	var bone: Color = orion.palette["bone"]
	var ink: Color = orion.palette["ink"]
	var alert: Color = orion.palette["alert"]
	var overrides := {
		"button.design.root.shape.radius": "0",
		"button.design.root.border.width": "1",
		"button.design.focus.border.color": hot.to_html(false),
		"button.design.disabled.background.fill": orion.surface["rule"].to_html(false),
		"button.design.disabled.foreground.color": orion.surface["muted"].to_html(false),
	}
	match style:
		"primary":
			overrides["button.design.root.background.fill"] = signal_color.to_html(false)
			overrides["button.design.root.foreground.color"] = on_signal.to_html(false)
			overrides["button.design.root.border.color"] = signal_color.to_html(false)
			overrides["button.design.hover.background.fill"] = hot.to_html(false)
			overrides["button.design.hover.border.color"] = hot.to_html(false)
			overrides["button.design.active.background.fill"] = deep.to_html(false)
		"secondary":
			overrides["button.design.root.background.fill"] = bone.to_html(false)
			overrides["button.design.root.foreground.color"] = ink.to_html(false)
			overrides["button.design.root.border.color"] = bone.to_html(false)
			overrides["button.design.hover.background.fill"] = orion.palette["boneBright"].to_html(false)
			overrides["button.design.hover.border.color"] = orion.palette["boneBright"].to_html(false)
			overrides["button.design.active.background.fill"] = orion.palette["bone"].to_html(false)
		"outline":
			overrides["button.design.root.background.fill"] = "transparent"
			overrides["button.design.root.foreground.color"] = bone.to_html(false)
			overrides["button.design.root.border.color"] = orion.surface["ruleStrong"].to_html(false)
			overrides["button.design.hover.background.fill"] = orion.surface["raised"].to_html(false)
			overrides["button.design.hover.border.color"] = orion.surface["muted"].to_html(false)
		"danger":
			overrides["button.design.root.background.fill"] = alert.to_html(false)
			overrides["button.design.root.foreground.color"] = on_signal.to_html(false)
			overrides["button.design.root.border.color"] = alert.to_html(false)
			overrides["button.design.hover.background.fill"] = orion.palette["signal"].to_html(false)
		"ghost":
			overrides["button.design.root.background.fill"] = "transparent"
			overrides["button.design.root.foreground.color"] = bone.to_html(false)
			overrides["button.design.root.border.color"] = "transparent"
			overrides["button.design.hover.background.fill"] = orion.surface["raised"].to_html(false)
		"ink":
			# Action on the bone dossier paper.
			overrides["button.design.root.background.fill"] = orion.surface["app"].to_html(false)
			overrides["button.design.root.foreground.color"] = orion.palette["boneBright"].to_html(false)
			overrides["button.design.root.border.color"] = orion.surface["app"].to_html(false)
			overrides["button.design.hover.background.fill"] = orion.palette["ink"].to_html(false)
			overrides["button.design.hover.border.color"] = orion.palette["ink"].to_html(false)
		"ink-outline":
			overrides["button.design.root.background.fill"] = "transparent"
			overrides["button.design.root.foreground.color"] = ink.to_html(false)
			overrides["button.design.root.border.color"] = orion.surface["ruleStrong"].to_html(false)
			overrides["button.design.hover.background.fill"] = orion.palette["boneBright"].to_html(false)
			overrides["button.design.hover.border.color"] = ink.to_html(false)
			overrides["button.design.disabled.foreground.color"] = orion.surface["ruleStrong"].to_html(false)
		_:
			push_error("DSFACTORY_UNKNOWN_ACTION_STYLE: " + style)
	return overrides


static func badge(text: String, bg: Color, fg: Color, border: Color, size_axis := "sm"):
	var node = _instantiate(BADGE_SCENE)
	if node == null:
		return null
	node.size_axis = size_axis
	node.token_overrides = {
		"badge.design.root.background.fill": bg.to_html(false),
		"badge.design.root.foreground.color": fg.to_html(false),
		"badge.design.root.border.color": border.to_html(false),
		"badge.design.root.border.width": "1",
		"badge.design.root.shape.radius": "0",
	}
	node.content = text
	return node


static func rarity_badge(rarity_name: String, size_axis := "sm"):
	var colors := orion.rarity(rarity_name)
	return badge(rarity_name.to_upper(), colors["bg"], colors["fg"], colors["border"], size_axis)


static func card():
	var node = _instantiate(CARD_SCENE)
	if node == null:
		return null
	node.token_overrides = {
		"card.design.root.background.fill": orion.surface["raised"].to_html(false),
		"card.design.root.border.color": orion.surface["rule"].to_html(false),
		"card.design.root.shape.radius": "0",
		"card.design.root.spacing.padding": "10",
		"card.design.root.spacing.gap": "6",
	}
	return node


static func icon(glyph_name: String, size_axis := "md", tint := Color.TRANSPARENT):
	var node = _instantiate(ICON_SCENE)
	if node == null:
		return null
	node.decorative = true
	node.size_axis = size_axis
	if tint.a > 0.0:
		node.theme = orion.label_color_theme(tint)
	node.glyph_name = glyph_name
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
