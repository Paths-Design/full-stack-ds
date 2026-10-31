extends Control
class_name AbilitiesTab

## Abilities tab: ability card grid (generated Card + Icon + Badge), hover
## popover (generated Popover, driven by the app), and the vehicle loadout panel.
##
## Generated components used here: Card (one per ability), Icon (ability glyph),
## Badge (rarity tag + installed tag), Button (slot removal affordance via native
## slots? see ledger). The card grid layout, slot buttons and loadout chrome are
## engine-native app layers (`# NOT FSDS` at each site).

const CARD_WIDTH := 144.0
const CARD_HEIGHT := 206.0

var app: PauseMenuApp
var cards: Dictionary = {}
var slot_buttons: Dictionary = {}
var size_labels: Dictionary = {}
var install_labels: Dictionary = {}
var remove_buttons: Dictionary = {}
var pending_label: Label
var loadout_status: Label
var reject_labels: Dictionary = {}


func _ready() -> void:
	custom_minimum_size = PauseMenuApp.BODY_SIZE
	add_child(_build_ground())
	_build_grid()
	_build_loadout()


func _build_ground() -> Control:
	var ground := UI.frame("panel", "rule", false)
	UI.place(ground, 0, 0, PauseMenuApp.BODY_SIZE.x, PauseMenuApp.BODY_SIZE.y)
	return ground


func _build_grid() -> void:
	var header := UI.hbox(14)
	UI.place(header, 20, 14, 790, 20)
	add_child(header)
	header.add_child(UI.micro("ABILITY MODULES", "boneBright"))
	header.add_child(UI.micro("%d MODULES · SELECT ONE, THEN A VEHICLE SLOT" % app.fixtures.abilities.get("abilities", []).size(), "muted"))
	header.add_child(UI.spacer())
	header.add_child(UI.micro("HOVER FOR DETAIL", "muted"))

	var rule := UI.rule("rule", 1)
	UI.place(rule, 20, 42, 790, 1)
	add_child(rule)

	var index := 0
	for ability in app.fixtures.abilities.get("abilities", []):
		var column := index % 5
		var row := index / 5
		var x := 20.0 + column * (CARD_WIDTH + 12.0)
		var y := 54.0 + row * (CARD_HEIGHT + 12.0)
		_add_ability_card(ability, x, y)
		index += 1

	var pending_row := UI.hbox(10)
	UI.place(pending_row, 20, 500, 790, 24)
	add_child(pending_row)
	pending_row.add_child(UI.micro("PENDING MODULE", "muted"))
	pending_label = UI.label("NONE — SELECT A CARD", 12, 700, "signalHot")
	pending_row.add_child(pending_label)
	var hint := UI.micro("COMPATIBLE SLOTS ARE HIGHLIGHTED IN THE LOADOUT", "muted")
	pending_row.add_child(UI.spacer())
	pending_row.add_child(hint)


func _add_ability_card(ability: Dictionary, x: float, y: float) -> void:
	var ability_id := str(ability.get("id", ""))
	# NOT FSDS: Card has no activation channel (interactive only styles hover);
	# each generated Card is wrapped in a native Button hit target.
	var hit := Button.new()
	hit.name = "AbilityCard_" + ability_id
	hit.position = Vector2(x, y)
	hit.size = Vector2(CARD_WIDTH, CARD_HEIGHT)
	hit.custom_minimum_size = Vector2(CARD_WIDTH, CARD_HEIGHT)
	hit.focus_mode = Control.FOCUS_ALL
	for state in ["normal", "hover", "pressed", "focus"]:
		hit.add_theme_stylebox_override(state, StyleBoxEmpty.new())
	add_child(hit)
	cards[ability_id] = hit
	hit.pressed.connect(app.select_ability.bind(ability_id))
	hit.mouse_entered.connect(app.hover_ability.bind(ability_id, true))
	hit.mouse_exited.connect(app.hover_ability.bind(ability_id, false))

	var card = DSFactory.card()
	card.name = "Card_" + ability_id
	card.position = Vector2.ZERO
	card.size = Vector2(CARD_WIDTH, CARD_HEIGHT)
	card.custom_minimum_size = Vector2(CARD_WIDTH, CARD_HEIGHT)
	# The card surface is the native hit target (Card has no selected/activation
	# channel); the generated Card supplies the part hosts and typography.
	card.token_overrides = {
		"card.design.root.background.fill": "transparent",
		"card.design.root.border.color": "transparent",
		"card.design.root.spacing.padding": "10",
		"card.design.root.spacing.gap": "6",
	}
	hit.add_child(card)

	var header_part: Control = card.get_part("header")
	if header_part != null:
		header_part.custom_minimum_size = Vector2(0, 40)
		var top := UI.hbox(6)
		top.add_child(DSFactory.icon(
			PauseFixtures.glyph_name_for(str(ability.get("icon", ""))),
			"lg",
			app.orion.kind_color(str(ability.get("rarity", "")))
		))
		top.add_child(UI.spacer())
		top.add_child(DSFactory.rarity_badge(str(ability.get("rarity", ""))))
		header_part.add_child(top)

	var content_part: Control = card.get_part("content")
	if content_part != null:
		content_part.custom_minimum_size = Vector2(0, 82)
		content_part.add_child(UI.label(str(ability.get("name", "")), 12, 800, "boneBright"))
		var stat_row := UI.hbox(6)
		stat_row.add_child(UI.micro("SIZE", "muted"))
		stat_row.add_child(UI.pips(int(ability.get("size", 0)), 2, "signal"))
		content_part.add_child(stat_row)

	var footer_part: Control = card.get_part("footer")
	if footer_part != null:
		footer_part.custom_minimum_size = Vector2(0, 26)
		var status_row := UI.hbox(6)
		var size_holder := Control.new()
		size_holder.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		var size_text := UI.micro("FREE", "muted")
		size_holder.add_child(size_text)
		status_row.add_child(size_holder)
		var installed_badge = DSFactory.badge("INSTALLED", app.orion.palette["clear"], app.orion.palette["ink"], app.orion.palette["clear"])
		installed_badge.visible = false
		status_row.add_child(installed_badge)
		footer_part.add_child(status_row)
		size_labels[ability_id] = size_text
		install_labels[ability_id] = installed_badge

	UI.ignore_mouse(card)
	apply_card_state(ability_id, app.pending_ability)


func _card_surface_style(selected: bool, installed: bool, rejected := false) -> StyleBoxFlat:
	var orion := app.orion
	if rejected:
		return orion.flat(orion.surface["raised"], orion.palette["alert"], 2, 0.0)
	if selected:
		return orion.flat(orion.surface["raised"], orion.palette["signal"], 2, 0.0)
	if installed:
		return orion.flat(orion.surface["raised"], orion.palette["clear"], 1, 0.0)
	return orion.flat(orion.surface["raised"], orion.surface["rule"], 1, 0.0)


func apply_card_state(ability_id: String, pending_ability: String) -> void:
	var hit: Button = cards.get(ability_id)
	if hit == null:
		return
	var selected := ability_id == pending_ability
	var installed_slot_id := app.installed_slot(ability_id)
	hit.add_theme_stylebox_override("normal", _card_surface_style(selected, not installed_slot_id.is_empty()))
	hit.add_theme_stylebox_override("hover", _card_surface_style(selected, not installed_slot_id.is_empty()))
	hit.add_theme_stylebox_override("pressed", _card_surface_style(selected, not installed_slot_id.is_empty()))
	if install_labels.has(ability_id):
		install_labels[ability_id].visible = not installed_slot_id.is_empty()
	if size_labels.has(ability_id):
		size_labels[ability_id].text = ("SLOT " + installed_slot_id) if not installed_slot_id.is_empty() else ("SIZE %d" % int(app.fixtures.ability_by_id(ability_id).get("size", 0)))


func _build_loadout() -> void:
	var frame := UI.frame("raised", "rule", true)
	UI.place(frame, 828, 16, 404, 540)
	add_child(frame)

	var header := UI.vbox(2)
	UI.place(header, 18, 14, 368, 64)
	frame.add_child(header)
	header.add_child(UI.micro("VEHICLE LOADOUT", "boneBright"))
	header.add_child(UI.title(str(app.fixtures.vehicle.get("name", "")), 19, "boneBright"))
	header.add_child(UI.micro(str(app.fixtures.vehicle.get("chassis", "")), "muted"))

	var rule := UI.rule("rule", 1)
	UI.place(rule, 18, 84, 368, 1)
	frame.add_child(rule)

	var slots: Array = app.fixtures.vehicle.get("slots", [])
	for index in range(slots.size()):
		var column := index % 2
		var row := index / 2
		_add_slot_button(frame, slots[index], 18.0 + column * 190.0, 98.0 + row * 116.0)

	loadout_status = UI.micro("", "muted")
	UI.place(loadout_status, 18, 452, 368, 16)
	frame.add_child(loadout_status)
	var hint := UI.micro("CLICK AN EMPTY OR COMPATIBLE SLOT TO INSTALL · × REMOVES", "muted")
	UI.place(hint, 18, 470, 368, 30)
	hint.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	frame.add_child(hint)


func _add_slot_button(frame: Control, slot: Dictionary, x: float, y: float) -> void:
	var slot_id := str(slot.get("id", ""))
	# NOT FSDS: no slot/stat component is admitted on the Godot target; the
	# loadout slot is an engine-native Button with lane-local chrome.
	var button := Button.new()
	button.name = "Slot_" + slot_id
	button.position = Vector2(x, y)
	button.size = Vector2(178, 104)
	button.custom_minimum_size = Vector2(178, 104)
	button.focus_mode = Control.FOCUS_ALL
	add_slot_styles(button, "normal")
	button.pressed.connect(app.activate_slot.bind(slot_id))
	frame.add_child(button)
	slot_buttons[slot_id] = button

	var inner := UI.vbox(2)
	inner.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	inner.offset_left = 12
	inner.offset_right = -12
	inner.offset_top = 8
	inner.offset_bottom = -8
	button.add_child(inner)
	var top := UI.hbox(4)
	top.add_child(UI.micro(str(slot.get("label", "")), "muted"))
	top.add_child(UI.spacer())
	top.add_child(UI.micro("SIZE %d" % int(slot.get("size", 0)), "muted"))
	inner.add_child(top)
	var ability_label := UI.label("EMPTY", 13, 700, "muted")
	inner.add_child(ability_label)
	var reject := UI.micro("", "alert")
	inner.add_child(reject)
	reject_labels[slot_id] = reject
	install_labels["slot:" + slot_id] = ability_label

	var remove := Button.new()
	remove.name = "Remove_" + slot_id
	remove.text = "×"
	remove.position = Vector2(x + 148, y + 6)
	remove.size = Vector2(24, 24)
	remove.add_theme_stylebox_override("normal", StyleBoxEmpty.new())
	remove.add_theme_stylebox_override("hover", app.orion.flat(app.orion.color("rule"), app.orion.color("alert"), 1, 0.0))
	remove.add_theme_stylebox_override("pressed", StyleBoxEmpty.new())
	remove.add_theme_color_override("font_color", app.orion.color("alert"))
	remove.add_theme_color_override("font_hover_color", app.orion.color("alert"))
	remove.pressed.connect(app.remove_slot_ability.bind(slot_id))
	frame.add_child(remove)
	remove_buttons[slot_id] = remove
	UI.ignore_mouse(inner)


func add_slot_styles(button: Button, state: String) -> void:
	# NOT FSDS: lane-local slot chrome (compatible / selected / reject states).
	var orion := app.orion
	var border := orion.color("rule")
	var bg := orion.color("panel")
	var width := 1
	match state:
		"compatible":
			border = orion.palette["clear"]
			bg = orion.surface["raised"]
			width = 2
		"incompatible":
			border = orion.surface["rule"]
			bg = orion.surface["panel"]
		"reject":
			border = orion.palette["alert"]
			bg = orion.surface["raised"]
			width = 2
		"installed":
			border = orion.surface["ruleStrong"]
			bg = orion.surface["raised"]
	button.add_theme_stylebox_override("normal", orion.flat(bg, border, width, 0.0))
	button.add_theme_stylebox_override("hover", orion.flat(orion.color("raised"), orion.palette["signal"] if state != "reject" else orion.palette["alert"], 2, 0.0))
	button.add_theme_stylebox_override("pressed", orion.flat(orion.color("raised"), orion.palette["signal"], 2, 0.0))
	button.add_theme_stylebox_override("focus", StyleBoxEmpty.new())


func apply_state(pending_ability: String) -> void:
	if pending_label != null:
		if pending_ability.is_empty():
			pending_label.text = "NONE — SELECT A CARD"
		else:
			var ability = app.fixtures.ability_by_id(pending_ability)
			pending_label.text = "%s · %s · SIZE %d" % [str(ability.get("name", "")), str(ability.get("rarity", "")).to_upper(), int(ability.get("size", 0))]
	_refresh_cards(pending_ability)
	_refresh_slots(pending_ability)


func _refresh_cards(pending_ability: String) -> void:
	for ability_id in cards:
		apply_card_state(ability_id, pending_ability)


func _refresh_slots(pending_ability: String) -> void:
	var ability = app.fixtures.ability_by_id(pending_ability)
	var compatible: Array = app.compatible_slots(pending_ability) if not pending_ability.is_empty() else []
	for slot in app.fixtures.vehicle.get("slots", []):
		var slot_id := str(slot.get("id", ""))
		var button: Button = slot_buttons.get(slot_id)
		if button == null:
			continue
		var installed_id = slot.get("abilityId")
		var label: Label = install_labels["slot:" + slot_id]
		if installed_id == null:
			label.text = "EMPTY"
			label.add_theme_color_override("font_color", app.orion.color("muted"))
		else:
			var installed = app.fixtures.ability_by_id(str(installed_id))
			label.text = str(installed.get("name", str(installed_id)))
			label.add_theme_color_override("font_color", app.orion.color("boneBright"))
		remove_buttons[slot_id].visible = installed_id != null
		reject_labels[slot_id].text = ""
		if not pending_ability.is_empty():
			button.disabled = false
			if compatible.has(slot_id):
				add_slot_styles(button, "compatible")
			else:
				add_slot_styles(button, "incompatible")
		elif installed_id != null:
			add_slot_styles(button, "installed")
		else:
			add_slot_styles(button, "normal")
	if loadout_status != null:
		if pending_ability.is_empty():
			loadout_status.text = ""
		else:
			loadout_status.text = "%d COMPATIBLE SLOTS FOR %s (SIZE %d)" % [compatible.size(), str(ability.get("name", "")), int(ability.get("size", 0))]


func show_slot_reject(slot_id: String, message: String) -> void:
	var label: Label = reject_labels.get(slot_id)
	if label == null:
		return
	label.text = message
	add_slot_styles(slot_buttons[slot_id], "reject")
	var timer := get_tree().create_timer(0.9)
	timer.timeout.connect(func() -> void:
		if app.pending_ability.is_empty():
			add_slot_styles(slot_buttons[slot_id], "normal")
		else:
			apply_state(app.pending_ability)
	)


func show_slot_hint(slot_id: String, message: String) -> void:
	var label: Label = reject_labels.get(slot_id)
	if label != null:
		label.text = message


func card_node(ability_id: String) -> Control:
	return cards.get(ability_id)


func slot_node(slot_id: String) -> Control:
	return slot_buttons.get(slot_id)


func slot_label(slot_id: String) -> Label:
	return install_labels.get("slot:" + slot_id)
