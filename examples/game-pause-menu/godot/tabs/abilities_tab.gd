extends Control
class_name AbilitiesTab

## Parity ABILITIES tab: 808x552 catalog panel with 5x2 152x240 cards and the
## 408x552 detail panel (ability detail + 2x3 loadout slot grid).
##
## Generated components: Card (card surface + part hosts), Icon (40px ability
## glyph), Badge (rarity/installed/size chips), Popover (app-level hover).
## Grid layout, clicks and slots are lane-local native fallbacks.

var app: PauseMenuApp
var cards: Dictionary = {}
var card_art: Dictionary = {}
var slot_buttons: Dictionary = {}
var install_labels: Dictionary = {}
var slot_size_labels: Dictionary = {}
var reject_labels: Dictionary = {}
var size_labels: Dictionary = {}
var installed_chips: Dictionary = {}
var meta_label: Label
var ability_title: Label
var ability_body: Label
var ability_chips: HBoxContainer
var stat_values: Dictionary = {}
var vehicle_label: Label
var pending_note: Label
var _origin: Vector2
var _grid_panel: Control
var _detail_panel: Control
var _chip_icon_slot := {}


func _ready() -> void:
	custom_minimum_size = Vector2(float(app.parity.panels["content"]["w"]) + float(app.parity.panels["content"]["x"]) * 2.0, float(app.parity.panels["content"]["h"]))
	_origin = Vector2(0.0, float(app.parity.panels["content"]["y"]))
	_build_grid()
	_build_detail()
	apply_state(app.pending_ability)


func _local(json_rect: Dictionary) -> Rect2:
	return UI.local(json_rect, _origin)


# --- catalog grid ------------------------------------------------------------

func _build_grid() -> void:
	var rect := _local(app.parity.abilities["gridPanel"])
	_grid_panel = Control.new()
	_grid_panel.name = "GridPanel"
	UI.place_rect(_grid_panel, rect)
	add_child(_grid_panel)
	var frame := UI.frame("charcoal", "rule")
	frame.position = Vector2.ZERO
	frame.size = rect.size
	frame.custom_minimum_size = rect.size
	_grid_panel.add_child(frame)
	UI.panel_header(
		_grid_panel,
		rect.size.x,
		str(app.parity.abilities["gridTitle"]),
		str(app.parity.abilities["gridMeta"])
	)

	var cards_data: Dictionary = app.parity.abilities["cards"]
	var panel_origin := _origin + rect.position
	var grid_x := float(cards_data["x"]) - panel_origin.x
	var grid_y := float(cards_data["firstY"]) - panel_origin.y
	var card_w := float(cards_data["w"])
	var card_h := float(cards_data["h"])
	var col_gap := float(cards_data["colGap"])
	var row_gap := float(cards_data["rowGap"])
	var cols := int(cards_data["cols"])
	var index := 0
	for ability in app.fixtures.abilities.get("abilities", []):
		var column := index % cols
		var row := index / cols
		var x := grid_x + column * (card_w + col_gap)
		var y := grid_y + row * (card_h + row_gap)
		_add_ability_card(ability, x, y, card_w, card_h, cards_data)
		index += 1


func _add_ability_card(ability: Dictionary, x: float, y: float, card_w: float, card_h: float, cards_data: Dictionary) -> void:
	var ability_id := str(ability.get("id", ""))
	# NOT FSDS: Card has no selected/activation channel; the lane wraps it in a
	# native hit target that owns the parity surface + selected outline.
	var hit := Button.new()
	hit.name = "AbilityCard_" + ability_id
	hit.focus_mode = Control.FOCUS_ALL
	UI.place(hit, x, y, card_w, card_h)
	hit.add_theme_stylebox_override("normal", app.orion.flat(app.orion.color("charcoal"), app.orion.color("rule"), 1, 0.0))
	hit.add_theme_stylebox_override("hover", app.orion.flat(app.orion.color("charcoal"), app.orion.color("muted"), 1, 0.0))
	hit.add_theme_stylebox_override("pressed", app.orion.flat(app.orion.color("charcoal"), app.orion.color("signal"), 2, 0.0))
	hit.add_theme_stylebox_override("focus", StyleBoxEmpty.new())
	hit.pressed.connect(app.select_ability.bind(ability_id))
	hit.mouse_entered.connect(app.hover_ability.bind(ability_id, true))
	hit.mouse_exited.connect(app.hover_ability.bind(ability_id, false))
	_grid_panel.add_child(hit)
	cards[ability_id] = hit

	var card = DSFactory.card()
	card.name = "Card_" + ability_id
	card.token_overrides = {
		"card.design.root.background.fill": "transparent",
		"card.design.root.border.color": "transparent",
		"card.design.root.spacing.padding": "0",
		"card.design.root.spacing.gap": "0",
	}
	UI.place(card, 0, 0, card_w, card_h)
	hit.add_child(card)

	var header_part: Control = card.get_part("header")
	if header_part != null:
		header_part.custom_minimum_size = Vector2(0, float(cards_data["nameY"]))
		var icon_area := Control.new()
		icon_area.custom_minimum_size = Vector2(0, float(cards_data["nameY"]))
		header_part.add_child(icon_area)
		# Parity icon art: 40x40 code tile from the ability name (app-authority pin).
		var card_art_data: Dictionary = app.parity.raw["iconArt"]["cardTile"]
		var art_size := float(card_art_data["size"])
		var art_tile := UI.code_tile(
			app.parity.ability_code(str(ability.get("name", ""))),
			art_size,
			float(card_art_data["fontSize"]),
			str(card_art_data["background"]),
			str(card_art_data["border"])
		)
		var icon_x := (card_w - art_size) / 2.0
		UI.place(art_tile, icon_x, float(cards_data["iconY"]), art_size, art_size)
		icon_area.add_child(art_tile)
		card_art[ability_id] = art_tile

	var content_part: Control = card.get_part("content")
	if content_part != null:
		content_part.custom_minimum_size = Vector2(0, float(cards_data["installedY"]) - float(cards_data["nameY"]))
		var content_area := Control.new()
		content_area.custom_minimum_size = Vector2(0, float(cards_data["installedY"]) - float(cards_data["nameY"]))
		content_part.add_child(content_area)
		var name_label := UI.label(str(ability.get("name", "")), app.parity.type_size("rowLabel"), 700, "boneBright", 0.0)
		name_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		UI.place(name_label, 8, 0, card_w - 16, 16)
		content_area.add_child(name_label)
		var size_row := UI.hbox(4)
		UI.place(size_row, 8, float(cards_data["sizeY"]) - float(cards_data["nameY"]), card_w - 16, 14)
		content_area.add_child(size_row)
		var size_text := UI.sub("SIZE %d" % int(ability.get("size", 0)), "muted")
		size_row.add_child(size_text)
		size_row.add_child(UI.pips(int(ability.get("size", 0)), 2, "signal"))
		size_labels[ability_id] = size_text

	var footer_part: Control = card.get_part("footer")
	if footer_part != null:
		footer_part.custom_minimum_size = Vector2(0, card_h - float(cards_data["installedY"]))
		var footer_area := Control.new()
		footer_area.custom_minimum_size = Vector2(0, card_h - float(cards_data["installedY"]))
		footer_part.add_child(footer_area)
		var installed = DSFactory.chip(
			"INSTALLED",
			app.orion.color("clear"),
			app.orion.color("ink"),
			app.orion.color("clear"),
			88,
			18,
			9
		)
		UI.place(installed, 8, 0, 88, 18)
		installed.visible = false
		footer_area.add_child(installed)
		DSFactory.prepare_chip(installed)
		installed_chips[ability_id] = installed

	var chip_rect: Dictionary = cards_data["rarityChip"]
	var rarity = DSFactory.rarity_chip(str(ability.get("rarity", "")), float(chip_rect["w"]), float(chip_rect["h"]))
	UI.place(rarity, float(chip_rect["x"]), float(chip_rect["y"]), float(chip_rect["w"]), float(chip_rect["h"]))
	hit.add_child(rarity)
	DSFactory.prepare_chip(rarity)

	UI.ignore_mouse(card)
	apply_card_state(ability_id, app.pending_ability)


func apply_card_state(ability_id: String, pending_ability: String) -> void:
	var hit: Button = cards.get(ability_id)
	if hit == null:
		return
	var selected := ability_id == pending_ability
	var installed_slot := app.installed_slot(ability_id)
	var border_width := 2 if selected else 1
	var border_color := app.orion.color("signal") if selected else app.orion.color("rule")
	hit.add_theme_stylebox_override("normal", app.orion.flat(app.orion.color("charcoal"), border_color, border_width, 0.0))
	hit.add_theme_stylebox_override("hover", app.orion.flat(app.orion.color("charcoal"), app.orion.color("signal") if selected else app.orion.color("muted"), border_width, 0.0))
	hit.add_theme_stylebox_override("pressed", app.orion.flat(app.orion.color("charcoal"), app.orion.color("signal"), 2, 0.0))
	if installed_chips.has(ability_id):
		installed_chips[ability_id].visible = not installed_slot.is_empty()
	if size_labels.has(ability_id):
		size_labels[ability_id].text = "SIZE %d" % int(app.fixtures.ability_by_id(ability_id).get("size", 0))


# --- detail panel ------------------------------------------------------------

func _build_detail() -> void:
	var rect := _local(app.parity.abilities["detailPanel"])
	_detail_panel = Control.new()
	_detail_panel.name = "DetailPanel"
	UI.place_rect(_detail_panel, rect)
	add_child(_detail_panel)
	var frame := UI.frame("charcoal", "rule")
	frame.position = Vector2.ZERO
	frame.size = rect.size
	frame.custom_minimum_size = rect.size
	_detail_panel.add_child(frame)
	meta_label = UI.panel_header(
		_detail_panel,
		rect.size.x,
		str(app.parity.abilities["detailTitle"]),
		"SELECT A MODULE"
	)

	var padding := 16.0
	var content_width := rect.size.x - padding * 2.0
	var data: Dictionary = app.parity.abilities
	ability_title = UI.title("", app.parity.type_size("title"), "boneBright")
	UI.place(ability_title, padding, float(data["abilityTitleY"]) - 180.0, content_width, 34)
	_detail_panel.add_child(ability_title)

	ability_chips = UI.hbox(8)
	UI.place(ability_chips, padding, float(data["abilityChipsY"]) - 176.0, content_width, 20)
	_detail_panel.add_child(ability_chips)

	ability_body = UI.label("", app.parity.type_size("body"), 400, "bone", 0.0)
	ability_body.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	UI.place(ability_body, padding, float(data["abilityBodyY"]) - 176.0, content_width, 60)
	_detail_panel.add_child(ability_body)

	var stat_row := UI.hbox(24)
	UI.place(stat_row, padding, float(data["statRowY"]) - 176.0, content_width, 50)
	_detail_panel.add_child(stat_row)
	for key in ["heat", "cooldown", "draw"]:
		var cell := UI.vbox(1)
		cell.custom_minimum_size = Vector2(110, 0)
		cell.add_child(UI.micro(key, "muted"))
		var value_label := UI.label("—", app.parity.type_size("bigValue"), 800, "boneBright", 0.0)
		cell.add_child(value_label)
		stat_row.add_child(cell)
		stat_values[key] = value_label

	var loadout_title := UI.micro("VEHICLE LOADOUT", "muted")
	UI.place(loadout_title, padding, float(data["loadoutTitleY"]) - 176.0, content_width, 14)
	_detail_panel.add_child(loadout_title)
	var vehicle_row := UI.hbox(10)
	UI.place(vehicle_row, padding, float(data["vehicleNameY"]) - 176.0, content_width, 20)
	_detail_panel.add_child(vehicle_row)
	vehicle_label = UI.label(str(app.fixtures.vehicle.get("name", "")), app.parity.type_size("value"), 800, "boneBright", 0.0)
	vehicle_row.add_child(vehicle_label)
	vehicle_row.add_child(UI.sub(str(app.fixtures.vehicle.get("chassis", "")), "muted"))

	var slots_data: Dictionary = data["slots"]
	var detail_origin := _origin + rect.position
	var slot_x := float(slots_data["x"]) - detail_origin.x
	var slot_y := float(slots_data["firstY"]) - detail_origin.y
	var slot_w := float(slots_data["w"])
	var slot_h := float(slots_data["h"])
	var slot_index := 0
	for slot in app.fixtures.vehicle.get("slots", []):
		var column := slot_index % int(slots_data["cols"])
		var row := slot_index / int(slots_data["cols"])
		_add_slot(
			slot,
			slot_x + column * (slot_w + float(slots_data["colGap"])),
			slot_y + row * (slot_h + float(slots_data["rowGap"])),
			slot_w,
			slot_h
		)
		slot_index += 1

	pending_note = UI.micro("SELECT A MODULE TO PREVIEW ITS LOADOUT", "muted")
	pending_note.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	UI.place(pending_note, padding, float(data["pendingNoteY"]) - 176.0, content_width, 30)
	_detail_panel.add_child(pending_note)


func _add_slot(slot: Dictionary, x: float, y: float, width: float, height: float) -> void:
	var slot_id := str(slot.get("id", ""))
	# NOT FSDS: no slot/stat component is admitted; engine-native slot button.
	var button := Button.new()
	button.name = "Slot_" + slot_id
	button.focus_mode = Control.FOCUS_ALL
	UI.place(button, x, y, width, height)
	button.pressed.connect(app.activate_slot.bind(slot_id))
	_detail_panel.add_child(button)
	slot_buttons[slot_id] = button

	var label := UI.micro(str(slot.get("label", "")), "muted")
	UI.place(label, 8, 5, 100, 14)
	button.add_child(label)
	var size_label := UI.micro("SIZE %d" % int(slot.get("size", 0)), "muted")
	size_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	UI.place(size_label, width - 68, 5, 60, 14)
	button.add_child(size_label)
	slot_size_labels[slot_id] = size_label
	var ability_label := UI.label("EMPTY", app.parity.type_size("rowLabel"), 700, "muted", 0.0)
	UI.place(ability_label, 8, 24, width - 16, 18)
	button.add_child(ability_label)
	install_labels[slot_id] = ability_label
	var reject := UI.sub("", "alert")
	UI.place(reject, 8, 42, width - 16, 14)
	button.add_child(reject)
	reject_labels[slot_id] = reject
	UI.ignore_mouse(button)


func _slot_style(state: String) -> StyleBoxFlat:
	var orion := app.orion
	match state:
		"compatible":
			return orion.flat(orion.color("charcoal"), orion.color("clear"), 2, 0.0)
		"reject":
			return orion.flat(orion.color("charcoal"), orion.color("alert"), 2, 0.0)
		"installed":
			return orion.flat(orion.color("charcoal"), orion.color("ruleStrong"), 1, 0.0)
		_:
			return orion.flat(orion.color("charcoal"), orion.color("rule"), 1, 0.0)


func apply_slot_styles(state: String) -> void:
	for slot_id in slot_buttons:
		var button: Button = slot_buttons[slot_id]
		button.add_theme_stylebox_override("normal", _slot_style("normal"))
		button.add_theme_stylebox_override("hover", _slot_style("compatible"))
		button.add_theme_stylebox_override("pressed", _slot_style("compatible"))
		button.add_theme_stylebox_override("focus", StyleBoxEmpty.new())


func apply_state(pending_ability: String) -> void:
	if _detail_panel == null:
		return
	var ability := app.fixtures.ability_by_id(pending_ability) if not pending_ability.is_empty() else {}
	var has_ability := not ability.is_empty()
	ability_title.text = str(ability.get("name", "SELECT A MODULE"))
	ability_body.text = str(ability.get("description", "Choose a module from the catalog to inspect its loadout fit and stats."))
	var compatible: Array = app.compatible_slots(pending_ability) if has_ability else []
	for child in ability_chips.get_children():
		ability_chips.remove_child(child)
		child.queue_free()
	if has_ability:
		var rarity = DSFactory.rarity_chip(str(ability.get("rarity", "")), 64, 18)
		ability_chips.add_child(rarity)
		DSFactory.prepare_chip(rarity)
		var size_chip = DSFactory.chip(
			"SIZE %d" % int(ability.get("size", 0)),
			app.orion.color("graphite"),
			app.orion.color("boneBright"),
			app.orion.color("ruleStrong"),
			64,
			18,
			9
		)
		ability_chips.add_child(size_chip)
		DSFactory.prepare_chip(size_chip)
	var stats: Dictionary = ability.get("stats", {})
	for key in stat_values:
		stat_values[key].text = _format_stat(stats.get(key, "—"))
	meta_label.text = ("%d COMPATIBLE SLOTS" % compatible.size()) if has_ability else "SELECT A MODULE"
	pending_note.text = ("PENDING MODULE: %s" % str(ability.get("name", "")).to_upper()) if has_ability else "SELECT A MODULE TO PREVIEW ITS LOADOUT"
	for ability_id in cards:
		apply_card_state(ability_id, pending_ability)
	_refresh_slots(pending_ability, compatible)


func _refresh_slots(pending_ability: String, compatible: Array) -> void:
	for slot in app.fixtures.vehicle.get("slots", []):
		var slot_id := str(slot.get("id", ""))
		var button: Button = slot_buttons.get(slot_id)
		if button == null:
			continue
		var installed_id = slot.get("abilityId")
		var label: Label = install_labels[slot_id]
		if installed_id == null:
			label.text = "EMPTY"
			label.add_theme_color_override("font_color", app.orion.color("muted"))
		else:
			var installed := app.fixtures.ability_by_id(str(installed_id))
			label.text = str(installed.get("name", str(installed_id)))
			label.add_theme_color_override("font_color", app.orion.color("boneBright"))
		reject_labels[slot_id].text = ""
		var state := "normal"
		if not pending_ability.is_empty():
			state = "compatible" if compatible.has(slot_id) else "normal"
		elif installed_id != null:
			state = "installed"
		button.add_theme_stylebox_override("normal", _slot_style(state))
		button.add_theme_stylebox_override("hover", _slot_style("compatible"))
		button.add_theme_stylebox_override("pressed", _slot_style("compatible"))
		button.add_theme_stylebox_override("focus", StyleBoxEmpty.new())


func show_slot_reject(slot_id: String, message: String) -> void:
	var label: Label = reject_labels.get(slot_id)
	if label == null:
		return
	label.text = message
	slot_buttons[slot_id].add_theme_stylebox_override("normal", _slot_style("reject"))


func show_slot_hint(slot_id: String, message: String) -> void:
	var label: Label = reject_labels.get(slot_id)
	if label != null:
		label.text = message


func _format_stat(value) -> String:
	if typeof(value) == TYPE_FLOAT and is_equal_approx(float(value), roundf(float(value))):
		return str(int(value))
	return str(value)


func card_node(ability_id: String) -> Control:
	return cards.get(ability_id)


func slot_node(slot_id: String) -> Control:
	return slot_buttons.get(slot_id)


func slot_label(slot_id: String) -> Label:
	return install_labels.get(slot_id)
