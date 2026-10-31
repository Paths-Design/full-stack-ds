extends Control
class_name PauseMenuApp

## Orion N5 game pause menu — Godot lane application shell.
##
## The shell (header band, tab bar, content region, footer band) composes the
## generated Full Stack DS Godot components wherever the target's allowlist
## admits one. This script owns app state and the I1..I15 interaction semantics
## from examples/game-pause-menu/spec.md; the tab bodies own their region views.
##
## Brand delivery: the Godot target has no resolved brand projection, so the
## Orion palette arrives through OrionTheme (lane-local Theme), component
## `token_overrides`, and `add_theme_*_override` fallbacks on generated
## control-family nodes. See README.md "Brand delivery".

const VIEW_SIZE := Vector2(1280, 800)
const HEADER_HEIGHT := 100.0
const FOOTER_Y := 744.0
const FOOTER_HEIGHT := 56.0
const TABS_POSITION := Vector2(16, 108)
const BODY_SIZE := Vector2(1248, 572)

var fixtures: PauseFixtures
var orion: OrionTheme

# --- app state (the interaction truth) --------------------------------------
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
var tabs
var map_tab
var progress_tab
var abilities_tab
var settings_tab
var nav_target_label: Label
var nav_target_chip: ColorRect
var marker_popover
var ability_popover
var popover_layer: Control
var modal_layer: Control
var modal_action_label: Label
var modal_panel: PanelContainer
var header: Control
var footer: Control


func _ready() -> void:
	fixtures = PauseFixtures.load_all()
	if not fixtures.validate_cross_references():
		_build_error_screen()
		return
	orion = OrionTheme.from_appearance(fixtures.appearance)
	UI.orion = orion
	DSFactory.orion = orion
	theme = orion.shell_theme()
	_initialize_state()
	_build_shell()
	_apply_initial_state()


func _build_error_screen() -> void:
	# A malformed fixture corpus fails loudly: the app reports the parse errors
	# instead of running with partial data.
	var background := ColorRect.new()
	background.color = Color("#141412")
	background.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(background)
	var column := UI.vbox(8)
	column.position = Vector2(48, 48)
	column.size = Vector2(1184, 704)
	add_child(column)
	column.add_child(UI.micro("FIXTURE CORPUS MALFORMED", "alert"))
	var first := Label.new()
	first.text = "\n".join(fixtures.errors.slice(0, 12))
	first.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	column.add_child(first)


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
	# Tabs selects its first added key on construction; mirror it into app state.
	active_tab = str(tabs.value)
	map_tab.apply_state(icon_visible, nav_target)
	_update_nav_target_footer()


# --- shell -------------------------------------------------------------------

func _build_shell() -> void:
	var background := ColorRect.new()
	background.color = orion.color("app")
	background.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(background)

	header = _build_header()
	add_child(header)
	tabs = _build_tabs()
	if tabs == null:
		push_error("PAUSE_MENU_TABS_UNAVAILABLE")
	else:
		add_child(tabs)
		_populate_tabs()
		tabs.size = Vector2(BODY_SIZE.x, 620)
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
	var band := Control.new()
	band.name = "HeaderBand"
	UI.place(band, 0, 0, VIEW_SIZE.x, HEADER_HEIGHT)
	var ground := ColorRect.new()
	ground.color = orion.surface["panel"]
	ground.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	ground.mouse_filter = Control.MOUSE_FILTER_IGNORE
	band.add_child(ground)

	# Signal-orange action strip at the header's top edge.
	var strip := ColorRect.new()
	strip.color = orion.palette["signal"]
	UI.place(strip, 0, 0, VIEW_SIZE.x, 4)
	strip.mouse_filter = Control.MOUSE_FILTER_IGNORE
	band.add_child(strip)

	# Oversized N5 watermark motif (lane-local decoration from the reference).
	var watermark := UI.label(orion.watermark(), 150, 900, "bone")
	watermark.add_theme_color_override("font_color", Color(orion.palette["bone"], 0.05))
	UI.place(watermark, 986, -46, 320, 190)
	watermark.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	watermark.mouse_filter = Control.MOUSE_FILTER_IGNORE
	band.add_child(watermark)

	var brand := UI.label("ORION N5", 34, 800, "boneBright", 1.0)
	UI.place(brand, 28, 18, 260, 46)
	band.add_child(brand)
	var mission := UI.micro(str(fixtures.commander.get("mission", "")) + " · MISSION CONTROL", "muted")
	UI.place(mission, 30, 66, 320, 18)
	band.add_child(mission)

	var callsign = DSFactory.badge(
		str(fixtures.commander.get("callsignPlate", "")),
		orion.surface["raised"],
		orion.palette["bone"],
		orion.surface["ruleStrong"],
		"sm"
	)
	callsign.position = Vector2(238, 40)
	band.add_child(callsign)

	var divider := ColorRect.new()
	divider.color = orion.surface["rule"]
	UI.place(divider, 312, 20, 1, 60)
	divider.mouse_filter = Control.MOUSE_FILTER_IGNORE
	band.add_child(divider)

	var commander: Dictionary = fixtures.commander
	_add_header_rank(band, commander, 336)
	_add_header_earnings(band, commander, 636)
	_add_header_followers(band, commander, 898)

	var paused = DSFactory.badge(str(commander.get("status", "PAUSED")), orion.palette["signal"], orion.palette["onSignal"], orion.palette["signal"], "md")
	paused.position = Vector2(1156, 34)
	band.add_child(paused)
	var paused_caption := UI.micro("SESSION", "muted")
	UI.place(paused_caption, 1158, 70, 90, 14)
	band.add_child(paused_caption)
	return band


func _add_header_rank(band: Control, commander: Dictionary, x: float) -> void:
	var rank: Dictionary = commander.get("rank", {})
	var block := UI.vbox(2)
	UI.place(block, x, 18, 280, 68)
	block.add_child(UI.micro("RANKING"))
	block.add_child(UI.title(str(rank.get("label", "")), 20, "boneBright"))
	var detail := UI.micro("LV %d · GLOBAL %d · %s" % [int(rank.get("level", 0)), int(rank.get("globalPosition", 0)), rank.get("percentile", "")], "muted")
	block.add_child(detail)
	band.add_child(block)


func _add_header_earnings(band: Control, commander: Dictionary, x: float) -> void:
	var earnings: Dictionary = commander.get("earnings", {})
	var block := UI.vbox(2)
	UI.place(block, x, 18, 240, 68)
	block.add_child(UI.micro("EARNINGS"))
	var row := UI.hbox(6)
	var value := UI.heavy(UI.fmt_int(int(earnings.get("credits", 0))), 26, "boneBright")
	row.add_child(value)
	row.add_child(UI.micro(str(earnings.get("currency", "CR")), "signalHot"))
	block.add_child(row)
	block.add_child(UI.micro("PENDING %s %s" % [UI.fmt_int(int(earnings.get("pending", 0))), earnings.get("currency", "")], "muted"))
	band.add_child(block)


func _add_header_followers(band: Control, commander: Dictionary, x: float) -> void:
	var followers: Dictionary = commander.get("followers", {})
	var block := UI.vbox(2)
	UI.place(block, x, 18, 200, 68)
	block.add_child(UI.micro("FOLLOWERS"))
	block.add_child(UI.heavy(UI.fmt_int(int(followers.get("total", 0))), 26, "boneBright"))
	block.add_child(UI.micro("%s %s" % [followers.get("trend", ""), followers.get("period", "")], "clear"))
	band.add_child(block)


func _build_tabs():
	var node = DSFactory.tabs()
	if node == null:
		return null
	node.name = "TabBar"
	UI.place(node, TABS_POSITION.x, TABS_POSITION.y, BODY_SIZE.x, 0)
	return node


func _populate_tabs() -> void:
	map_tab = MapTab.new()
	map_tab.name = "MapTab"
	map_tab.app = self
	map_tab.custom_minimum_size = BODY_SIZE
	tabs.add_item("map", "MAP", map_tab)
	progress_tab = ProgressTab.new()
	progress_tab.name = "ProgressTab"
	progress_tab.app = self
	progress_tab.custom_minimum_size = BODY_SIZE
	tabs.add_item("progress", "PROGRESS", progress_tab)
	abilities_tab = AbilitiesTab.new()
	abilities_tab.name = "AbilitiesTab"
	abilities_tab.app = self
	abilities_tab.custom_minimum_size = BODY_SIZE
	tabs.add_item("abilities", "ABILITIES", abilities_tab)
	settings_tab = SettingsTab.new()
	settings_tab.name = "SettingsTab"
	settings_tab.app = self
	settings_tab.custom_minimum_size = BODY_SIZE
	tabs.add_item("settings", "SETTINGS", settings_tab)
	# NOT FSDS: Tabs has no selected-tab styling channel; DSFactory applies
	# lane-local styleboxes to the generated trigger Buttons.
	DSFactory.style_tabs(tabs)
	tabs.value_changed.connect(_on_tab_value_changed)


func _on_tab_value_changed(next: String) -> void:
	active_tab = next


## I1: select exactly one tab; the generated Tabs component swaps the visible
## content body and the app mirrors the active key.
func select_tab(key: String) -> void:
	if tabs == null:
		return
	if str(tabs.value) == key:
		active_tab = key
		return
	tabs.activate(key)
	active_tab = str(tabs.value)


func _build_footer() -> Control:
	var band := Control.new()
	band.name = "FooterBand"
	UI.place(band, 0, FOOTER_Y, VIEW_SIZE.x, FOOTER_HEIGHT)
	var ground := ColorRect.new()
	ground.color = orion.surface["panel"]
	ground.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	ground.mouse_filter = Control.MOUSE_FILTER_IGNORE
	band.add_child(ground)
	var rule := ColorRect.new()
	rule.color = orion.surface["ruleStrong"]
	UI.place(rule, 0, 0, VIEW_SIZE.x, 1)
	rule.mouse_filter = Control.MOUSE_FILTER_IGNORE
	band.add_child(rule)

	var hints := UI.hbox(18)
	UI.place(hints, 28, 4, 700, 48)
	hints.alignment = BoxContainer.ALIGNMENT_BEGIN
	hints.add_child(UI.hint("BACK", "CLOSE"))
	hints.add_child(UI.hint("SELECT", "CONFIRM"))
	hints.add_child(UI.hint("TAB", "CYCLE"))
	band.add_child(hints)

	var nav_caption := UI.micro("NAV TARGET", "muted")
	UI.place(nav_caption, 900, 12, 160, 14)
	band.add_child(nav_caption)
	nav_target_chip = ColorRect.new()
	nav_target_chip.color = orion.palette["signal"]
	UI.place(nav_target_chip, 900, 32, 10, 10)
	band.add_child(nav_target_chip)
	nav_target_label = UI.label("—", 15, 700, "muted")
	UI.place(nav_target_label, 918, 26, 330, 24)
	band.add_child(nav_target_label)
	return band


func _update_nav_target_footer() -> void:
	if nav_target.is_empty():
		nav_target_label.text = "—"
		nav_target_label.add_theme_color_override("font_color", orion.color("muted"))
		nav_target_chip.color = orion.surface["ruleStrong"]
		return
	var icon := fixtures.icon_by_id(nav_target)
	nav_target_label.text = "%s  ·  %s" % [str(icon.get("label", "")), str(icon.get("sector", ""))]
	nav_target_label.add_theme_color_override("font_color", orion.color("signalHot"))
	nav_target_chip.color = orion.color("signal")


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


func open_marker_popover(icon_id: String) -> void:
	var icon := fixtures.icon_by_id(icon_id)
	if icon.is_empty() or marker_popover == null:
		return
	if not bool(icon_visible.get(icon_id, false)):
		return
	close_ability_popover()
	_populate_marker_popover(icon)
	marker_popover.value = "true"
	DSFactory.style_popover_surface(marker_popover, "raised")
	var anchor := Vector2(16, 120)
	var marker: Control = map_tab.marker_node(icon_id)
	if marker != null:
		anchor = marker.get_global_rect().position + Vector2(marker.size.x / 2.0, 0)
	_fit_popover_surface(marker_popover, anchor)


## The generated surface sizes from the attached content's first-pass minimum: an
## autowrapped Label only reports its real one-line minimum after a layout pass, so
## the first pass can inflate the panel. The lane re-fits the surface once the
## content settles, then clamps it into the viewport.
## (`# NOT FSDS: no surface sizing/placement channel on the Popover`)
func _fit_popover_surface(node, anchor: Vector2) -> void:
	await get_tree().process_frame
	await get_tree().process_frame
	if node == null or node.surface == null:
		return
	var content_min: Vector2 = node.content.get_combined_minimum_size()
	node.surface.size = Vector2(maxf(content_min.x + 28.0, 360.0), minf(content_min.y + 28.0, 600.0))
	_place_popover_surface(node, anchor)


## Clamp a generated Popover surface inside the 1280x800 viewport with an 8px
## margin and prefer the side of the anchor that does not cover the icon-visibility
## panel (x <= 824). The generated surface exposes only a below-anchor position +
## viewport clamp, so this placement is an app-level fallback.
func _place_popover_surface(node, anchor: Vector2) -> void:
	if node == null or node.surface == null:
		return
	var surface_size: Vector2 = node.surface.size
	var x := anchor.x + 18.0
	if x + surface_size.x > 824.0:
		x = anchor.x - surface_size.x - 18.0
	x = clampf(x, 8.0, maxf(8.0, 824.0 - surface_size.x))
	var below := anchor.y + 10.0
	var above := anchor.y - 16.0 - surface_size.y
	var y := below
	# Prefer above the anchor when the surface would run past the viewport or when
	# the anchor sits in the lower half of the content region (keeps the stat row
	# and footer band clear).
	if below + surface_size.y > 792.0 or (anchor.y > 380.0 and above >= 8.0):
		y = above
	y = clampf(y, 8.0, maxf(8.0, 792.0 - surface_size.y))
	node.surface.position = Vector2(x, y)


func _populate_marker_popover(icon: Dictionary) -> void:
	_clear_popover_content(marker_popover)
	var column := UI.vbox(6)
	column.custom_minimum_size = Vector2(360, 0)
	marker_popover.content.add_child(column)
	var top := UI.hbox(8)
	top.add_child(UI.micro(str(icon.get("sector", "")), "muted"))
	top.add_child(UI.spacer())
	var status_colors := _status_colors(str(icon.get("status", "")))
	top.add_child(DSFactory.badge(str(icon.get("status", "")), status_colors["bg"], status_colors["fg"], status_colors["border"]))
	column.add_child(top)
	column.add_child(UI.title(str(icon.get("label", "")), 18, "boneBright"))
	# The attached content is dark-themed: generated Text's fixed light-theme
	# foreground cannot reach it, so short/long copy uses native ink-white labels
	# on the Orion charcoal surface (`# NOT FSDS: Text foreground is fixed`).
	var meta := UI.hbox(14)
	meta.add_child(UI.micro("DISTANCE %s KM" % str(icon.get("distanceKm", "")), "muted"))
	meta.add_child(UI.micro("KIND %s" % str(icon.get("kind", "")).to_upper(), "muted"))
	column.add_child(meta)
	var detail_label := UI.label(str(icon.get("detail", "")), 12, 500, "bone")
	detail_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	column.add_child(detail_label)
	var reward_row := UI.hbox(8)
	reward_row.add_child(UI.micro("REWARD", "muted"))
	reward_row.add_child(UI.label(str(icon.get("reward", "")), 12, 700, "signalHot"))
	column.add_child(reward_row)
	var actions := UI.hbox(8)
	var set_target = DSFactory.action("SET AS NAV TARGET", "primary", "small")
	set_target.activated.connect(set_nav_target.bind(str(icon.get("id", ""))))
	actions.add_child(set_target)
	var close = DSFactory.action("CLOSE", "outline", "small")
	close.activated.connect(close_marker_popover)
	actions.add_child(close)
	column.add_child(actions)


func _status_colors(status: String) -> Dictionary:
	match status:
		"ONLINE", "GARRISONED":
			return {"bg": orion.palette["clear"], "fg": orion.palette["ink"], "border": orion.palette["clear"]}
		"ACTIVE", "WARNING":
			return {"bg": orion.palette["alert"], "fg": orion.palette["boneBright"], "border": orion.palette["alert"]}
		"SEALED", "UNSURVEYED":
			return {"bg": orion.surface["raised"], "fg": orion.palette["bone"], "border": orion.surface["ruleStrong"]}
		_:
			return {"bg": orion.surface["rule"], "fg": orion.palette["bone"], "border": orion.surface["ruleStrong"]}


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


func open_ability_popover(ability_id: String) -> void:
	var ability := fixtures.ability_by_id(ability_id)
	if ability.is_empty() or ability_popover == null:
		return
	close_marker_popover()
	_populate_ability_popover(ability)
	ability_popover.value = "true"
	DSFactory.style_popover_surface(ability_popover, "raised")
	var anchor := Vector2(120, 120)
	var card: Control = abilities_tab.card_node(ability_id)
	if card != null:
		anchor = Vector2(card.get_global_rect().position.x + card.size.x / 2.0, card.get_global_rect().position.y)
	_fit_popover_surface(ability_popover, anchor)


func _populate_ability_popover(ability: Dictionary) -> void:
	_clear_popover_content(ability_popover)
	var column := UI.vbox(6)
	column.custom_minimum_size = Vector2(360, 0)
	ability_popover.content.add_child(column)
	var top := UI.hbox(8)
	top.add_child(DSFactory.rarity_badge(str(ability.get("rarity", "")), "sm"))
	top.add_child(UI.spacer())
	top.add_child(UI.micro("SIZE %d" % int(ability.get("size", 0)), "muted"))
	column.add_child(top)
	# Dark attached content: generated Text's fixed light-theme foreground cannot
	# reach it, so the copy is projected with native ink-white labels.
	column.add_child(UI.title(str(ability.get("name", "")), 18, "boneBright"))
	var description_label := UI.label(str(ability.get("description", "")), 12, 500, "bone")
	description_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	column.add_child(description_label)
	var stats: Dictionary = ability.get("stats", {})
	var stat_row := UI.hbox(18)
	for key in stats:
		var cell := UI.vbox(1)
		cell.add_child(UI.micro(str(key), "muted"))
		cell.add_child(UI.label(str(stats[key]), 13, 800, "boneBright"))
		stat_row.add_child(cell)
	column.add_child(stat_row)
	var detail_label := UI.label(str(ability.get("detail", "")), 11, 500, "muted")
	detail_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	column.add_child(detail_label)


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
		abilities_tab.show_slot_hint(slot_id, "SELECT A MODULE FIRST")
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
		return # Only one remap modal is open at a time.
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
		var name := OS.get_keycode_string(code)
		if name.is_empty():
			return ""
		if key_event.shift_pressed and name != "Shift":
			return "SHIFT+" + name
		return name
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
		# Generated Popover closes on Escape only; outside activation is an
		# app-level dismissal policy (`# NOT FSDS`-ledgered in the README).
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
	dim.color = Color(orion.palette["ink"], 0.78)
	dim.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	dim.mouse_filter = Control.MOUSE_FILTER_STOP
	modal_layer.add_child(dim)
	modal_panel = UI.panel("panel", "signal", 0.0)
	UI.place(modal_panel, 360, 280, 560, 240)
	modal_layer.add_child(modal_panel)
	var margin := UI.vbox(10)
	modal_panel.add_child(UI.margin(margin, 24, 22, 24, 22))
	margin.add_child(UI.micro("CONTROLLER REMAP", "signalHot"))
	modal_action_label = UI.title("", 24, "boneBright")
	margin.add_child(modal_action_label)
	margin.add_child(UI.label("PRESS ANY KEY OR BUTTON", 18, 700, "signalHot", 1.0))
	margin.add_child(UI.micro("ESC CANCELS · BINDING IS UNCHANGED", "muted"))
	margin.add_child(UI.vspace(8))
	var actions := UI.hbox(8)
	actions.alignment = BoxContainer.ALIGNMENT_END
	var cancel = DSFactory.action("CANCEL", "outline", "small")
	cancel.activated.connect(cancel_remap)
	actions.add_child(cancel)
	margin.add_child(actions)
