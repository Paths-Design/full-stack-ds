class_name OrionTheme
extends RefCounted

## Lane-local brand projection for the Godot target.
##
## The Godot package has no resolved brand projection (no `data-brand` scope, no
## token-graph loader), so the Orion palette is applied through this lane-local
## Theme plus `token_overrides` / `add_theme_*_override` on generated components.
## All values come from the parsed parity layout (`ParityLayout`), which is the
## lane's design authority for the parity pass.

const TRANSPARENT := Color(0, 0, 0, 0)

var layout: ParityLayout
var palette: Dictionary = {}
var surface: Dictionary = {}
var style: Dictionary = {}


static func from_parity(parity: ParityLayout) -> OrionTheme:
	var theme := OrionTheme.new()
	theme.layout = parity
	var colors := parity.colors
	for key in colors:
		theme.palette[key] = colors[key]
	# The surface vocabulary used by the shell/chrome helpers is derived from the
	# parity colour map (no new hues are invented).
	theme.surface = {
		"app": colors["ink"],
		"panel": colors["charcoal"],
		"raised": colors["graphite"],
		"rule": colors["rule"],
		"ruleStrong": colors["ruleStrong"],
		"muted": colors["muted"],
		"telemetry": colors["sage"],
	}
	theme.style = {
		"radius": float(parity.style.get("radius", 0)),
		"borderWidth": float(parity.style.get("panelBorder", 1)),
		"microLabelLetterSpacing": parity.letter_spacing("letterSpacingMicro"),
	}
	return theme


func color(key: String) -> Color:
	if palette.has(key):
		return palette[key]
	if surface.has(key):
		return surface[key]
	push_error("ORION_THEME_UNKNOWN_COLOR: " + key)
	return Color.MAGENTA


func type_size(key: String) -> int:
	return layout.type_size(key)


func micro_spacing() -> float:
	return float(style.get("microLabelLetterSpacing", 1.2))


func tab_spacing() -> float:
	return layout.letter_spacing("letterSpacingTab")


func radius() -> int:
	return int(style.get("radius", 0))


func border_width() -> int:
	return int(style.get("borderWidth", 1))


## Typography parity: the lanes ship Inter 4.1 static faces in
## `examples/game-pause-menu/fonts` (copied into `res://fonts` by setup.sh).
## Two weights are pinned (400 regular / 700 bold) and tracking is zero; the
## `spacing` argument is kept for call-site compatibility and ignored.
const FONT_DIR := "res://fonts/inter"
static var _font_cache: Dictionary = {}

func font(size: int, weight := 400, _spacing := 0.0) -> Font:
	var bold := weight >= 700
	var key := "%d:%s" % [size, "bold" if bold else "regular"]
	if _font_cache.has(key):
		return _font_cache[key]
	var path := FONT_DIR + ("/Inter-Bold.ttf" if bold else "/Inter-Regular.ttf")
	var face := FontFile.new()
	var error := face.load_dynamic_font(path)
	if error != OK:
		push_error("ORION_THEME_INTER_FONT_MISSING: " + path + " (run setup.sh)")
		return ThemeDB.fallback_font
	face.fixed_size = size
	face.allow_system_fallback = true
	_font_cache[key] = face
	return face


func default_font() -> Font:
	return font(type_size("body"), 400)


## Zero-radius, no-shadow StyleBoxFlat.
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
	var border_px := border_width() if width < 0 else width
	if border_key.is_empty() and width < 0:
		border_px = 0
	return flat(color(bg_key), border, border_px, margin)


# --- themes ------------------------------------------------------------------

## Root shell theme: native chrome (labels, panels, sliders, dropdowns, bars).
func shell_theme() -> Theme:
	var theme := Theme.new()
	var text_primary: Color = palette["boneBright"]
	theme.default_font = default_font()
	theme.default_font_size = type_size("body")
	theme.set_color("font_color", "Label", text_primary)
	theme.set_color("font_color", "Button", text_primary)
	theme.set_color("font_color", "CheckButton", text_primary)
	theme.set_color("font_color", "OptionButton", palette["boneBright"])
	theme.set_color("font_color", "MenuButton", text_primary)
	theme.set_color("font_color", "PopupMenu", text_primary)
	theme.set_color("font_hover_color", "PopupMenu", palette["boneBright"])
	theme.set_color("font_disabled_color", "Label", palette["muted"])

	theme.set_stylebox("normal", "Button", flat(palette["graphite"], palette["ruleStrong"], border_width(), 0.0))
	theme.set_stylebox("hover", "Button", flat(palette["charcoal"], palette["muted"], border_width(), 0.0))
	theme.set_stylebox("pressed", "Button", flat(palette["charcoal"], palette["signal"], border_width(), 0.0))
	theme.set_stylebox("focus", "Button", StyleBoxEmpty.new())

	theme.set_stylebox("normal", "OptionButton", flat(palette["graphite"], palette["ruleStrong"], border_width(), 0.0))
	theme.set_stylebox("hover", "OptionButton", flat(palette["charcoal"], palette["muted"], border_width(), 0.0))
	theme.set_stylebox("pressed", "OptionButton", flat(palette["charcoal"], palette["signal"], border_width(), 0.0))
	theme.set_stylebox("focus", "OptionButton", StyleBoxEmpty.new())

	theme.set_stylebox("panel", "PanelContainer", flat(palette["charcoal"], palette["rule"], border_width(), 0.0))
	theme.set_stylebox("panel", "PopupMenu", flat(palette["charcoal"], palette["ruleStrong"], border_width(), 0.0))
	theme.set_stylebox("hover", "PopupMenu", flat(palette["graphite"], TRANSPARENT, 0, 0.0))

	theme.set_stylebox("background", "ProgressBar", flat(palette["graphite"], TRANSPARENT, 0, 0.0))
	theme.set_stylebox("fill", "ProgressBar", flat(palette["signal"], TRANSPARENT, 0, 0.0))

	# Slider: 300x6 graphite track, signal fill, 16px boneBright thumb (the thumb
	# is a theme icon; lane-local SVG override is applied in DSFactory/UI).
	var track := flat(palette["graphite"], TRANSPARENT, 0, 0.0)
	track.content_margin_top = 5.0
	track.content_margin_bottom = 5.0
	theme.set_stylebox("slider", "HSlider", track)
	theme.set_stylebox("grabber_area", "HSlider", flat(palette["signal"], TRANSPARENT, 0, 0.0))
	theme.set_stylebox("grabber_area_highlight", "HSlider", flat(palette["signalHot"], TRANSPARENT, 0, 0.0))

	theme.set_stylebox("scroll", "VScrollBar", flat(palette["charcoal"], TRANSPARENT, 0, 0.0))
	theme.set_stylebox("grabber", "VScrollBar", flat(palette["ruleStrong"], TRANSPARENT, 0, 0.0))
	theme.set_stylebox("grabber_highlight", "VScrollBar", flat(palette["muted"], TRANSPARENT, 0, 0.0))
	theme.set_stylebox("grabber_pressed", "VScrollBar", flat(palette["signal"], TRANSPARENT, 0, 0.0))
	theme.set_stylebox("scroll", "HScrollBar", flat(palette["charcoal"], TRANSPARENT, 0, 0.0))
	theme.set_stylebox("grabber", "HScrollBar", flat(palette["ruleStrong"], TRANSPARENT, 0, 0.0))
	theme.set_stylebox("grabber_highlight", "HScrollBar", flat(palette["muted"], TRANSPARENT, 0, 0.0))
	theme.set_stylebox("grabber_pressed", "HScrollBar", flat(palette["signal"], TRANSPARENT, 0, 0.0))
	return theme


## Theme for generated control-family scenes (Switch/Tabs/Popover). Their owned
## theme resources only project a light-theme foreground, so the lane assigns this
## theme after instantiation; internal Button/CheckButton styleboxes are emptied
## because the generated control rows draw their own chrome (switches use the
## lane's 64x32 icon overrides).
func control_theme() -> Theme:
	var theme := shell_theme()
	# Generated control-family labels are bold (buttons, tab labels, chips).
	theme.default_font = font(type_size("body"), 700)
	var empty := StyleBoxEmpty.new()
	for state in ["normal", "hover", "pressed", "focus", "disabled"]:
		theme.set_stylebox(state, "CheckButton", empty)
		theme.set_stylebox(state, "Button", empty)
	theme.set_color("font_color", "CheckButton", palette["boneBright"])
	theme.set_color("font_color", "Button", palette["boneBright"])
	return theme


func label_color_theme(font_color: Color) -> Theme:
	var theme := Theme.new()
	theme.set_color("font_color", "Label", font_color)
	return theme
