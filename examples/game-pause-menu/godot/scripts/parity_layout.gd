class_name ParityLayout
extends RefCounted

## Typed accessor over `fixtures/parity-layout.json`, the parity-pass design
## authority for the Godot lane. Every layout constant used by the lane comes from
## this object; no geometry, colour or type size is re-typed in lane source.
##
## The raw dictionaries stay available because the JSON's shape is the shared
## contract; this wrapper only adds colour/type/rect conveniences.

var raw: Dictionary = {}
var viewport := Vector2(1280, 800)
var colors: Dictionary = {}
var type: Dictionary = {}
var style: Dictionary = {}
var switch_data: Dictionary = {}
var header: Dictionary = {}
var tab_bar: Dictionary = {}
var footer: Dictionary = {}
var panels: Dictionary = {}
var map: Dictionary = {}
var progress: Dictionary = {}
var abilities: Dictionary = {}
var settings: Dictionary = {}
var marker_monograms: Dictionary = {}
var marker_colors: Dictionary = {}
var rarity_colors: Dictionary = {}
var rarity_text_colors: Dictionary = {}
var status_chip: Dictionary = {}
var captures: Dictionary = {}

var _color_cache: Dictionary = {}


static func from_dict(data: Dictionary) -> ParityLayout:
	var layout := ParityLayout.new()
	layout.raw = data
	layout.viewport = Vector2(float(data["viewport"]["width"]), float(data["viewport"]["height"]))
	for key in data["colors"]:
		layout.colors[key] = Color(str(data["colors"][key]))
	layout.type = data["type"].duplicate(true)
	layout.style = data["style"].duplicate(true)
	layout.switch_data = data["switch"].duplicate(true)
	layout.header = data["header"]
	layout.tab_bar = data["tabBar"]
	layout.footer = data["footer"]
	layout.panels = data["panels"]
	layout.map = data["map"]
	layout.progress = data["progress"]
	layout.abilities = data["abilities"]
	layout.settings = data["settings"]
	layout.marker_monograms = data["markerMonograms"].duplicate(true)
	layout.marker_colors = data["markerColors"].duplicate(true)
	layout.rarity_colors = data["rarityColors"].duplicate(true)
	layout.rarity_text_colors = data["rarityTextColors"].duplicate(true)
	layout.status_chip = data["statusChip"].duplicate(true)
	layout.captures = data["captures"].duplicate(true)
	return layout


func color(key: String) -> Color:
	if not colors.has(key):
		push_error("PARITY_UNKNOWN_COLOR: " + key)
		return Color.MAGENTA
	return colors[key]


func type_size(key: String) -> int:
	if not type.has(key):
		push_error("PARITY_UNKNOWN_TYPE: " + key)
		return 13
	return int(type[key])


func letter_spacing(key: String) -> float:
	return float(type.get(key, 0.0))


func rect(rect_dict: Dictionary) -> Rect2:
	return Rect2(
		float(rect_dict.get("x", 0.0)),
		float(rect_dict.get("y", 0.0)),
		float(rect_dict.get("w", 0.0)),
		float(rect_dict.get("h", 0.0))
	)


## Rect expressed relative to a global origin (e.g. the content rect).
func local_rect(rect_dict: Dictionary, origin: Vector2) -> Rect2:
	var global_rect := rect(rect_dict)
	return Rect2(global_rect.position - origin, global_rect.size)


## Variant for rects given as x/y/w/h scalars (switch geometry, captured overlays).
func make_rect(x: float, y: float, width: float, height: float) -> Rect2:
	return Rect2(Vector2(x, y), Vector2(width, height))


func content_origin() -> Vector2:
	var content: Dictionary = panels["content"]
	return Vector2(float(content["x"]), float(content["y"]))


func capture_state(name: String) -> Dictionary:
	if not captures.has(name):
		push_error("PARITY_UNKNOWN_CAPTURE: " + name)
		return {}
	return captures[name]


func switch_geometry() -> Dictionary:
	return switch_data


func rarity(rarity_name: String) -> Dictionary:
	var bg_key := str(rarity_colors.get(rarity_name, "textSecondary"))
	var fg_key := str(rarity_text_colors.get(rarity_name, "ink"))
	return {"bg": color(bg_key), "fg": color(fg_key), "border": color(bg_key)}


func marker_color(kind: String) -> Color:
	return color(str(marker_colors.get(kind, "bone")))


func marker_monogram(kind: String) -> String:
	return str(marker_monograms.get(kind, "?"))


func status_colors() -> Dictionary:
	return {
		"accessBg": color(str(status_chip["accessBackground"])),
		"accessFg": color(str(status_chip["accessText"])),
		"lockedBorder": color(str(status_chip["lockedBorder"])),
		"lockedText": color(str(status_chip["lockedText"])),
	}


## Pinned icon-art code for an icon-visibility row. The parity.md "Icon art"
## section enumerates the accepted codes; camel-case names otherwise fall back to
## their segment initials, and single words to their first two letters.
func icon_code_for_catalog(catalog_name: String) -> String:
	var codes: Dictionary = raw.get("iconArt", {}).get("rowTile", {}).get("codes", {})
	if codes.has(catalog_name):
		return str(codes[catalog_name])
	for key in codes.keys():
		if str(key).to_lower() == catalog_name.to_lower():
			return str(codes[key])
	return _segments_code(catalog_name)


## Ability-card code: first two letters of the ability name, uppercased.
func ability_code(ability_name: String) -> String:
	var alphanumeric := ""
	for index in range(ability_name.length()):
		var ch := ability_name[index]
		if (ch >= "a" and ch <= "z") or (ch >= "A" and ch <= "Z") or (ch >= "0" and ch <= "9"):
			alphanumeric += ch
	if alphanumeric.length() < 2:
		return alphanumeric.to_upper()
	return alphanumeric.substr(0, 2).to_upper()


func _segments_code(raw: String) -> String:
	var segments: Array[String] = []
	var current := ""
	for index in range(raw.length()):
		var ch := raw[index]
		if ch >= "A" and ch <= "Z" and not current.is_empty():
			segments.append(current)
			current = ""
		if ch != "-" and ch != " ":
			current += ch
	if not current.is_empty():
		segments.append(current)
	if segments.size() >= 2:
		return (segments[0].substr(0, 1) + segments[1].substr(0, 1)).to_upper()
	if segments.size() == 1:
		return segments[0].substr(0, 2).to_upper()
	return "??"


## Contrast helper shared by marker monograms, subtitle previews and chips.
func contrast_text(background: Color) -> Color:
	var luminance := 0.2126 * background.r + 0.7152 * background.g + 0.0722 * background.b
	return color("ink") if luminance > 0.45 else color("boneBright")
