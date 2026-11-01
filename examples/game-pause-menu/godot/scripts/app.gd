extends Control
class_name PauseMenuApp

## Orion N5 game pause menu — Godot lane parity shell.
##
## Every rect, colour and type size comes from `fixtures/parity-layout.json` via
## `ParityLayout`; no geometry is re-typed here. The shell composes the generated
## Full Stack DS Godot components where the target admits them (Tabs, Switch,
## Popover, Button, Badge, Card, Icon) and lane-local native chrome where it does
## not (bands, map plot, rows, sliders, dropdowns, swatches, modal/drawer).
##
## Brand delivery: the Godot target has no resolved brand projection, so the
## Orion palette is projected by OrionTheme from the same JSON colour map.

var fixtures: PauseFixtures
var parity: ParityLayout
var orion: OrionTheme

# --- app state ---------------------------------------------------------------
var active_tab := "map"
var icon_visible: Dictionary = {}
var nav_target := ""
var drawer_faction := ""
var pending_ability := ""
var remap_action := ""
var general_values: Dictionary = {}
var controller_values: Dictionary = {}
var remap_bindings: Dictionary = {}
var audio_values: Dictionary = {}
var audio_language := ""
var subtitle_language := ""
var subtitle_background := ""

# --- nodes -------------------------------------------------------------------
var header: Control
var tab_bar: Control
var footer: Control
var tabs
var map_tab
var progress_tab
var abilities_tab
var settings_tab
var nav_target_label: Label
var marker_popover
var ability_popover
var popover_layer: Control
var modal_layer: Control
var modal_action_label: Label
var modal_panel: PanelContainer


func _ready() -> void:
	fixtures = PauseFixtures.load_all()
	if not fixtures.validate_cross_references():
		_build_error_screen()
		return
	parity = ParityLayout.from_dict(fixtures.parity_layout)
	orion = OrionTheme.from_parity(parity)
	UI.parity = parity
	UI.orion = orion
	DSFactory.parity = parity
	DSFactory.orion = orion
	theme = orion.shell_theme()
	_initialize_state()
	_build_shell()
	_apply_initial_state()


func _build_error_screen() -> void:
	var background := ColorRect.new()
	background.color = Color("#141412")
	background.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(background)
	var column := UI.vbox(8)
	UI.place(column, 48, 48, 1184, 704)
	add_child(column)
	column.add_child(UI.micro("FIXTURE CORPUS MALFORMED", "alert"))
	var details := Label.new()
	details.text = "\n".join(fixtures.errors.slice(0, 12))
	details.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	column.add_child(details)


# --- initial state -----------------------------------------------------------

func _initialize_state() -> void:
	for icon in fixtures.map_icons.get("icons", []):
		icon_visible[icon["id"]] = bool(icon["visible"])
	nav_target = "" if fixtures.commander.get("navTarget") == null else str(fixtures.commander["navTarget"])
	for toggle in fixtures.settings.get("general", []):
		general_values[toggle["id"]] = bool(toggle["value"])
	for slider in fixtures.settings.get("controller", []):
		controller_values[slider["id"]] = float(slider["value"])
	for action in fixtures.settings.get("remap", []):
		remap_bindings[action["id"]] = str(action["binding"])
	var audio: Dictionary = fixtures.settings.get("audio", {})
	for slider in audio.get("sliders", []):
		audio_values[slider["id"]] = float(slider["value"])
	audio_language = str(audio.get("audioLanguage", {}).get("value", ""))
	subtitle_language = str(audio.get("subtitleLanguage", {}).get("value", ""))
	subtitle_background = str(audio.get("subtitleBackground", {}).get("value", ""))


func _apply_initial_state() -> void:
	active_tab = str(tabs.value)
	map_tab.apply_state(icon_visible, nav_target)
	_update_nav_target_footer()


# --- shell -------------------------------------------------------------------

func _build_shell() -> void:
	var background := ColorRect.new()
	background.color = orion.color("ruleStrong")
	background.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	background.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(background)

	header = _build_header()
	add_child(header)
	tab_bar = _build_tab_bar_background()
	add_child(tab_bar)
	tabs = _build_tabs()
	add_child(tabs)
	_populate_tabs()
	_add_tab_separators()
	footer = _build_footer()
	add_child(footer)
	popover_layer = Control.new()
	popover_layer.name = "PopoverLayer"
	popover_layer.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	popover_layer.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(popover_layer)
	_build_popovers()
	_build_remap_modal()


func _build_header() -> Control:
	var rect := UI.rect(parity.header["rect"])
	var band := Control.new()
	band.name = "HeaderBand"
	UI.place_rect(band, rect)
	var ground := UI.rect_node(str(parity.header.get("background", "charcoal")))
	ground.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	band.add_child(ground)
	var rule_bottom := UI.rect_node(str(parity.header.get("ruleBottom", "rule")))
	UI.place(rule_bottom, 0, rect.size.y - 1, rect.size.x, 1)
	band.add_child(rule_bottom)

	var wordmark_data: Dictionary = parity.header["wordmark"]
	var wordmark := UI.hbox(10)
	UI.place(wordmark, float(wordmark_data["x"]), float(wordmark_data["y"]), 420, float(wordmark_data["h"]))
	var main := UI.label(str(wordmark_data["textMain"]), orion.type_size("wordmark"), 800, "boneBright", 0.0)
	var accent := UI.label(str(wordmark_data["textAccent"]), orion.type_size("wordmark"), 800, "signal", 0.0)
	main.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	accent.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	wordmark.add_child(main)
	wordmark.add_child(accent)
	band.add_child(wordmark)

	var mission_data: Dictionary = parity.header["mission"]
	var mission := UI.label(str(mission_data["text"]), orion.type_size("mission"), 400, "muted", orion.micro_spacing())
	UI.place(mission, float(mission_data["x"]), float(mission_data["y"]), 700, 18)
	band.add_child(mission)

	for stat in parity.header["stats"]:
		_add_header_stat(band, stat)

	var paused_rect := UI.rect(parity.header["pausedChip"])
	var paused = DSFactory.chip(
		str(parity.header["pausedChip"]["text"]),
		orion.color("signal"),
		orion.color("onSignal"),
		orion.color("signal"),
		paused_rect.size.x,
		paused_rect.size.y,
		orion.type_size("chip")
	)
	UI.place_rect(paused, paused_rect)
	band.add_child(paused)
	DSFactory.prepare_chip(paused)
	return band


func _add_header_stat(band: Control, stat: Dictionary) -> void:
	var x := float(stat["x"])
	var label := UI.micro(str(stat["label"]), "muted")
	UI.place(label, x, float(stat["labelY"]), 190, 14)
	band.add_child(label)
	var value := UI.label(str(stat["value"]), orion.type_size("statValue"), 800, "boneBright", 0.0)
	UI.place(value, x, float(stat["valueY"]), 190, 28)
	band.add_child(value)
	var sub := UI.label(str(stat["sub"]), orion.type_size("statSub"), 400, "muted", 0.0)
	UI.place(sub, x, float(stat["subY"]), 190, 16)
	band.add_child(sub)


func _build_tab_bar_background() -> Control:
	var rect := UI.rect(parity.tab_bar["rect"])
	var band := Control.new()
	band.name = "TabBarBand"
	UI.place_rect(band, rect)
	var ground := UI.rect_node(str(parity.tab_bar["background"]))
	ground.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	band.add_child(ground)
	var rule_bottom := UI.rect_node(str(parity.tab_bar.get("ruleBottom", "rule")))
	UI.place(rule_bottom, 0, rect.size.y - 1, rect.size.x, 1)
	band.add_child(rule_bottom)
	return band


func _add_tab_separators() -> void:
	# 1px `rule` separators between tabs, drawn above the generated tab strip.
	var layer := Control.new()
	layer.name = "TabSeparatorLayer"
	layer.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	layer.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(layer)
	var tab_y := float(parity.tab_bar["rect"]["y"])
	var tab_height := float(parity.tab_bar["rect"]["h"])
	for tab in parity.tab_bar["tabs"]:
		var x := float(tab["x"])
		if x <= 0.0:
			continue
		var separator := UI.rect_node(str(parity.tab_bar.get("separator", "rule")))
		UI.place(separator, x, tab_y, 1, tab_height)
		layer.add_child(separator)


func _build_tabs():
	var node = DSFactory.tabs()
	if node == null:
		return null
	node.name = "TabBar"
	UI.place(node, 0, float(parity.tab_bar["rect"]["y"]), float(parity.tab_bar["rect"]["w"]), 0)
	return node


func _populate_tabs() -> void:
	var content := UI.rect(parity.panels["content"])
	var body_size := Vector2(content.size.x + content.position.x * 2.0, content.size.y)
	map_tab = MapTab.new()
	map_tab.name = "MapTab"
	map_tab.app = self
	map_tab.custom_minimum_size = body_size
	tabs.add_item("map", "MAP", map_tab)
	progress_tab = ProgressTab.new()
	progress_tab.name = "ProgressTab"
	progress_tab.app = self
	progress_tab.custom_minimum_size = body_size
	tabs.add_item("progress", "PROGRESS", progress_tab)
	abilities_tab = AbilitiesTab.new()
	abilities_tab.name = "AbilitiesTab"
	abilities_tab.app = self
	abilities_tab.custom_minimum_size = body_size
	tabs.add_item("abilities", "ABILITIES", abilities_tab)
	settings_tab = SettingsTab.new()
	settings_tab.name = "SettingsTab"
	settings_tab.app = self
	settings_tab.custom_minimum_size = body_size
	tabs.add_item("settings", "SETTINGS", settings_tab)
	# NOT FSDS: Tabs has no selected-tab styling channel; DSFactory forces the
	# parity 320x56 tab boxes and per-state fills on the generated triggers.
	DSFactory.style_tabs(tabs)
	tabs.value_changed.connect(_on_tab_value_changed)
	tabs.size = Vector2(float(parity.tab_bar["rect"]["w"]), _tabs_height())


func _tabs_height() -> float:
	var strip := float(parity.tab_bar["rect"]["h"])
	var content := UI.rect(parity.panels["content"])
	return strip + (content.position.y - float(parity.tab_bar["rect"]["y"]) - strip) + content.size.y


func _on_tab_value_changed(next: String) -> void:
	active_tab = next


## I1: select exactly one tab; the generated Tabs swaps the visible body.
func select_tab(key: String) -> void:
	if tabs == null:
		return
	if str(tabs.value) == key:
		active_tab = key
		return
	tabs.activate(key)
	active_tab = str(tabs.value)


func _build_footer() -> Control:
	var footer_data: Dictionary = parity.footer
	var rect := UI.rect(footer_data["rect"])
	var band := Control.new()
	band.name = "FooterBand"
	UI.place_rect(band, rect)
	var ground := UI.rect_node("ruleStrong")
	ground.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	band.add_child(ground)
	var rule_top := UI.rect_node(str(footer_data.get("ruleTop", "rule")))
	UI.place(rule_top, 0, 0, rect.size.x, 1)
	band.add_child(rule_top)

	var hints_data: Dictionary = footer_data["hints"]
	var hints := UI.label(str(hints_data["text"]), orion.type_size("footer"), 400, "textSecondary", 0.0)
	UI.place(hints, float(hints_data["x"]), float(hints_data["y"]) - rect.position.y, 820, 16)
	band.add_child(hints)

	var nav_data: Dictionary = footer_data["navTarget"]
	var value_right := float(nav_data["valueRight"])
	var nav_label := UI.micro(str(nav_data["label"]), "textSecondary")
	nav_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	UI.place(nav_label, float(nav_data["labelX"]), float(nav_data["labelY"]) - 1.0 - rect.position.y, 160, 14)
	band.add_child(nav_label)
	# Right-aligned target value ending at valueRight, 13 px / 700 / signal.
	nav_target_label = UI.label(str(nav_data["empty"]), orion.type_size("tab"), 700, "signal", 0.0)
	nav_target_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	nav_target_label.autowrap_mode = TextServer.AUTOWRAP_OFF
	UI.place(nav_target_label, value_right - 256.0, float(nav_data["valueY"]) - 1.0 - rect.position.y, 256, 20)
	band.add_child(nav_target_label)
	return band


func _update_nav_target_footer() -> void:
	var nav_data: Dictionary = parity.footer["navTarget"]
	if nav_target.is_empty():
		nav_target_label.text = str(nav_data["empty"])
		nav_target_label.add_theme_color_override("font_color", orion.color("textSecondary"))
		return
	var icon := fixtures.icon_by_id(nav_target)
	nav_target_label.text = str(icon.get("label", ""))
	nav_target_label.add_theme_color_override("font_color", orion.color("signal"))


# --- popovers ----------------------------------------------------------------

func _build_popovers() -> void:
	marker_popover = DSFactory.popover()
	marker_popover.name = "MarkerPopover"
	popover_layer.add_child(marker_popover)
	DSFactory.prepare_popover(marker_popover)

	ability_popover = DSFactory.popover()
	ability_popover.name = "AbilityPopover"
	popover_layer.add_child(ability_popover)
	DSFactory.prepare_popover(ability_popover)


func popover_open(node) -> bool:
	return node != null and str(node.value) == "true"


func _clear_popover_content(node) -> void:
	for child in node.content.get_children():
		node.content.remove_child(child)
		child.queue_free()


func open_marker_popover(icon_id: String, forced_rect := Rect2()) -> void:
	var icon := fixtures.icon_by_id(icon_id)
	if icon.is_empty() or marker_popover == null:
		return
	if not bool(icon_visible.get(icon_id, false)):
		return
	close_ability_popover()
	_populate_marker_popover(icon)
	marker_popover.value = "true"
	var rect := forced_rect
	if rect.size == Vector2.ZERO:
		var anchor := Vector2(200, 320)
		var marker: Control = map_tab.marker_node(icon_id)
		if marker != null:
			anchor = marker.get_global_rect().get_center()
		rect = _anchored_popover_rect(anchor, UI.rect(parity.map["popover"]).size)
	DSFactory.style_popover_surface(marker_popover, rect)


func _anchored_popover_rect(anchor: Vector2, popover_size: Vector2) -> Rect2:
	var viewport_size := parity.viewport
	var x := anchor.x + 24.0
	if x + popover_size.x > viewport_size.x - 8.0:
		x = anchor.x - popover_size.x - 24.0
	x = clampf(x, 8.0, viewport_size.x - popover_size.x - 8.0)
	var y := anchor.y + 18.0
	if y + popover_size.y > float(parity.footer["rect"]["y"]) - 8.0:
		y = anchor.y - popover_size.y - 18.0
	y = clampf(y, float(parity.panels["content"]["y"]) + 8.0, float(parity.footer["rect"]["y"]) - popover_size.y - 8.0)
	return Rect2(Vector2(x, y), popover_size)


func _populate_marker_popover(icon: Dictionary) -> void:
	_clear_popover_content(marker_popover)
	var popover_rect := UI.rect(parity.map["popover"])
	var padding := 16.0
	var width := popover_rect.size.x - padding * 2.0
	# Dark attached content: generated Text's fixed foreground cannot reach it, so
	# copy is projected with native labels (ledgered fallback).
	var header_row := UI.hbox(8)
	UI.place(header_row, padding, 12, width, 18)
	marker_popover.content.add_child(header_row)
	header_row.add_child(UI.micro(str(icon.get("sector", "")), "muted"))
	header_row.add_child(UI.spacer())
	var status = DSFactory.chip(
		str(icon.get("status", "")),
		orion.color("graphite"),
		orion.color("boneBright"),
		orion.color("ruleStrong"),
		72,
		18,
		9
	)
	header_row.add_child(status)
	DSFactory.prepare_chip(status)

	var title := UI.title(str(icon.get("label", "")), orion.type_size("title"), "boneBright")
	UI.place(title, padding, 34, width, 30)
	marker_popover.content.add_child(title)

	var meta_row := UI.hbox(12)
	UI.place(meta_row, padding, 66, width, 14)
	marker_popover.content.add_child(meta_row)
	meta_row.add_child(UI.sub("DISTANCE %s KM" % str(icon.get("distanceKm", "")), "muted"))
	meta_row.add_child(UI.sub("KIND %s" % str(icon.get("kind", "")).to_upper(), "muted"))

	var detail := UI.label(str(icon.get("detail", "")), orion.type_size("body"), 400, "bone", 0.0)
	detail.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	UI.place(detail, padding, 86, width, 54)
	marker_popover.content.add_child(detail)

	var reward := UI.label(str(icon.get("reward", "")), orion.type_size("rowSub"), 700, "signalHot", 0.0)
	UI.place(reward, padding, 146, width, 16)
	marker_popover.content.add_child(reward)

	var actions := UI.hbox(8)
	UI.place(actions, padding, popover_rect.size.y - 48, width, 32)
	marker_popover.content.add_child(actions)
	var nav_action = DSFactory.action("SET AS NAV TARGET", "primary", 170, 32, 11)
	nav_action.activated.connect(set_nav_target.bind(str(icon.get("id", ""))))
	actions.add_child(nav_action)
	var cancel_data: Dictionary = parity.map["popover"]
	var close_action = DSFactory.action(str(cancel_data.get("cancel", "CLOSE")), "outline", 80, 32, 11)
	close_action.activated.connect(close_marker_popover)
	actions.add_child(close_action)


func open_ability_popover(ability_id: String, forced_rect := Rect2()) -> void:
	var ability := fixtures.ability_by_id(ability_id)
	if ability.is_empty() or ability_popover == null:
		return
	close_marker_popover()
	_populate_ability_popover(ability)
	ability_popover.value = "true"
	var rect := forced_rect
	if rect.size == Vector2.ZERO:
		var anchor := Vector2(220, 320)
		var card: Control = abilities_tab.card_node(ability_id)
		if card != null:
			anchor = card.get_global_rect().get_center()
		rect = _anchored_popover_rect(anchor, UI.rect(parity.abilities["hoverPopover"]).size)
	DSFactory.style_popover_surface(ability_popover, rect)


func _populate_ability_popover(ability: Dictionary) -> void:
	_clear_popover_content(ability_popover)
	var popover_rect := UI.rect(parity.abilities["hoverPopover"])
	var padding := 14.0
	var width := popover_rect.size.x - padding * 2.0
	var top := UI.hbox(8)
	UI.place(top, padding, 10, width, 18)
	ability_popover.content.add_child(top)
	top.add_child(DSFactory.rarity_chip(str(ability.get("rarity", "")), 64, 18))
	top.add_child(UI.spacer())
	top.add_child(UI.micro("SIZE %d" % int(ability.get("size", 0)), "muted"))
	var title := UI.title(str(ability.get("name", "")), orion.type_size("title"), "boneBright")
	UI.place(title, padding, 32, width, 28)
	ability_popover.content.add_child(title)
	var description := UI.label(str(ability.get("description", "")), orion.type_size("body"), 400, "bone", 0.0)
	description.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	UI.place(description, padding, 62, width, 44)
	ability_popover.content.add_child(description)
	var stat_row := UI.hbox(18)
	UI.place(stat_row, padding, 112, width, 40)
	ability_popover.content.add_child(stat_row)
	for key in ability.get("stats", {}):
		var cell := UI.vbox(0)
		cell.add_child(UI.micro(str(key), "muted"))
		cell.add_child(UI.label(str(ability["stats"][key]), orion.type_size("value"), 700, "boneBright", 0.0))
		stat_row.add_child(cell)


func close_marker_popover() -> void:
	if marker_popover != null and popover_open(marker_popover):
		marker_popover.value = "false"


func close_ability_popover() -> void:
	if ability_popover != null and popover_open(ability_popover):
		ability_popover.value = "false"


func set_nav_target(icon_id: String) -> void:
	nav_target = icon_id
	map_tab.apply_state(icon_visible, nav_target)
	_update_nav_target_footer()
	close_marker_popover()


func hover_ability(ability_id: String, entered: bool) -> void:
	if entered:
		open_ability_popover(ability_id)
	else:
		close_ability_popover()


# --- map interactions --------------------------------------------------------

func set_icon_visibility(icon_id: String, visible: bool) -> void:
	icon_visible[icon_id] = visible
	map_tab.apply_state(icon_visible, nav_target)
	var toggle_node = map_tab.switch_for(icon_id)
	if toggle_node != null:
		var next := "true" if visible else "false"
		if str(toggle_node.value) != next:
			toggle_node.value = next


func open_marker(icon_id: String) -> void:
	open_marker_popover(icon_id)


# --- progress interactions ---------------------------------------------------

func select_faction(faction_id: String) -> void:
	var faction := fixtures.faction_by_id(faction_id)
	if faction.is_empty():
		return
	drawer_faction = faction_id
	progress_tab.open_drawer(faction)


func close_drawer() -> void:
	drawer_faction = ""
	if progress_tab != null:
		progress_tab.close_drawer()


# --- abilities interactions --------------------------------------------------

func select_ability(ability_id: String) -> void:
	if fixtures.ability_by_id(ability_id).is_empty():
		return
	if pending_ability == ability_id:
		pending_ability = ""
	else:
		pending_ability = ability_id
	abilities_tab.apply_state(pending_ability)


func compatible_slots(ability_id: String) -> Array:
	var ability := fixtures.ability_by_id(ability_id)
	var slots: Array = []
	if ability.is_empty():
		return slots
	for slot in fixtures.vehicle.get("slots", []):
		if int(slot.get("size", 0)) >= int(ability.get("size", 0)):
			slots.append(str(slot.get("id", "")))
	return slots


func activate_slot(slot_id: String) -> void:
	var slot := fixtures.slot_by_id(slot_id)
	if slot.is_empty():
		return
	if pending_ability.is_empty():
		# With no pending module, activating an installed slot removes it (parity
		# has no visible remove control; removal stays reachable from the slot).
		if slot.get("abilityId") != null:
			remove_slot_ability(slot_id)
		return
	var ability := fixtures.ability_by_id(pending_ability)
	if int(slot.get("size", 0)) >= int(ability.get("size", 0)):
		slot["abilityId"] = pending_ability
		abilities_tab.apply_state(pending_ability)
	else:
		abilities_tab.show_slot_reject(slot_id, "SLOT SIZE %d < MODULE SIZE %d" % [int(slot.get("size", 0)), int(ability.get("size", 0))])


func remove_slot_ability(slot_id: String) -> void:
	var slot := fixtures.slot_by_id(slot_id)
	if slot.is_empty():
		return
	slot["abilityId"] = null
	abilities_tab.apply_state(pending_ability)


func installed_slot(ability_id: String) -> String:
	for slot in fixtures.vehicle.get("slots", []):
		if slot.get("abilityId") == ability_id:
			return str(slot.get("id", ""))
	return ""


# --- settings interactions ---------------------------------------------------

func set_general(toggle_id: String, value: bool) -> void:
	general_values[toggle_id] = value
	settings_tab.apply_general(toggle_id, value)


func toggle_general(toggle_id: String) -> void:
	set_general(toggle_id, not bool(general_values.get(toggle_id, false)))


func set_controller(setting_id: String, value: float) -> void:
	controller_values[setting_id] = value
	settings_tab.apply_controller(setting_id, value)


func open_remap(action_id: String) -> void:
	if not remap_action.is_empty():
		return
	var action := _remap_fixture(action_id)
	if action.is_empty():
		return
	remap_action = action_id
	modal_action_label.text = str(action.get("label", ""))
	modal_layer.visible = true


func cancel_remap() -> void:
	remap_action = ""
	if modal_layer != null:
		modal_layer.visible = false


func capture_binding(event: InputEvent) -> bool:
	if remap_action.is_empty():
		return false
	var binding := _binding_name(event)
	if binding.is_empty():
		return false
	remap_bindings[remap_action] = binding
	settings_tab.apply_remap(remap_action, binding)
	cancel_remap()
	return true


func _remap_fixture(action_id: String) -> Dictionary:
	for action in fixtures.settings.get("remap", []):
		if action["id"] == action_id:
			return action
	return {}


func _binding_name(event: InputEvent) -> String:
	if event is InputEventKey:
		var key_event := event as InputEventKey
		if key_event.keycode == KEY_ESCAPE or key_event.physical_keycode == KEY_ESCAPE:
			return ""
		var code := key_event.keycode if key_event.keycode != 0 else key_event.physical_keycode
		if code == 0:
			return ""
		var key_name := OS.get_keycode_string(code)
		if key_name.is_empty():
			return ""
		if key_event.shift_pressed and key_name != "Shift":
			return "SHIFT+" + key_name
		return key_name
	if event is InputEventJoypadButton:
		return "PAD %d" % (event as InputEventJoypadButton).button_index
	if event is InputEventMouseButton:
		return "MOUSE %d" % (event as InputEventMouseButton).button_index
	return ""


func set_audio_slider(slider_id: String, value: float) -> void:
	audio_values[slider_id] = value
	settings_tab.apply_audio_slider(slider_id, value)


func audio_language_options() -> Array:
	return fixtures.settings.get("audio", {}).get("audioLanguage", {}).get("options", [])


func subtitle_language_options() -> Array:
	return fixtures.settings.get("audio", {}).get("subtitleLanguage", {}).get("options", [])


func set_audio_language(index: int) -> void:
	var options := audio_language_options()
	if index < 0 or index >= options.size():
		return
	audio_language = str(options[index])
	settings_tab.apply_audio_languages()


func set_subtitle_language(index: int) -> void:
	var options := subtitle_language_options()
	if index < 0 or index >= options.size():
		return
	subtitle_language = str(options[index])
	settings_tab.apply_audio_languages()


func subtitle_background_options() -> Array:
	return fixtures.settings.get("audio", {}).get("subtitleBackground", {}).get("options", [])


func set_subtitle_background(option_id: String) -> void:
	for option in subtitle_background_options():
		if str(option.get("id", "")) == option_id:
			subtitle_background = option_id
			settings_tab.apply_subtitle_background()
			return


# --- capture states ----------------------------------------------------------

## Applies one of the parity `captures` states exactly (the capture tool drives
## this; the state list and per-state fields come from the JSON authority).
func apply_capture_state(state_name: String) -> void:
	var state := parity.capture_state(state_name)
	close_marker_popover()
	close_ability_popover()
	cancel_remap()
	close_drawer()
	select_tab(str(state.get("activeTab", "map")))
	var hidden: Array = state.get("hiddenIcons", [])
	for icon in fixtures.map_icons.get("icons", []):
		var icon_id := str(icon.get("id", ""))
		set_icon_visibility(icon_id, not hidden.has(icon_id))
	set_nav_target(str(state.get("navTarget", "")))
	if state.has("drawer"):
		select_faction(str(state["drawer"]))
	if state.has("pendingAbility"):
		select_ability(str(state["pendingAbility"]))
	if state.has("popover") and state["popover"] != null:
		open_marker_popover(str(state["popover"]), UI.rect(parity.map["popover"]))
	if state.has("hover") and state["hover"] != null:
		open_ability_popover(str(state["hover"]), UI.rect(parity.abilities["hoverPopover"]))
	if state.has("remapModal") and state["remapModal"] != null:
		open_remap(str(state["remapModal"]))
	if state.has("subtitleBackground"):
		set_subtitle_background(str(state["subtitleBackground"]))
	if state.has("subtitleLanguage"):
		var options := subtitle_language_options()
		var index := options.find(str(state["subtitleLanguage"]))
		if index >= 0:
			set_subtitle_language(index)


# --- input -------------------------------------------------------------------

func _unhandled_key_input(event: InputEvent) -> void:
	if not remap_action.is_empty():
		if event.is_action_pressed("ui_cancel"):
			cancel_remap()
			get_viewport().set_input_as_handled()
			return
		if capture_binding(event):
			get_viewport().set_input_as_handled()
		return
	if event.is_action_pressed("ui_cancel"):
		if popover_open(marker_popover):
			close_marker_popover()
			get_viewport().set_input_as_handled()
			return
		if popover_open(ability_popover):
			close_ability_popover()
			get_viewport().set_input_as_handled()
			return
		if not drawer_faction.is_empty():
			close_drawer()
			get_viewport().set_input_as_handled()


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and (event as InputEventMouseButton).pressed:
		if popover_open(marker_popover) and not _point_in_surface(marker_popover, (event as InputEventMouseButton).position):
			close_marker_popover()
		elif popover_open(ability_popover) and not _point_in_surface(ability_popover, (event as InputEventMouseButton).position):
			close_ability_popover()


func _point_in_surface(node, point: Vector2) -> bool:
	if node.surface == null or not node.surface.is_visible_in_tree():
		return false
	return node.surface.get_global_rect().has_point(point)


# --- remap modal -------------------------------------------------------------

func _build_remap_modal() -> void:
	modal_layer = Control.new()
	modal_layer.name = "RemapModal"
	modal_layer.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	modal_layer.visible = false
	add_child(modal_layer)
	var dim := ColorRect.new()
	dim.color = Color(orion.color("ink"), 0.78)
	dim.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	dim.mouse_filter = Control.MOUSE_FILTER_STOP
	modal_layer.add_child(dim)
	var modal_rect := UI.rect(parity.settings["remapModal"])
	modal_panel = PanelContainer.new()
	modal_panel.add_theme_stylebox_override("panel", orion.flat(orion.color("charcoal"), orion.color("ruleStrong"), 1, 20.0))
	UI.place_rect(modal_panel, modal_rect)
	modal_layer.add_child(modal_panel)
	var column := UI.vbox(8)
	modal_panel.add_child(column)
	column.add_child(UI.micro("CONTROLLER REMAP", "muted"))
	modal_action_label = UI.title("", orion.type_size("title"), "boneBright")
	column.add_child(modal_action_label)
	column.add_child(UI.label(str(parity.settings["remapModal"]["prompt"]), orion.type_size("value"), 800, "signal", 0.0))
	column.add_child(UI.vspace(8))
	var actions := UI.hbox(8)
	actions.alignment = BoxContainer.ALIGNMENT_END
	var cancel = DSFactory.action("CANCEL", "outline", 120, 28, 11)
	cancel.activated.connect(cancel_remap)
	actions.add_child(cancel)
	column.add_child(actions)
