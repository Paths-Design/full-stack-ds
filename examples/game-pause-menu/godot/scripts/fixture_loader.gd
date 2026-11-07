class_name PauseFixtures
extends RefCounted

## Lane-local adapter for the shared game pause-menu fixture corpus.
##
## This is the only layer that touches raw fixture JSON shape. Every fixture is
## parsed and shape-checked here; a malformed fixture produces loud errors
## (push_error + a non-empty `errors` array, `ok == false`) instead of a
## partially-populated app. Cross-fixture references (vehicle slots -> ability
## ids, commander nav target -> map icon ids, icon names -> the package glyph
## catalog) are validated too.

const FIXTURE_PATHS := {
	"commander": "res://fixtures/commander.json",
	"map_icons": "res://fixtures/map-icons.json",
	"factions": "res://fixtures/factions.json",
	"abilities": "res://fixtures/abilities.json",
	"vehicle": "res://fixtures/vehicle.json",
	"settings": "res://fixtures/settings.json",
	"parity_layout": "res://fixtures/parity-layout.json",
}
const GLYPH_CATALOG_PATH := "res://addons/full_stack_ds/runtime/glyph_catalog.json"
const RARITIES := ["common", "uncommon", "rare", "epic", "legendary"]
const ICON_KINDS := ["relay", "cache", "pad", "vein", "beacon", "weather", "rover", "camp"]

var ok := false
var errors: Array[String] = []
var commander: Dictionary = {}
var map_icons: Dictionary = {}
var factions: Dictionary = {}
var abilities: Dictionary = {}
var vehicle: Dictionary = {}
var settings: Dictionary = {}
var parity_layout: Dictionary = {}
var glyph_names: Dictionary = {}


static func load_all() -> PauseFixtures:
	var fixtures := PauseFixtures.new()
	fixtures._load()
	return fixtures


## Parse one fixture payload without touching disk. Used by the malformed-fixture
## tests; `valid_shape` optionally selects the validator for the payload.
static func parse_text(fixture_name: String, text: String) -> Dictionary:
	var parser := PauseFixtures.new()
	var value = parser._parse_json(text, fixture_name)
	if value == null:
		return {"ok": false, "value": null, "errors": parser.errors}
	if not value is Dictionary:
		parser._fail("%s: top-level JSON must be an object" % fixture_name)
		return {"ok": false, "value": null, "errors": parser.errors}
	parser._load_glyph_catalog()
	if not parser.errors.is_empty():
		return {"ok": false, "value": null, "errors": parser.errors}
	parser._validate(fixture_name, value)
	return {"ok": parser.errors.is_empty(), "value": value, "errors": parser.errors}


## Canonical lowercase-kebab glyph name for a fixture icon name. The fixtures use
## component-style PascalCase names ("CircleDot"); the package glyph catalog uses
## lowercase kebab ids ("circle-dot").
static func glyph_name_for(raw: String) -> String:
	var name := raw.strip_edges()
	if name.is_empty():
		return ""
	var out := ""
	for index in range(name.length()):
		var ch := name[index]
		if ch >= "A" and ch <= "Z":
			if index > 0:
				out += "-"
			out += ch.to_lower()
		else:
			out += ch
	return out


func _load() -> void:
	_load_glyph_catalog()
	for fixture_name in FIXTURE_PATHS:
		var path: String = FIXTURE_PATHS[fixture_name]
		if not FileAccess.file_exists(path):
			_fail("%s: fixture file missing at %s" % [fixture_name, path])
			continue
		var text := FileAccess.get_file_as_string(path)
		var value = _parse_json(text, fixture_name)
		if value == null:
			continue
		if not value is Dictionary:
			_fail("%s: top-level JSON must be an object" % fixture_name)
			continue
		_validate(fixture_name, value)
		var property_name: String = "map_icons" if fixture_name == "map_icons" else fixture_name
		set(property_name, value)
	_resolve_token_palette()
	ok = errors.is_empty()
	if not ok:
		push_error("FIXTURE_CORPUS_MALFORMED: %d error(s); first: %s" % [errors.size(), errors[0]])


func _resolve_token_palette() -> void:
	var resolver := TokenResolver.load_from_project()
	if resolver.resolved.is_empty() or resolver.brand.is_empty():
		for error in resolver.errors:
			_fail("tokens: " + error)
		return
	resolver.apply_to_authority(parity_layout)
	for error in resolver.errors:
		_fail("tokens: " + error)


func _load_glyph_catalog() -> void:
	if not FileAccess.file_exists(GLYPH_CATALOG_PATH):
		_fail("glyph catalog missing at %s (run setup.sh to materialize the addon)" % GLYPH_CATALOG_PATH)
		return
	var catalog = _parse_json(FileAccess.get_file_as_string(GLYPH_CATALOG_PATH), "glyph_catalog")
	if catalog is Dictionary:
		for glyph_name in catalog:
			glyph_names[glyph_name] = true


func _parse_json(text: String, label: String):
	if text.strip_edges().is_empty():
		_fail("%s: empty JSON payload" % label)
		return null
	var json := JSON.new()
	var err := json.parse(text)
	if err != OK:
		_fail("%s: JSON parse error at line %d: %s" % [label, json.get_error_line(), json.get_error_message()])
		return null
	return json.data


func _fail(message: String) -> void:
	errors.append(message)
	push_error("FIXTURE_MALFORMED: " + message)


func _validate(fixture_name: String, data: Dictionary) -> void:
	match fixture_name:
		"commander":
			_validate_commander(data)
		"map_icons":
			_validate_map_icons(data)
		"factions":
			_validate_factions(data)
		"abilities":
			_validate_abilities(data)
		"vehicle":
			_validate_vehicle(data)
		"settings":
			_validate_settings(data)
		"parity_layout":
			_validate_parity_layout(data)
		_:
			_passive_validate(fixture_name, data)


## Cross-fixture checks that need more than one fixture. Called after _load().
func validate_cross_references() -> bool:
	if not ok:
		return false
	var ability_ids: Dictionary = {}
	for ability in abilities.get("abilities", []):
		ability_ids[ability.get("id", "")] = true
	var icon_ids: Dictionary = {}
	for icon in map_icons.get("icons", []):
		icon_ids[icon.get("id", "")] = true
	for slot in vehicle.get("slots", []):
		var ability_id = slot.get("abilityId")
		if ability_id == null:
			continue
		if not ability_ids.has(ability_id):
			_fail("vehicle: slot '%s' references unknown ability '%s'" % [slot.get("id", "?"), ability_id])
	var nav_target = commander.get("navTarget")
	if nav_target != null and not icon_ids.has(str(nav_target)):
		_fail("commander: navTarget '%s' does not name a map icon" % nav_target)
	ok = errors.is_empty()
	return ok


func ability_by_id(ability_id: String) -> Dictionary:
	for ability in abilities.get("abilities", []):
		if ability.get("id", "") == ability_id:
			return ability
	return {}


func faction_by_id(faction_id: String) -> Dictionary:
	for faction in factions.get("factions", []):
		if faction.get("id", "") == faction_id:
			return faction
	return {}


func icon_by_id(icon_id: String) -> Dictionary:
	for icon in map_icons.get("icons", []):
		if icon.get("id", "") == icon_id:
			return icon
	return {}


func slot_by_id(slot_id: String) -> Dictionary:
	for slot in vehicle.get("slots", []):
		if slot.get("id", "") == slot_id:
			return slot
	return {}


# --- field helpers -----------------------------------------------------------

func _has_key(data: Dictionary, key: String, context: String) -> bool:
	if not data.has(key):
		_fail("%s: missing key '%s'" % [context, key])
		return false
	return true


func _string(data: Dictionary, key: String, context: String, allow_empty := false) -> bool:
	if not _has_key(data, key, context):
		return false
	if typeof(data[key]) != TYPE_STRING:
		_fail("%s.%s: expected string, got %s" % [context, key, type_string(typeof(data[key]))])
		return false
	if not allow_empty and str(data[key]).strip_edges().is_empty():
		_fail("%s.%s: must not be empty" % [context, key])
		return false
	return true


func _number(data: Dictionary, key: String, context: String) -> bool:
	if not _has_key(data, key, context):
		return false
	var value_type := typeof(data[key])
	if value_type != TYPE_INT and value_type != TYPE_FLOAT:
		_fail("%s.%s: expected number, got %s" % [context, key, type_string(value_type)])
		return false
	return true


func _bool_field(data: Dictionary, key: String, context: String) -> bool:
	if not _has_key(data, key, context):
		return false
	if typeof(data[key]) != TYPE_BOOL:
		_fail("%s.%s: expected bool, got %s" % [context, key, type_string(typeof(data[key]))])
		return false
	return true


func _array(data: Dictionary, key: String, context: String) -> Array:
	if not _has_key(data, key, context):
		return []
	if not data[key] is Array:
		_fail("%s.%s: expected array" % [context, key])
		return []
	return data[key]


func _dictionary(data: Dictionary, key: String, context: String) -> Dictionary:
	if not _has_key(data, key, context):
		return {}
	if not data[key] is Dictionary:
		_fail("%s.%s: expected object" % [context, key])
		return {}
	return data[key]


func _string_array(data: Dictionary, key: String, context: String, min_count := 0) -> Array:
	var values := _array(data, key, context)
	if values.size() < min_count:
		_fail("%s.%s: expected at least %d entries" % [context, key, min_count])
		return []
	for index in range(values.size()):
		if typeof(values[index]) != TYPE_STRING or str(values[index]).strip_edges().is_empty():
			_fail("%s.%s[%d]: expected non-empty string" % [context, key, index])
	return values


func _color_hex(data: Dictionary, key: String, context: String) -> bool:
	if not _string(data, key, context):
		return false
	if not Color.html_is_valid(str(data[key])):
		_fail("%s.%s: '%s' is not a valid hex color" % [context, key, data[key]])
		return false
	return true


func _enum_value(data: Dictionary, key: String, allowed: Array, context: String) -> bool:
	if not _string(data, key, context):
		return false
	if not allowed.has(str(data[key])):
		_fail("%s.%s: '%s' is not one of %s" % [context, key, data[key], allowed])
		return false
	return true


# --- per-fixture validation --------------------------------------------------

func _validate_commander(data: Dictionary) -> void:
	_string(data, "id", "commander")
	_string(data, "callsign", "commander")
	_string(data, "mission", "commander")
	_string(data, "status", "commander")
	var rank := _dictionary(data, "rank", "commander")
	_string(rank, "label", "commander.rank")
	_number(rank, "level", "commander.rank")
	_number(rank, "globalPosition", "commander.rank")
	_string(rank, "percentile", "commander.rank")
	_number(rank, "points", "commander.rank")
	_number(rank, "nextLevelAt", "commander.rank")
	var earnings := _dictionary(data, "earnings", "commander")
	_number(earnings, "credits", "commander.earnings")
	_number(earnings, "pending", "commander.earnings")
	_string(earnings, "currency", "commander.earnings")
	var followers := _dictionary(data, "followers", "commander")
	_number(followers, "total", "commander.followers")
	_string(followers, "trend", "commander.followers")
	_string(followers, "period", "commander.followers")
	if not _has_key(data, "navTarget", "commander"):
		return
	if data["navTarget"] != null and typeof(data["navTarget"]) != TYPE_STRING:
		_fail("commander.navTarget: expected null or string")


func _validate_map_icons(data: Dictionary) -> void:
	_string(data, "sector", "map-icons")
	_string(data, "scale", "map-icons")
	var icons := _array(data, "icons", "map-icons")
	if icons.is_empty():
		_fail("map-icons.icons: expected at least one icon")
	for index in range(icons.size()):
		var context := "map-icons.icons[%d]" % index
		if not icons[index] is Dictionary:
			_fail("%s: expected object" % context)
			continue
		var icon: Dictionary = icons[index]
		_string(icon, "id", context)
		_enum_value(icon, "kind", ICON_KINDS, context)
		_string(icon, "label", context)
		_string(icon, "icon", context)
		var glyph_name := glyph_name_for(str(icon.get("icon", "")))
		if not glyph_name.is_empty() and not glyph_names.has(glyph_name):
			_fail("%s.icon: '%s' -> '%s' is not a glyph in the package catalog" % [context, icon.get("icon", ""), glyph_name])
		for axis in ["x", "y"]:
			if _number(icon, axis, context):
				var value := float(icon[axis])
				if value < 0.0 or value > 1.0:
					_fail("%s.%s: normalized coordinate %.3f outside [0, 1]" % [context, axis, value])
		_bool_field(icon, "visible", context)
		_string(icon, "status", context)
		_string(icon, "sector", context)
		_number(icon, "distanceKm", context)
		_string(icon, "detail", context)
		_string(icon, "reward", context)


func _validate_factions(data: Dictionary) -> void:
	var list := _array(data, "factions", "factions")
	if list.is_empty():
		_fail("factions.factions: expected at least one faction")
	for index in range(list.size()):
		var context := "factions.factions[%d]" % index
		if not list[index] is Dictionary:
			_fail("%s: expected object" % context)
			continue
		var faction: Dictionary = list[index]
		_string(faction, "id", context)
		_string(faction, "name", context)
		_string(faction, "tagline", context)
		_bool_field(faction, "unlocked", context)
		_number(faction, "tier", context)
		_number(faction, "reputation", context)
		_number(faction, "reputationMax", context)
		_string(faction, "requirement", context, true)
		if faction.get("unlocked") == false and str(faction.get("requirement", "")).strip_edges().is_empty():
			_fail("%s.requirement: locked factions must state a requirement" % context)
		var detail := _dictionary(faction, "detail", context)
		_string(detail, "description", context + ".detail")
		_string(detail, "history", context + ".detail")
		_string_array(detail, "perks", context + ".detail", 1)
		var parts := _array(detail, "parts", context + ".detail")
		if parts.is_empty():
			_fail("%s.detail.parts: expected at least one part" % context)
		for part_index in range(parts.size()):
			var part_context := "%s.detail.parts[%d]" % [context, part_index]
			if not parts[part_index] is Dictionary:
				_fail("%s: expected object" % part_context)
				continue
			var part: Dictionary = parts[part_index]
			_string(part, "name", part_context)
			_number(part, "cost", part_context)
			_enum_value(part, "rarity", RARITIES, part_context)
			_number(part, "size", part_context)


func _validate_abilities(data: Dictionary) -> void:
	var list := _array(data, "abilities", "abilities")
	if list.is_empty():
		_fail("abilities.abilities: expected at least one ability")
	for index in range(list.size()):
		var context := "abilities.abilities[%d]" % index
		if not list[index] is Dictionary:
			_fail("%s: expected object" % context)
			continue
		var ability: Dictionary = list[index]
		_string(ability, "id", context)
		_string(ability, "name", context)
		_string(ability, "description", context)
		_enum_value(ability, "rarity", RARITIES, context)
		if _number(ability, "size", context) and int(ability["size"]) not in [1, 2]:
			_fail("%s.size: expected 1 or 2, got %s" % [context, ability["size"]])
		_string(ability, "icon", context)
		var glyph_name := glyph_name_for(str(ability.get("icon", "")))
		if not glyph_name.is_empty() and not glyph_names.has(glyph_name):
			_fail("%s.icon: '%s' -> '%s' is not a glyph in the package catalog" % [context, ability.get("icon", ""), glyph_name])
		var stats := _dictionary(ability, "stats", context)
		if stats.is_empty():
			_fail("%s.stats: expected a stat block" % context)
		_string(ability, "detail", context)


func _validate_vehicle(data: Dictionary) -> void:
	_string(data, "name", "vehicle")
	_string(data, "chassis", "vehicle")
	var slots := _array(data, "slots", "vehicle")
	if slots.size() != 6:
		_fail("vehicle.slots: expected exactly six slots, got %d" % slots.size())
	var seen_slots: Dictionary = {}
	for index in range(slots.size()):
		var context := "vehicle.slots[%d]" % index
		if not slots[index] is Dictionary:
			_fail("%s: expected object" % context)
			continue
		var slot: Dictionary = slots[index]
		_string(slot, "id", context)
		var slot_id := str(slot.get("id", ""))
		if seen_slots.has(slot_id):
			_fail("%s.id: duplicate slot id '%s'" % [context, slot_id])
		seen_slots[slot_id] = true
		_string(slot, "label", context)
		if _number(slot, "size", context) and int(slot["size"]) not in [1, 2]:
			_fail("%s.size: expected 1 or 2, got %s" % [context, slot["size"]])
		if not _has_key(slot, "abilityId", context):
			continue
		if slot["abilityId"] != null and typeof(slot["abilityId"]) != TYPE_STRING:
			_fail("%s.abilityId: expected null or ability id string" % context)


func _validate_settings(data: Dictionary) -> void:
	var general := _array(data, "general", "settings")
	if general.is_empty():
		_fail("settings.general: expected at least one toggle")
	var seen: Dictionary = {}
	for index in range(general.size()):
		var context := "settings.general[%d]" % index
		if not general[index] is Dictionary:
			_fail("%s: expected object" % context)
			continue
		var toggle: Dictionary = general[index]
		_string(toggle, "id", context)
		_string(toggle, "label", context)
		_string(toggle, "description", context)
		_bool_field(toggle, "value", context)
		_unique_id(seen, str(toggle.get("id", "")), context)

	var controller := _array(data, "controller", "settings")
	if controller.is_empty():
		_fail("settings.controller: expected at least one slider")
	for index in range(controller.size()):
		var context := "settings.controller[%d]" % index
		if not controller[index] is Dictionary:
			_fail("%s: expected object" % context)
			continue
		var slider: Dictionary = controller[index]
		_string(slider, "id", context)
		_string(slider, "label", context)
		_string(slider, "description", context)
		_unique_id(seen, str(slider.get("id", "")), context)
		if not (_number(slider, "min", context) and _number(slider, "max", context) and _number(slider, "step", context) and _number(slider, "value", context)):
			continue
		if float(slider["min"]) >= float(slider["max"]):
			_fail("%s.min: must be below max" % context)
		if float(slider["step"]) <= 0.0:
			_fail("%s.step: must be positive" % context)
		if float(slider["value"]) < float(slider["min"]) or float(slider["value"]) > float(slider["max"]):
			_fail("%s.value: outside [min, max]" % context)
		_string(slider, "unit", context, true)

	var remap := _array(data, "remap", "settings")
	if remap.is_empty():
		_fail("settings.remap: expected at least one remap action")
	for index in range(remap.size()):
		var context := "settings.remap[%d]" % index
		if not remap[index] is Dictionary:
			_fail("%s: expected object" % context)
			continue
		var action: Dictionary = remap[index]
		_string(action, "id", context)
		_string(action, "label", context)
		_string(action, "binding", context)
		_unique_id(seen, str(action.get("id", "")), context)

	var audio := _dictionary(data, "audio", "settings")
	var sliders := _array(audio, "sliders", "settings.audio")
	if sliders.is_empty():
		_fail("settings.audio.sliders: expected at least one slider")
	for index in range(sliders.size()):
		var context := "settings.audio.sliders[%d]" % index
		if not sliders[index] is Dictionary:
			_fail("%s: expected object" % context)
			continue
		var slider: Dictionary = sliders[index]
		_string(slider, "id", context)
		_string(slider, "label", context)
		_number(slider, "value", context)
		_string(slider, "unit", context, true)
		_unique_id(seen, "audio:" + str(slider.get("id", "")), context)
	for dropdown_key in ["audioLanguage", "subtitleLanguage"]:
		var dropdown := _dictionary(audio, dropdown_key, "settings.audio")
		_string(dropdown, "label", "settings.audio." + dropdown_key)
		_string(dropdown, "value", "settings.audio." + dropdown_key)
		var options := _string_array(dropdown, "options", "settings.audio." + dropdown_key, 2)
		if not options.is_empty() and not options.has(str(dropdown.get("value", ""))):
			_fail("settings.audio.%s.value: '%s' is not one of the options" % [dropdown_key, dropdown.get("value", "")])
	var background := _dictionary(audio, "subtitleBackground", "settings.audio")
	_string(background, "label", "settings.audio.subtitleBackground")
	_string(background, "value", "settings.audio.subtitleBackground")
	var swatch_options := _array(background, "options", "settings.audio.subtitleBackground")
	if swatch_options.is_empty():
		_fail("settings.audio.subtitleBackground.options: expected at least one swatch")
	var swatch_ids: Dictionary = {}
	for index in range(swatch_options.size()):
		var context := "settings.audio.subtitleBackground.options[%d]" % index
		if not swatch_options[index] is Dictionary:
			_fail("%s: expected object" % context)
			continue
		var swatch: Dictionary = swatch_options[index]
		_string(swatch, "id", context)
		_string(swatch, "label", context)
		if _color_hex(swatch, "value", context):
			pass
		swatch_ids[str(swatch.get("id", ""))] = true
	if not swatch_ids.has(str(background.get("value", ""))):
		_fail("settings.audio.subtitleBackground.value: '%s' is not one of the swatch ids" % background.get("value", ""))
	_string(audio, "previewLine", "settings.audio")


func _validate_parity_layout(data: Dictionary) -> void:
	# `fixtures/parity-layout.json` is the parity-pass design authority. Shape
	# errors fail loudly like every other fixture; the app never re-types a
	# geometry, colour or type value.
	var viewport := _dictionary(data, "viewport", "parity-layout")
	_number(viewport, "width", "parity-layout.viewport")
	_number(viewport, "height", "parity-layout.viewport")
	var colors := _dictionary(data, "colors", "parity-layout")
	for key in ["signal", "signalDeep", "signalHot", "onSignal", "ink", "charcoal", "graphite",
			"boneBright", "bone", "paper", "paperMuted", "sage", "moss", "alert", "clear",
			"rule", "ruleStrong", "muted", "textSecondary"]:
		_color_hex(colors, key, "parity-layout.colors")
	var type_map := _dictionary(data, "type", "parity-layout")
	for key in ["wordmark", "mission", "statLabel", "statValue", "statSub", "chip", "tab",
			"panelTitle", "panelMeta", "rowLabel", "rowSub", "value", "bigValue", "title",
			"body", "micro", "footer", "letterSpacingMicro", "letterSpacingTab"]:
		_number(type_map, key, "parity-layout.type")
	var style := _dictionary(data, "style", "parity-layout")
	_number(style, "panelBorder", "parity-layout.style")
	_number(style, "radius", "parity-layout.style")
	_string(style, "shadow", "parity-layout.style", true)
	var switch_map := _dictionary(data, "switch", "parity-layout")
	for key in ["width", "height", "radius", "thumb", "thumbRadius", "inset", "borderWidth", "checkedThumbOffset"]:
		_number(switch_map, key, "parity-layout.switch")
	for key in ["onTrack", "offTrack", "onThumb", "offThumb", "offBorder"]:
		_string(switch_map, key, "parity-layout.switch")
	_validate_rect(_dictionary(data, "header", "parity-layout").get("rect", {}), "parity-layout.header.rect")
	var header := _dictionary(data, "header", "parity-layout")
	var stats := _array(header, "stats", "parity-layout.header")
	if stats.size() != 3:
		_fail("parity-layout.header.stats: expected three stat columns, got %d" % stats.size())
	for index in range(stats.size()):
		var context := "parity-layout.header.stats[%d]" % index
		if not stats[index] is Dictionary:
			_fail("%s: expected object" % context)
			continue
		_number(stats[index], "x", context)
		for key in ["label", "value", "sub"]:
			_string(stats[index], key, context)
	_validate_rect(header.get("pausedChip", {}), "parity-layout.header.pausedChip")
	var tab_bar := _dictionary(data, "tabBar", "parity-layout")
	_validate_rect(tab_bar.get("rect", {}), "parity-layout.tabBar.rect")
	_string(tab_bar, "labelAlign", "parity-layout.tabBar")
	_number(tab_bar, "labelInset", "parity-layout.tabBar")
	var tabs := _array(tab_bar, "tabs", "parity-layout.tabBar")
	if tabs.size() != 4:
		_fail("parity-layout.tabBar.tabs: expected four tabs, got %d" % tabs.size())
	for index in range(tabs.size()):
		var context := "parity-layout.tabBar.tabs[%d]" % index
		if not tabs[index] is Dictionary:
			_fail("%s: expected object" % context)
			continue
		_string(tabs[index], "id", context)
		_string(tabs[index], "label", context)
		_number(tabs[index], "x", context)
		_number(tabs[index], "w", context)
	var footer := _dictionary(data, "footer", "parity-layout")
	_validate_rect(footer.get("rect", {}), "parity-layout.footer.rect")
	var footer_hints := _dictionary(footer, "hints", "parity-layout.footer")
	_string(footer_hints, "text", "parity-layout.footer.hints")
	_number(footer_hints, "x", "parity-layout.footer.hints")
	_number(footer_hints, "y", "parity-layout.footer.hints")
	var nav_target := _dictionary(footer, "navTarget", "parity-layout.footer")
	for key in ["label", "empty"]:
		_string(nav_target, key, "parity-layout.footer.navTarget")
	for key in ["labelX", "labelY", "valueRight", "valueY"]:
		_number(nav_target, key, "parity-layout.footer.navTarget")
	_string(nav_target, "align", "parity-layout.footer.navTarget")
	var panels := _dictionary(data, "panels", "parity-layout")
	_validate_rect(panels.get("content", {}), "parity-layout.panels.content")
	_number(panels, "headerHeight", "parity-layout.panels")
	var map := _dictionary(data, "map", "parity-layout")
	for key in ["mapPanel", "field"]:
		_validate_rect(map.get(key, {}), "parity-layout.map." + key)
	_validate_rect(map.get("iconPanel", {}), "parity-layout.map.iconPanel")
	_validate_rect(map.get("popover", {}), "parity-layout.map.popover")
	var popover := _dictionary(map, "popover", "parity-layout.map")
	var popover_content := _dictionary(popover, "content", "parity-layout.map.popover")
	for part_key in ["title", "status", "meta", "body", "reward", "action", "cancel"]:
		var context: String = "parity-layout.map.popover.content." + str(part_key)
		var part := _dictionary(popover_content, part_key, "parity-layout.map.popover.content")
		var rect := _dictionary(part, "rect", context)
		_validate_rect(rect, context + ".rect")
		if float(rect.get("x", 0)) < 0 or float(rect.get("y", 0)) < 0 or float(rect.get("w", 0)) <= 0 or float(rect.get("h", 0)) <= 0 or float(rect.get("x", 0)) + float(rect.get("w", 0)) > float(popover.get("w", 0)) or float(rect.get("y", 0)) + float(rect.get("h", 0)) > float(popover.get("h", 0)):
			_fail(context + ".rect: must fit inside the popover")
		_string(part, "type", context)
		_string(part, "color", context)
		_number(part, "weight", context)
		var type_key := str(part.get("type", ""))
		var color_key := str(part.get("color", ""))
		var weight: Variant = part.get("weight", 0)
		if float(data.get("type", {}).get(type_key, 0)) <= 0 or not data.get("colors", {}).has(color_key) or not (float(weight) == 400.0 or float(weight) == 700.0):
			_fail(context + ": invalid typography or colour reference (%s, %s, %s)" % [type_key, color_key, weight])
	for key in ["background", "border", "accent"]:
		_string(popover_content, key, "parity-layout.map.popover.content")
		var color_key := str(popover_content.get(key, ""))
		if not data.get("colors", {}).has(color_key):
			_fail("parity-layout.map.popover.content." + key + ": unknown colour")
	for key in ["borderWidth", "accentWidth"]:
		_number(popover_content, key, "parity-layout.map.popover.content")
		if float(popover_content.get(key, 0)) < 0:
			_fail("parity-layout.map.popover.content." + key + ": must be non-negative")
	var status := _dictionary(popover_content, "status", "parity-layout.map.popover.content")
	for key in ["background", "border"]:
		_string(status, key, "parity-layout.map.popover.content.status")
		var color_key := str(status.get(key, ""))
		if not data.get("colors", {}).has(color_key):
			_fail("parity-layout.map.popover.content.status." + key + ": unknown colour")
	var meta := _dictionary(popover_content, "meta", "parity-layout.map.popover.content")
	_string(meta, "template", "parity-layout.map.popover.content.meta")
	var meta_template := str(meta.get("template", ""))
	var unbound := meta_template.replace("{sector}", "").replace("{distanceKm}", "")
	if not meta_template.contains("{sector}") or not meta_template.contains("{distanceKm}") or unbound.contains("{") or unbound.contains("}"):
		_fail("parity-layout.map.popover.content.meta.template: must bind sector and distanceKm only")
	_number(map, "fieldCornerTicks", "parity-layout.map")
	_string(map, "iconPanelTitle", "parity-layout.map")
	_string(map, "iconPanelMeta", "parity-layout.map")
	var rows := _dictionary(map, "iconRows", "parity-layout.map")
	for key in ["x", "firstY", "rowH", "width", "iconSize", "nameX", "nameY", "subY", "switchX", "switchY"]:
		_number(rows, key, "parity-layout.map.iconRows")
	var progress := _dictionary(data, "progress", "parity-layout")
	_validate_rect(progress.get("listPanel", {}), "parity-layout.progress.listPanel")
	var progress_rows := _dictionary(progress, "rows", "parity-layout.progress")
	for key in ["x", "firstY", "rowH", "width", "accentW", "nameX", "nameY", "taglineY",
			"repBarX", "repBarY", "repBarW", "repBarH", "statusX", "statusY", "statusW",
			"statusH", "dossierX", "dossierY"]:
		_number(progress_rows, key, "parity-layout.progress.rows")
	_string(progress_rows, "dossierText", "parity-layout.progress.rows")
	var drawer := _dictionary(progress, "drawer", "parity-layout")
	_validate_rect(drawer.get("rect", {}), "parity-layout.progress.drawer.rect")
	for key in ["padding", "headerY", "titleY", "taglineY", "ruleY", "briefLabelY", "briefBodyY",
			"historyLabelY", "historyBodyY", "perksLabelY", "perksY", "partsLabelY",
			"partsHeaderY", "partRowY", "partRowH", "shopCaptionY"]:
		_number(drawer, key, "parity-layout.progress.drawer")
	_validate_rect(drawer.get("close", {}), "parity-layout.progress.drawer.close")
	_validate_rect(drawer.get("shopButton", {}), "parity-layout.progress.drawer.shopButton")
	var abilities := _dictionary(data, "abilities", "parity-layout")
	for key in ["gridPanel", "detailPanel"]:
		_validate_rect(abilities.get(key, {}), "parity-layout.abilities." + key)
	_validate_rect(abilities.get("hoverPopover", {}), "parity-layout.abilities.hoverPopover")
	var cards := _dictionary(abilities, "cards", "parity-layout.abilities")
	for key in ["x", "firstY", "w", "h", "colGap", "rowGap", "cols", "iconY", "nameY", "sizeY", "installedY"]:
		_number(cards, key, "parity-layout.abilities.cards")
	_validate_rect(cards.get("rarityChip", {}), "parity-layout.abilities.cards.rarityChip")
	var slots := _dictionary(abilities, "slots", "parity-layout.abilities")
	for key in ["x", "firstY", "w", "h", "colGap", "rowGap", "cols"]:
		_number(slots, key, "parity-layout.abilities.slots")
	for key in ["abilityTitleY", "abilityChipsY", "abilityBodyY", "statRowY", "loadoutTitleY",
			"vehicleNameY", "pendingNoteY"]:
		_number(abilities, key, "parity-layout.abilities")
	var settings := _dictionary(data, "settings", "parity-layout")
	var settings_panels := _array(settings, "panels", "parity-layout.settings")
	if settings_panels.size() != 4:
		_fail("parity-layout.settings.panels: expected four panels, got %d" % settings_panels.size())
	for index in range(settings_panels.size()):
		var context := "parity-layout.settings.panels[%d]" % index
		if not settings_panels[index] is Dictionary:
			_fail("%s: expected object" % context)
			continue
		_string(settings_panels[index], "id", context)
		_string(settings_panels[index], "title", context)
		_validate_rect(settings_panels[index].get("rect", {}), context + ".rect")
	for key in ["rowH", "firstRowY", "remapRowH", "remapFirstRowY", "audioRowH", "audioFirstRowY",
			"languageLabelY", "dropdownY", "dropdownH", "swatchLabelY", "swatchY", "swatchH"]:
		_number(settings, key, "parity-layout.settings")
	for group in ["slider", "bindingButton", "dropdown", "swatch"]:
		var block := _dictionary(settings, group, "parity-layout.settings")
		for key in ["w", "h"]:
			_number(block, key, "parity-layout.settings." + group)
	_validate_rect(_dictionary(settings, "preview", "parity-layout.settings"), "parity-layout.settings.preview")
	var preview := _dictionary(settings, "preview", "parity-layout.settings")
	var preview_content := _dictionary(preview, "content", "parity-layout.settings.preview")
	for part_key in ["line", "meta"]:
		var context: String = "parity-layout.settings.preview.content." + str(part_key)
		var part := _dictionary(preview_content, part_key, "parity-layout.settings.preview.content")
		var rect := _dictionary(part, "rect", context)
		_validate_rect(rect, context + ".rect")
		if float(rect.get("x", 0)) < 0 or float(rect.get("y", 0)) < 0 or float(rect.get("w", 0)) <= 0 or float(rect.get("h", 0)) <= 0 or float(rect.get("x", 0)) + float(rect.get("w", 0)) > float(preview.get("w", 0)) or float(rect.get("y", 0)) + float(rect.get("h", 0)) > float(preview.get("h", 0)):
			_fail(context + ".rect: must fit inside the preview")
		_string(part, "type", context)
		_number(part, "weight", context)
		var weight := float(part.get("weight", 0))
		if float(data.get("type", {}).get(str(part.get("type", "")), 0)) <= 0 or not (weight == 400.0 or weight == 700.0):
			_fail(context + ": invalid typography")
	var preview_meta := _dictionary(preview_content, "meta", "parity-layout.settings.preview.content")
	for key in ["template", "case", "align"]:
		_string(preview_meta, key, "parity-layout.settings.preview.content.meta")
	var preview_template := str(preview_meta.get("template", ""))
	var preview_unbound := preview_template.replace("{language}", "").replace("{background}", "")
	if not preview_template.contains("{language}") or not preview_template.contains("{background}") or preview_unbound.contains("{") or preview_unbound.contains("}") or str(preview_meta.get("case", "")) != "upper" or str(preview_meta.get("align", "")) != "right":
		_fail("parity-layout.settings.preview.content.meta: must bind language and background with upper case and right alignment")
	_validate_rect(_dictionary(settings, "remapModal", "parity-layout.settings"), "parity-layout.settings.remapModal")
	var captures := _dictionary(data, "captures", "parity-layout")
	for key in ["map", "map-popover", "progress", "abilities", "abilities-hover", "settings",
			"settings-remap-modal", "settings-subtitle"]:
		if not captures.has(key):
			_fail("parity-layout.captures: missing state '%s'" % key)
			continue
		if not captures[key] is Dictionary:
			_fail("parity-layout.captures.%s: expected object" % key)
			continue
		_string(captures[key], "navTarget", "parity-layout.captures." + key)
		_array(captures[key], "hiddenIcons", "parity-layout.captures." + key)
	for key in ["markerMonograms", "markerColors", "rarityColors", "rarityTextColors"]:
		var group := _dictionary(data, key, "parity-layout")
		if group.is_empty():
			_fail("parity-layout.%s: expected entries" % key)
	var icon_art := _dictionary(data, "iconArt", "parity-layout")
	for key in ["rowTile", "cardTile"]:
		var tile := _dictionary(icon_art, key, "parity-layout.iconArt")
		for field in ["size", "borderWidth", "radius", "fontSize", "weight"]:
			_number(tile, field, "parity-layout.iconArt." + key)
		for field in ["background", "border", "text", "source"]:
			_string(tile, field, "parity-layout.iconArt." + key)
	var codes := _dictionary(icon_art.get("rowTile", {}), "codes", "parity-layout.iconArt.rowTile")
	for catalog_name in codes.keys():
		_string(codes, catalog_name, "parity-layout.iconArt.rowTile.codes")


func _validate_rect(rect_dict: Dictionary, context: String) -> void:
	if rect_dict.is_empty():
		_fail("%s: expected {x,y,w,h}" % context)
		return
	for key in ["x", "y", "w", "h"]:
		_number(rect_dict, key, context)


func _passive_validate(fixture_name: String, data: Dictionary) -> void:
	if data.is_empty():
		_fail("%s: fixture payload is empty" % fixture_name)


func _unique_id(seen: Dictionary, id: String, context: String) -> void:
	if id.is_empty():
		return
	if seen.has(id):
		_fail("%s.id: duplicate id '%s'" % [context, id])
	seen[id] = true
