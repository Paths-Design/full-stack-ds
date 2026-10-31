class_name OrionTheme
extends RefCounted

## Lane-local brand projection for the Godot target.
##
## The Godot package has no resolved brand projection (no `data-brand` scope, no
## token graph loader), so the Orion N5 palette from
## `fixtures/orion-appearance.json` is applied through this lane-local Theme plus
## `token_overrides` / `add_theme_*_override` on generated components. This is
## the lane's honest brand-delivery mechanism and is recorded in the lane README.

const TRANSPARENT := Color(0, 0, 0, 0)

var palette: Dictionary = {}
var surface: Dictionary = {}
var style: Dictionary = {}
var _rarity_cache: Dictionary = {}

static func from_appearance(appearance: Dictionary) -> OrionTheme:
	var theme := OrionTheme.new()
	var raw_palette: Dictionary = appearance.get("palette", {})
	for key in raw_palette:
		theme.palette[key] = Color(str(raw_palette[key]))
	var raw_surface: Dictionary = appearance.get("surface", {})
	for key in raw_surface:
		theme.surface[key] = Color(str(raw_surface[key]))
	theme.style = appearance.get("style", {}).duplicate(true)
	return theme


func color(key: String) -> Color:
	if palette.has(key):
		return palette[key]
	if surface.has(key):
		return surface[key]
	push_error("ORION_THEME_UNKNOWN_COLOR: " + key)
	return Color.MAGENTA


## `LABEL — VALUE` graphic grammar uses uppercase, letter-spaced micro labels.
func micro_spacing() -> float:
	return float(style.get("microLabelLetterSpacing", 1.4))


## System-font projection with the Orion type treatment. This target bundles no
## condensed grotesque face (see the appearance fixture's `fontNote`), so heavy
## weights plus letter-spaced caps approximate the reference type.
func font(size: int, weight: int, spacing := 0.0) -> Font:
	var system := SystemFont.new()
	system.font_weight = clampi(weight, 100, 900)
	system.allow_system_fallback = true
	if is_zero_approx(spacing):
		return system
	var variation := FontVariation.new()
	variation.base_font = system
	variation.spacing_glyph = roundi(spacing)
	return variation


func radius() -> int:
	return int(style.get("radius", 0))


func border_width() -> int:
	return int(style.get("borderWidth", 1))


func watermark() -> String:
	return str(style.get("watermark", "N5"))


## Zero-radius, no-shadow StyleBoxFlat in the graph-paper vocabulary.
func flat(bg: Color, border := TRANSPARENT, width := 0, margin := 0.0) -> StyleBoxFlat:
	var box := StyleBoxFlat.new()
	box.bg_color = bg
	box.border_color = border
	box.set_border_width_all(width)
	box.set_corner_radius_all(radius())
	box.content_margin_left = margin
	box.content_margin_right = margin
	box.content_margin_top = margin
	box.content_margin_bottom = margin
	box.anti_aliasing = false
	return box


func panel_style(bg_key: String, border_key := "", width := -1, margin := 0.0) -> StyleBoxFlat:
	var border := TRANSPARENT if border_key.is_empty() else color(border_key)
	var border_px := border_width() if border_key.is_empty() and width < 0 else width
	if width >= 0:
		border_px = width
	return flat(color(bg_key), border, border_px, margin)


## Rarity chips are app data, not a brand token; this is the lane's mapping of the
## fixture rarity vocabulary onto the Orion palette.
func rarity(rarity_name: String) -> Dictionary:
	if _rarity_cache.has(rarity_name):
		return _rarity_cache[rarity_name]
	var mapping: Dictionary
	match rarity_name:
		"common":
			mapping = {"bg": surface["ruleStrong"], "fg": palette["boneBright"], "border": surface["rule"]}
		"uncommon":
			mapping = {"bg": palette["clear"], "fg": palette["ink"], "border": palette["clear"]}
		"rare":
			mapping = {"bg": palette["signalHot"], "fg": palette["onSignal"], "border": palette["signalHot"]}
		"epic":
			mapping = {"bg": palette["signal"], "fg": palette["onSignal"], "border": palette["signal"]}
		"legendary":
			mapping = {"bg": palette["boneBright"], "fg": palette["ink"], "border": palette["signal"]}
		_:
			mapping = {"bg": surface["rule"], "fg": palette["bone"], "border": surface["ruleStrong"]}
	_rarity_cache[rarity_name] = mapping
	return mapping


func kind_color(kind: String) -> Color:
	match kind:
		"relay":
			return palette["sage"]
		"cache":
			return palette["signalHot"]
		"pad":
			return palette["boneBright"]
		"vein":
			return surface["telemetry"]
		"beacon":
			return palette["alert"]
		"weather":
			return palette["moss"]
		"rover":
			return surface["muted"]
		"camp":
			return palette["signal"]
	return palette["bone"]


# --- themes ------------------------------------------------------------------

## Root shell theme: native chrome (labels, panels, sliders, dropdowns, bars).
func shell_theme() -> Theme:
	var theme := Theme.new()
	theme.default_font_size = 13
	theme.set_color("font_color", "Label", palette["bone"])
	theme.set_color("font_color", "Button", palette["bone"])
	theme.set_color("font_color", "CheckButton", palette["bone"])
	theme.set_color("font_color", "OptionButton", palette["bone"])
	theme.set_color("font_color", "MenuButton", palette["bone"])
	theme.set_color("font_color", "PopupMenu", palette["bone"])
	theme.set_color("font_hover_color", "PopupMenu", palette["boneBright"])
	theme.set_color("font_disabled_color", "Label", surface["muted"])
	theme.set_color("font_selected_color", "OptionButton", palette["boneBright"])

	theme.set_stylebox("normal", "Button", flat(surface["raised"], surface["rule"], border_width(), 0.0))
	theme.set_stylebox("hover", "Button", flat(surface["rule"], surface["ruleStrong"], border_width(), 0.0))
	theme.set_stylebox("pressed", "Button", flat(surface["ruleStrong"], surface["ruleStrong"], border_width(), 0.0))
	theme.set_stylebox("focus", "Button", StyleBoxEmpty.new())

	theme.set_stylebox("normal", "OptionButton", flat(surface["raised"], surface["rule"], border_width(), 0.0))
	theme.set_stylebox("hover", "OptionButton", flat(surface["rule"], surface["ruleStrong"], border_width(), 0.0))
	theme.set_stylebox("pressed", "OptionButton", flat(surface["rule"], surface["ruleStrong"], border_width(), 0.0))
	theme.set_stylebox("focus", "OptionButton", StyleBoxEmpty.new())

	theme.set_stylebox("panel", "PanelContainer", flat(surface["panel"], surface["rule"], border_width(), 0.0))
	theme.set_stylebox("panel", "PopupMenu", flat(surface["panel"], surface["ruleStrong"], border_width(), 0.0))
	theme.set_stylebox("hover", "PopupMenu", flat(surface["raised"], TRANSPARENT, 0, 0.0))

	theme.set_stylebox("background", "ProgressBar", flat(surface["rule"], TRANSPARENT, 0, 0.0))
	theme.set_stylebox("fill", "ProgressBar", flat(palette["signal"], TRANSPARENT, 0, 0.0))

	var track: StyleBoxFlat = flat(surface["rule"], TRANSPARENT, 0, 0.0)
	track.content_margin_top = 2.0
	track.content_margin_bottom = 2.0
	theme.set_stylebox("slider", "HSlider", track)
	theme.set_stylebox("grabber_area", "HSlider", flat(palette["signal"], TRANSPARENT, 0, 0.0))
	theme.set_stylebox("grabber_area_highlight", "HSlider", flat(palette["signalHot"], TRANSPARENT, 0, 0.0))

	theme.set_stylebox("scroll", "VScrollBar", flat(surface["panel"], TRANSPARENT, 0, 0.0))
	theme.set_stylebox("grabber", "VScrollBar", flat(surface["ruleStrong"], TRANSPARENT, 0, 0.0))
	theme.set_stylebox("grabber_highlight", "VScrollBar", flat(surface["muted"], TRANSPARENT, 0, 0.0))
	theme.set_stylebox("grabber_pressed", "VScrollBar", flat(palette["signal"], TRANSPARENT, 0, 0.0))
	theme.set_stylebox("scroll", "HScrollBar", flat(surface["panel"], TRANSPARENT, 0, 0.0))
	theme.set_stylebox("grabber", "HScrollBar", flat(surface["ruleStrong"], TRANSPARENT, 0, 0.0))
	theme.set_stylebox("grabber_highlight", "HScrollBar", flat(surface["muted"], TRANSPARENT, 0, 0.0))
	theme.set_stylebox("grabber_pressed", "HScrollBar", flat(palette["signal"], TRANSPARENT, 0, 0.0))
	return theme


## Theme for generated control-family scenes (Switch / Tabs / Popover). Their
## owned theme resources only project a light-theme Button foreground, so the lane
## assigns this theme after instantiation to keep native child controls legible on
## the ink ground. Its internal Button/CheckButton styleboxes are emptied because
## the generated control rows draw their own chrome.
func control_theme() -> Theme:
	var theme := shell_theme()
	var empty := StyleBoxEmpty.new()
	for state in ["normal", "hover", "pressed", "focus", "disabled"]:
		theme.set_stylebox(state, "CheckButton", empty)
		theme.set_stylebox(state, "Button", empty)
	theme.set_color("font_color", "CheckButton", palette["bone"])
	theme.set_color("font_color", "Button", palette["bone"])
	return theme


## Small theme that recolors informative glyphs (DSIcon inherits Label font color).
func label_color_theme(font_color: Color) -> Theme:
	var theme := Theme.new()
	theme.set_color("font_color", "Label", font_color)
	return theme
