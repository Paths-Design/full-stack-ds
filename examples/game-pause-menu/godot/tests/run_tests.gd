extends Node

## Headless interaction + geometry tests for the Orion N5 pause menu (Godot lane).
##
## Run:
##   /Applications/Godot.app/Contents/MacOS/Godot --headless --path <lane> \
##     res://tests/test_main.tscn
##
## Boots the real main scene, drives the same interaction entry points the UI
## wires to (generated component channels, emitted widget signals, viewport input
## events) and asserts observable app/component state. Also asserts the parity
## layout: every panel/row/card/switch box against `fixtures/parity-layout.json`
## and the switch icon colours. Exit code 0 = all checks passed, 1 = failures.
## Fixture-corpus failure paths are covered too.

var app
var passes: Array[String] = []
var failures: Array[String] = []
var input_mode := "unknown"


func _ready() -> void:
	var watchdog := Timer.new()
	watchdog.one_shot = true
	watchdog.wait_time = 120.0
	watchdog.timeout.connect(func() -> void:
		push_error("TESTS_TIMEOUT")
		get_tree().quit(3)
	)
	add_child(watchdog)
	watchdog.start()

	var packed := load("res://main.tscn")
	if packed == null:
		push_error("TESTS_MISSING_MAIN_SCENE")
		get_tree().quit(2)
		return
	app = packed.instantiate()
	add_child(app)
	await wait_frames(6)

	await test_corpus()
	await test_i1()
	await test_geometry()
	await test_parity_pins()
	await test_i2()
	await test_i3_i4()
	await test_i5()
	await test_i6()
	await test_i7()
	await test_i8()
	await test_i9()
	await test_i10()
	await test_i11()
	await test_i12()
	await test_i13()
	await test_i14()
	await test_i15()
	_report()


# --- harness -----------------------------------------------------------------

func check(condition: bool, name: String, detail := "") -> void:
	if condition:
		passes.append(name)
		print("TEST_PASS %s" % name)
	else:
		var message := name if detail.is_empty() else "%s (%s)" % [name, detail]
		failures.append(message)
		print("TEST_FAIL %s" % message)


func wait_frames(count: int) -> void:
	for _index in range(count):
		await get_tree().process_frame


func all_nodes(root: Node, acc: Array) -> Array:
	for child in root.get_children():
		acc.append(child)
		all_nodes(child, acc)
	return acc


func find_label_containing(needle: String) -> bool:
	for node in all_nodes(app, []):
		if node is Label and node.is_visible_in_tree() and str(node.text).contains(needle):
			return true
	return false


func find_action(content: String):
	for node in all_nodes(app, []):
		if node is DSButton and node.is_visible_in_tree() and str(node.content) == content:
			return node
	return null


func find_badge_containing(needle: String) -> bool:
	for node in all_nodes(app, []):
		if node is DSBadge and node.is_visible_in_tree() and str(node.content).contains(needle):
			return true
	return false


func count_badges(root: Node) -> int:
	var total := 0
	for node in all_nodes(root, []):
		if node is DSBadge:
			total += 1
	return total


func style_border(control: Control) -> Color:
	if control == null:
		return Color.MAGENTA
	var box := control.get_theme_stylebox("normal")
	if box is StyleBoxFlat:
		return box.border_color
	return Color.MAGENTA


func style_bg(control: Control) -> Color:
	if control == null:
		return Color.MAGENTA
	var box := control.get_theme_stylebox("normal")
	if box is StyleBoxFlat:
		return box.bg_color
	return Color.MAGENTA


func check_rect(control: Control, json_rect: Dictionary, label: String) -> void:
	if control == null:
		check(false, "%s exists" % label)
		return
	var expected := UI.rect(json_rect)
	var actual := control.get_global_rect()
	var ok := absf(actual.position.x - expected.position.x) <= 1.0 \
		and absf(actual.position.y - expected.position.y) <= 1.0 \
		and absf(actual.size.x - expected.size.x) <= 1.0 \
		and absf(actual.size.y - expected.size.y) <= 1.0
	check(ok, "%s rect matches parity JSON" % label, "expected %s got %s" % [expected, actual])


func key_event(keycode: int) -> InputEventKey:
	var event := InputEventKey.new()
	event.keycode = keycode
	event.physical_keycode = keycode
	event.pressed = true
	return event


## Dispatch a key the way the platform would. Returns "viewport_push_input" when
## the SceneTree delivered the event to the app's `_unhandled_key_input`; on
## headless runs that do not route OS input, falls back to calling the same handler
## directly and reports "direct_handler_fallback".
func dispatch_key(keycode: int) -> String:
	get_viewport().push_input(key_event(keycode))
	await wait_frames(2)
	if app.remap_action.is_empty():
		input_mode = "viewport_push_input"
		return input_mode
	input_mode = "direct_handler_fallback"
	app._unhandled_key_input(key_event(keycode))
	await wait_frames(1)
	return input_mode


# --- corpus ------------------------------------------------------------------

func test_corpus() -> void:
	check(app.fixtures != null and app.fixtures.ok, "corpus loaded", str(app.fixtures.errors if app.fixtures else "no fixtures"))
	check(app.fixtures.errors.is_empty(), "corpus has no errors")
	check(app.parity != null, "parity layout parsed")
	check(app.parity.viewport == Vector2(1280, 800), "parity viewport is 1280x800")
	check(app.parity.switch_data["width"] == 64 and app.parity.switch_data["height"] == 32, "parity switch geometry 64x32")
	check(app.fixtures.commander.get("callsign", "") == "ORION N5", "commander callsign")
	check(app.fixtures.map_icons.get("icons", []).size() == 8, "map icon count")
	check(app.fixtures.factions.get("factions", []).size() == 5, "faction count")
	check(app.fixtures.abilities.get("abilities", []).size() == 10, "ability count")
	check(app.fixtures.vehicle.get("slots", []).size() == 6, "vehicle slot count")

	# Malformed fixtures fail loudly through the lane adapter.
	var bad_json = PauseFixtures.parse_text("map_icons", "{ nope")
	check(not bad_json["ok"] and not bad_json["errors"].is_empty(), "malformed JSON rejected")
	var missing_keys = PauseFixtures.parse_text("commander", "{}")
	check(not missing_keys["ok"] and not missing_keys["errors"].is_empty(), "missing required keys rejected")
	var bad_glyph_text := '{"abilities":[{"id":"x","name":"X","description":"d","rarity":"rare","size":1,"icon":"NoSuchGlyph","stats":{"heat":1},"detail":"d"}]}'
	var bad_glyph = PauseFixtures.parse_text("abilities", bad_glyph_text)
	check(not bad_glyph["ok"] and " ".join(bad_glyph["errors"]).contains("glyph"), "unknown glyph rejected")
	var bad_vehicle = PauseFixtures.parse_text("vehicle", '{"name":"V","chassis":"C","slots":[]}')
	check(not bad_vehicle["ok"], "wrong vehicle slot count rejected")
	var bad_parity = PauseFixtures.parse_text("parity_layout", '{"viewport":{"width":1,"height":1}}')
	check(not bad_parity["ok"] and not bad_parity["errors"].is_empty(), "incomplete parity layout rejected")
	await wait_frames(1)


# --- I1: tab selection -------------------------------------------------------

func _visible_body_keys() -> Array:
	var keys: Array = []
	for item in app.tabs.items:
		if item.body.visible:
			keys.append(str(item.key))
	return keys


func _pressed_tab_keys() -> Array:
	var keys: Array = []
	for item in app.tabs.items:
		if item.button.button_pressed:
			keys.append(str(item.key))
	return keys


func test_i1() -> void:
	for key in ["map", "progress", "abilities", "settings"]:
		app.select_tab(key)
		await wait_frames(2)
		check(str(app.tabs.value) == key, "I1 tabs.value selection %s" % key, str(app.tabs.value))
		check(app.active_tab == key, "I1 app active tab %s" % key, app.active_tab)
		check(_visible_body_keys() == [key], "I1 exactly one body visible for %s" % key, str(_visible_body_keys()))
		check(_pressed_tab_keys() == [key], "I1 exactly one tab styled active for %s" % key, str(_pressed_tab_keys()))


# --- Parity geometry + switch implementation ---------------------------------

func test_geometry() -> void:
	check_rect(app.header, app.parity.header["rect"], "header band")
	check_rect(app.tab_bar, app.parity.tab_bar["rect"], "tab bar band")
	check_rect(app.footer, app.parity.footer["rect"], "footer band")
	check_rect(app.tabs, {"x": 0, "y": 104, "w": 1280, "h": app.tabs.size.y}, "generated Tabs node")

	# Generated Tabs triggers must land on the four 320x56 parity boxes.
	for index in range(app.tabs.items.size()):
		var item: Dictionary = app.tabs.items[index]
		var tab_data: Dictionary = app.parity.tab_bar["tabs"][index]
		var button: Button = item.button
		var expected := Rect2(float(tab_data["x"]), float(app.parity.tab_bar["rect"]["y"]), float(tab_data["w"]), float(app.parity.tab_bar["rect"]["h"]))
		var actual := button.get_global_rect()
		var ok := absf(actual.position.x - expected.position.x) <= 1.0 \
			and absf(actual.position.y - expected.position.y) <= 1.0 \
			and absf(actual.size.x - expected.size.x) <= 1.0 \
			and absf(actual.size.y - expected.size.y) <= 1.0
		check(ok, "tab trigger %s is a 320x56 parity box" % str(tab_data["id"]), "expected %s got %s" % [expected, actual])
		var body: Control = item.body
		check(absf(body.size.x - 1280.0) <= 1.0 and absf(body.size.y - 552.0) <= 1.0, "tab body %s is 1280x552" % str(tab_data["id"]), str(body.size))

	app.select_tab("map")
	await wait_frames(2)
	check_rect(app.map_tab.map_panel, app.parity.map["mapPanel"], "map panel")
	check_rect(app.map_tab.field, app.parity.map["field"], "map field")
	check_rect(app.map_tab.icon_panel, app.parity.map["iconPanel"], "icon visibility panel")

	# Every generated map switch is the 64x32 parity pill with SVG icon overrides.
	for icon in app.fixtures.map_icons.get("icons", []):
		var toggle_node = app.map_tab.switch_for(str(icon.get("id", "")))
		if toggle_node == null:
			check(false, "map switch exists for %s" % str(icon.get("id", "")))
			continue
		var trigger: CheckButton = toggle_node.trigger
		check(absf(trigger.size.x - 64.0) <= 0.5 and trigger.size.y >= 32.0 and trigger.size.y <= 48.0, "map switch %s widget box carries the 64x32 pill" % str(icon.get("id", "")), str(trigger.size))
	var probe_switch = app.map_tab.switch_for("relay-01")
	var checked_texture: Texture2D = probe_switch.trigger.get_theme_icon("checked")
	var unchecked_texture: Texture2D = probe_switch.trigger.get_theme_icon("unchecked")
	check(checked_texture != null and unchecked_texture != null, "switch checked/unchecked SVG icons override the engine defaults")
	var checked_color := checked_texture.get_image().get_pixel(10, 32)
	var unchecked_color := unchecked_texture.get_image().get_pixel(100, 32)
	check(checked_color.is_equal_approx(app.orion.color("signal")), "switch ON track uses signal fill", str(checked_color))
	check(unchecked_color.is_equal_approx(app.orion.color("graphite")), "switch OFF track uses graphite fill", str(unchecked_color))
	check(probe_switch.trigger.button_pressed, "switch ON state is pressed (checked icon)")

	app.select_tab("progress")
	await wait_frames(2)
	check_rect(app.progress_tab._list_panel, app.parity.progress["listPanel"], "faction roster panel")
	app.select_faction("ares-logistics")
	await wait_frames(40)
	check_rect(app.progress_tab.drawer, app.parity.progress["drawer"]["rect"], "faction drawer")
	app.close_drawer()
	await wait_frames(18)

	app.select_tab("abilities")
	await wait_frames(2)
	check_rect(app.abilities_tab._grid_panel, app.parity.abilities["gridPanel"], "ability catalog panel")
	check_rect(app.abilities_tab._detail_panel, app.parity.abilities["detailPanel"], "ability detail panel")
	check_rect(app.abilities_tab.card_node("threading"), {"x": float(app.parity.abilities["cards"]["x"]), "y": float(app.parity.abilities["cards"]["firstY"]), "w": float(app.parity.abilities["cards"]["w"]), "h": float(app.parity.abilities["cards"]["h"])}, "first ability card")
	check_rect(app.abilities_tab.slot_node("CORE-A"), {"x": float(app.parity.abilities["slots"]["x"]), "y": float(app.parity.abilities["slots"]["firstY"]), "w": float(app.parity.abilities["slots"]["w"]), "h": float(app.parity.abilities["slots"]["h"])}, "first loadout slot")

	app.select_tab("settings")
	await wait_frames(2)
	for panel_def in app.parity.settings["panels"]:
		check_rect(app.settings_tab.panel_node(str(panel_def["id"])), panel_def["rect"], "settings %s panel" % str(panel_def["id"]))
	var general_switch = app.settings_tab.general_switch("autoSave")
	check(absf(general_switch.trigger.size.x - 64.0) <= 0.5 and general_switch.trigger.size.y >= 32.0 and general_switch.trigger.size.y <= 48.0, "general switch widget box carries the 64x32 pill", str(general_switch.trigger.size))
	check(app.settings_tab.general_switch("autoSave").trigger.button_pressed, "first general switch ON")
	check(not app.settings_tab.general_switch("performanceOverlay").trigger.button_pressed, "second general switch OFF")
	var off_texture: Texture2D = general_switch.trigger.get_theme_icon("unchecked")
	check(off_texture != null, "general switch has OFF icon override")


# --- Pinned corrections from the first parity review round ---------------------

func test_parity_pins() -> void:
	# OFF switch paints graphite track + boneBright thumb (checked mirror already
	# asserted in test_geometry).
	var probe_switch = app.map_tab.switch_for("rover-07")
	check(probe_switch != null and not probe_switch.trigger.button_pressed, "rover switch is OFF")
	var off_texture: Texture2D = probe_switch.trigger.get_theme_icon("unchecked")
	check(off_texture.get_image().get_pixel(100, 32).is_equal_approx(app.orion.color("graphite")), "switch OFF track uses graphite")
	check(off_texture.get_image().get_pixel(16, 32).is_equal_approx(app.orion.color("boneBright")), "switch OFF thumb uses boneBright")

	# Parity icon art: portable two-letter code tiles (map rows + ability cards).
	var row_tile: Control = app.map_tab.icon_tiles.get("relay-01")
	check(row_tile != null, "map row icon tile exists")
	if row_tile != null:
		var row_art: Dictionary = app.parity.raw["iconArt"]["rowTile"]
		check(row_tile.get_global_rect().size.is_equal_approx(Vector2(float(row_art["size"]), float(row_art["size"]))), "map row icon tile is 16x16", str(row_tile.get_global_rect().size))
		var row_label: Label = null
		for node in all_nodes(row_tile, []):
			if node is Label:
				row_label = node
				break
		check(row_label != null and row_label.text == "IN", "map row icon code is IN for Info", str(row_label.text if row_label else "no label"))
		var row_cell: PanelFrame = row_tile as PanelFrame
		check(row_cell != null and row_cell.bg_color.is_equal_approx(app.orion.color("graphite")) and row_cell.border_color.is_equal_approx(app.orion.color("ruleStrong")), "map row icon tile uses graphite/ruleStrong")
	app.select_tab("abilities")
	await wait_frames(2)
	var card_tile: Control = app.abilities_tab.card_art.get("overclock")
	check(card_tile != null, "ability card art tile exists")
	if card_tile != null:
		var card_art: Dictionary = app.parity.raw["iconArt"]["cardTile"]
		check(card_tile.get_global_rect().size.is_equal_approx(Vector2(float(card_art["size"]), float(card_art["size"]))), "ability card art tile is 40x40", str(card_tile.get_global_rect().size))
		var card_label: Label = null
		for node in all_nodes(card_tile, []):
			if node is Label:
				card_label = node
				break
		check(card_label != null and card_label.text == "OV", "ability card code is OV for OVERCLOCK", str(card_label.text if card_label else "no label"))
	var threading_tile: Control = app.abilities_tab.card_art.get("threading")
	var threading_label: Label = null
	if threading_tile != null:
		for node in all_nodes(threading_tile, []):
			if node is Label:
				threading_label = node
				break
	check(threading_label != null and threading_label.text == "TH", "ability card code is TH for THREADING")
	app.select_tab("map")
	await wait_frames(2)

	# Tab labels: pinned left alignment with a 32px inset.
	var first_tab_button: Button = app.tabs.items[0].button
	check(first_tab_button.alignment == HORIZONTAL_ALIGNMENT_LEFT, "tab labels are left-aligned")
	var tab_box := first_tab_button.get_theme_stylebox("normal")
	check(tab_box is StyleBoxFlat and roundi((tab_box as StyleBoxFlat).content_margin_left) == int(app.parity.tab_bar["labelInset"]), "tab label inset is 32px", str((tab_box as StyleBoxFlat).content_margin_left if tab_box is StyleBoxFlat else -1))

	# Ability card 1 rarity chip: exactly 64x18 at card-relative (8,-9).
	app.select_tab("abilities")
	await wait_frames(2)
	var card: Control = app.abilities_tab.card_node("threading")
	var found_chip: Control = null
	for node in all_nodes(card, []):
		if node is DSBadge and str(node.content) == "RARE":
			found_chip = node
			break
	check(found_chip != null, "ability card rarity chip exists")
	if found_chip != null:
		var chip_rect := found_chip.get_global_rect()
		var expected := Rect2(
			float(app.parity.abilities["cards"]["x"]) + float(app.parity.abilities["cards"]["rarityChip"]["x"]),
			float(app.parity.abilities["cards"]["firstY"]) + float(app.parity.abilities["cards"]["rarityChip"]["y"]),
			float(app.parity.abilities["cards"]["rarityChip"]["w"]),
			float(app.parity.abilities["cards"]["rarityChip"]["h"])
		)
		check(absf(chip_rect.position.x - expected.position.x) <= 1.0 and absf(chip_rect.position.y - expected.position.y) <= 1.0 and absf(chip_rect.size.x - expected.size.x) <= 1.0 and absf(chip_rect.size.y - expected.size.y) <= 1.0, "ability rarity chip is 64x18 at (8,-9)", "expected %s got %s" % [expected, chip_rect])

	# Settings audio sub-layout pins.
	app.select_tab("settings")
	await wait_frames(2)
	var audio_rect := UI.rect(app.parity.settings["panels"][3]["rect"])
	var first_audio: Control = app.settings_tab.audio_slider("master")
	var audio_expected_y := float(app.parity.settings["audioFirstRowY"]) + 4.0
	check(first_audio != null and absf(first_audio.get_global_rect().position.y - audio_expected_y) <= 1.0, "audio slider row sits at the pinned audioFirstRowY", str(first_audio.get_global_rect().position if first_audio else Vector2.ZERO))
	var dropdown: OptionButton = app.settings_tab.audio_language_option()
	check(absf(dropdown.get_global_rect().position.y - float(app.parity.settings["dropdownY"])) <= 1.0, "language dropdown at pinned dropdownY", str(dropdown.get_global_rect().position))
	var swatch: Button = app.settings_tab.swatch("charcoal")
	var swatch_rect := swatch.get_global_rect()
	check(absf(swatch_rect.position.y - float(app.parity.settings["swatchY"])) <= 1.0 and absf(swatch_rect.size.y - float(app.parity.settings["swatchH"])) <= 1.0, "subtitle swatches at pinned swatchY/swatchH", str(swatch_rect))
	var preview_rect: Rect2 = app.settings_tab.preview_panel.get_global_rect()
	var preview_expected := UI.rect(app.parity.settings["preview"])
	check(preview_rect.position.is_equal_approx(preview_expected.position) and preview_rect.size.is_equal_approx(preview_expected.size), "preview strip matches the pinned preview rect", "expected %s got %s" % [preview_expected, preview_rect])

	# Footer nav target is present and right-aligned in every capture state.
	app.apply_capture_state("progress")
	await wait_frames(24)
	check(app.nav_target == "cache-02", "capture states carry the nav target")
	var nav_rect: Rect2 = app.nav_target_label.get_global_rect()
	check(absf(nav_rect.end.x - float(app.parity.footer["navTarget"]["valueRight"])) <= 1.0, "footer nav value right-aligned to valueRight", str(nav_rect))
	var dossier_found := false
	for node in all_nodes(app, []):
		if node is Label and node.is_visible_in_tree() and str(node.text) == "OPEN →":
			dossier_found = true
			break
	check(dossier_found, "roster affordance copy is exactly OPEN →")
	app.close_drawer()
	await wait_frames(30)

	# Controller panel meta comes from the pinned JSON.
	app.select_tab("settings")
	await wait_frames(2)
	check(find_label_containing("LOOK, AIM, FEEL"), "controller panel meta is pinned")


# --- I2: icon visibility filter ---------------------------------------------

func test_i2() -> void:
	app.select_tab("map")
	await wait_frames(2)
	var visibility_switch = app.map_tab.switch_for("relay-01")
	var marker: Control = app.map_tab.marker_node("relay-01")
	var other: Control = app.map_tab.marker_node("cache-02")
	check(visibility_switch != null and marker != null and other != null, "I2 switch and marker nodes exist")
	if visibility_switch == null or marker == null or other == null:
		return
	check(str(visibility_switch.value) == "true" and marker.visible, "I2 marker starts visible")
	var other_before := other.visible
	visibility_switch.activate()
	await wait_frames(2)
	check(str(visibility_switch.value) == "false", "I2 switch value OFF")
	check(not marker.visible, "I2 marker hidden by filter")
	check(other.visible == other_before, "I2 other markers unaffected")
	check(app.icon_visible.get("relay-01") == false, "I2 app filter state updated")
	check(app.fixtures.icon_by_id("relay-01").get("visible") == true, "I2 fixture data not mutated")
	visibility_switch.activate()
	await wait_frames(2)
	check(str(visibility_switch.value) == "true" and marker.visible, "I2 marker restored on ON")


# --- I3 + I4: marker popover + nav target -----------------------------------

func test_i3_i4() -> void:
	app.select_tab("map")
	app.set_nav_target("")
	await wait_frames(2)
	app.open_marker_popover("beacon-05")
	await wait_frames(6)
	check(app.marker_popover.value == "true", "I3 marker popover open")
	check(app.marker_popover.surface != null, "I3 popover surface attached")
	if app.marker_popover.surface != null:
		var rect: Rect2 = app.marker_popover.surface.get_global_rect()
		var inside := rect.position.x >= 0.0 and rect.position.y >= 0.0 and rect.end.x <= 1280.0 and rect.end.y <= 800.0
		check(inside, "I3 popover clamped inside viewport", str(rect))
		var expected := UI.rect(app.parity.map["popover"])
		check(absf(rect.size.x - expected.size.x) <= 1.0 and absf(rect.size.y - expected.size.y) <= 1.0, "I3 popover uses the parity 360x232 surface", str(rect.size))
		var marker: Control = app.map_tab.marker_node("beacon-05")
		check(marker != null, "I3 anchor marker exists")
	check(find_label_containing("DISTRESS BEACON"), "I3 popover shows icon label")
	check(find_label_containing("11.2"), "I3 popover shows distance")
	check(find_label_containing("+1500 CR BOUNTY"), "I3 popover shows reward")
	check(find_label_containing("civilian distress"), "I3 popover shows detail")
	var target_action = find_action("SET AS NAV TARGET")
	check(target_action != null, "I3 popover has SET AS NAV TARGET")
	check(find_action("CLOSE") != null, "I3 popover has close affordance")

	if target_action != null:
		target_action.activated.emit()
		await wait_frames(3)
		check(app.nav_target == "beacon-05", "I4 nav target set from popover")
		check(app.nav_target_label.text.contains("DISTRESS BEACON"), "I4 footer names nav target", app.nav_target_label.text)
		var nav_marker: MarkerButton = app.map_tab.marker_node("beacon-05")
		check(nav_marker.nav_target, "I4 marker highlighted as nav target")
		check(app.marker_popover.value == "false", "I4 popover closes after setting target")
	app.set_nav_target("cache-02")
	await wait_frames(2)


# --- I5 / I6: faction drawer ------------------------------------------------

func test_i5() -> void:
	app.select_tab("progress")
	await wait_frames(2)
	app.select_faction("ares-logistics")
	await wait_frames(24)
	check(app.progress_tab.drawer_open, "I5 drawer open flag")
	check(app.progress_tab.drawer.visible, "I5 drawer visible")
	check(absf(app.progress_tab.drawer.position.x - float(app.parity.progress["drawer"]["rect"]["x"])) < 0.5, "I5 drawer settled at the parity drawer x", str(app.progress_tab.drawer.position))
	check(app.progress_tab.shop_button != null and not app.progress_tab.shop_button.disabled, "I5 SHOP PARTS enabled for unlocked faction")
	check(count_badges(app.progress_tab.drawer_body) >= 3, "I5 parts rarity tags rendered")
	check(find_label_containing("The guild owns every viable freight lane"), "I5 brief rendered")
	check(find_label_containing("Freight lanes cost 20% less"), "I5 perks rendered")
	check(find_label_containing("Cargo Clamp Mk III"), "I5 parts table rendered")
	check(find_label_containing("PARTS OPEN TO ALL CREWS"), "I5 unlocked note rendered")
	check(app.progress_tab.shop_enabled(), "I5 shop_enabled accessor")


func test_i6() -> void:
	app.select_faction("solaris-cartel")
	await wait_frames(24)
	check(app.progress_tab.drawer_open, "I6 locked drawer opens")
	check(app.progress_tab.shop_button != null and app.progress_tab.shop_button.disabled, "I6 SHOP PARTS disabled for locked faction")
	check(find_label_containing("REACH PATHFINDER IV"), "I6 unlock requirement rendered")
	check(find_label_containing("LOCKED"), "I6 locked note rendered")
	app.close_drawer()
	await wait_frames(16)


# --- I7: ability card selection + compatible slots --------------------------

func test_i7() -> void:
	app.select_tab("abilities")
	await wait_frames(2)
	app.select_ability("overclock")
	await wait_frames(2)
	check(app.pending_ability == "overclock", "I7 pending ability set")
	var card: Control = app.abilities_tab.card_node("overclock")
	check(style_border(card).is_equal_approx(app.orion.color("signal")), "I7 selected card gets signal border")
	check(app.compatible_slots("overclock") == ["CORE-A", "CORE-B", "UTIL-A"], "I7 size-2 ability compatible slot set", str(app.compatible_slots("overclock")))
	for slot_id in ["CORE-A", "CORE-B", "UTIL-A"]:
		check(style_border(app.abilities_tab.slot_node(slot_id)).is_equal_approx(app.orion.color("clear")), "I7 compatible slot highlighted %s" % slot_id)
	for slot_id in ["AUX-A", "AUX-B", "UTIL-B"]:
		check(style_border(app.abilities_tab.slot_node(slot_id)).is_equal_approx(app.orion.color("rule")), "I7 incompatible slot not highlighted %s" % slot_id)


# --- I8: compatible install (and replace) -----------------------------------

func test_i8() -> void:
	check(app.fixtures.slot_by_id("AUX-A")["abilityId"] == "threading", "I8 fixture baseline: AUX-A has THREADING")
	app.select_ability("threading")
	await wait_frames(2)
	var aux_b: Dictionary = app.fixtures.slot_by_id("AUX-B")
	check(aux_b["abilityId"] == null, "I8 AUX-B starts empty")
	app.abilities_tab.slot_node("AUX-B").pressed.emit()
	await wait_frames(3)
	check(aux_b["abilityId"] == "threading", "I8 ability installed into compatible slot")
	check(app.installed_slot("threading") == "AUX-A", "I8 installed_slot reports first installed slot")
	check(app.abilities_tab.slot_label("AUX-B").text == "THREADING", "I8 loadout panel updates")
	check(find_badge_containing("INSTALLED"), "I8 installed card marked installed")

	app.select_ability("overclock")
	await wait_frames(2)
	app.abilities_tab.slot_node("CORE-A").pressed.emit()
	await wait_frames(3)
	check(app.fixtures.slot_by_id("CORE-A")["abilityId"] == "overclock", "I8 install replaces existing ability")
	check(app.installed_slot("overclock") == "CORE-A", "I8 replacement card marked installed")


# --- I9: incompatible slot reject -------------------------------------------

func test_i9() -> void:
	check(app.pending_ability == "overclock", "I9 size-2 ability still pending")
	var util_b: Dictionary = app.fixtures.slot_by_id("UTIL-B")
	check(util_b["abilityId"] == null, "I9 incompatible slot starts empty")
	app.abilities_tab.slot_node("UTIL-B").pressed.emit()
	await wait_frames(2)
	check(util_b["abilityId"] == null, "I9 incompatible activation does not install")
	check(app.abilities_tab.reject_labels["UTIL-B"].text != "", "I9 reject state visible", app.abilities_tab.reject_labels["UTIL-B"].text)
	check(style_border(app.abilities_tab.slot_node("UTIL-B")).is_equal_approx(app.orion.color("alert")), "I9 reject border applied")


# --- I10: ability hover popover ---------------------------------------------

func test_i10() -> void:
	app.hover_ability("hardlight-cut", true)
	await wait_frames(6)
	check(app.ability_popover.value == "true", "I10 hover opens ability popover")
	check(find_label_containing("sustained cutting beam"), "I10 hover popover shows description")
	check(find_label_containing("COOLDOWN"), "I10 hover popover shows stat block")
	check(find_badge_containing("EPIC"), "I10 hover popover shows rarity")
	check(find_label_containing("SIZE 2"), "I10 hover popover shows size")
	app.hover_ability("hardlight-cut", false)
	await wait_frames(3)
	check(app.ability_popover.value == "false", "I10 hover-out closes popover")


# --- I11: general switch ----------------------------------------------------

func test_i11() -> void:
	app.select_tab("settings")
	await wait_frames(2)
	var toggle_node = app.settings_tab.general_switch("autoSave")
	check(toggle_node != null, "I11 general switch exists")
	if toggle_node == null:
		return
	var flips := [0]
	toggle_node.value_changed.connect(func(_value: String) -> void: flips[0] += 1)
	var before := str(toggle_node.value)
	toggle_node.activate()
	await wait_frames(2)
	check(str(toggle_node.value) != before, "I11 switch value flips")
	check(flips[0] == 1, "I11 switch flips exactly once", str(flips[0]))
	check(app.general_values["autoSave"] == (before == "false"), "I11 app state mirrors switch")
	toggle_node.activate()
	await wait_frames(2)
	check(str(toggle_node.value) == before, "I11 switch flips back")
	check(flips[0] == 2, "I11 second flip counted once", str(flips[0]))


# --- I12: controller slider -------------------------------------------------

func test_i12() -> void:
	var slider = app.settings_tab.controller_slider("lookSensitivity")
	check(slider != null, "I12 controller slider exists")
	if slider == null:
		return
	slider.value = 60.0
	await wait_frames(2)
	check(is_equal_approx(float(app.controller_values["lookSensitivity"]), 60.0), "I12 slider value reaches app state", str(app.controller_values["lookSensitivity"]))
	check(app.settings_tab.controller_labels["lookSensitivity"].text == "60%", "I12 slider value displayed", app.settings_tab.controller_labels["lookSensitivity"].text)


# --- I13: remap modal wait -> capture, cancel --------------------------------

func test_i13() -> void:
	var binding_button = app.settings_tab.remap_button("interact")
	check(binding_button != null, "I13 remap binding button exists")
	if binding_button == null:
		return
	binding_button.activated.emit()
	await wait_frames(2)
	check(app.remap_action == "interact", "I13 modal waits for input")
	check(app.modal_layer.visible, "I13 modal visible")
	check(find_label_containing("PRESS ANY KEY OR BUTTON"), "I13 modal prompt rendered")
	check(app.remap_bindings["interact"] == "E", "I13 binding unchanged before capture")
	var mode: String = await dispatch_key(KEY_F)
	check(app.remap_action == "", "I13 modal closes after capture (%s)" % mode)
	check(app.remap_bindings["interact"] == "F", "I13 captured key binds action", app.remap_bindings["interact"])
	check(app.settings_tab.remap_button("interact").content == "F", "I13 row shows new binding")
	check(not app.modal_layer.visible, "I13 modal hidden after capture")

	app.open_remap("vehicleBoost")
	await wait_frames(2)
	check(app.remap_action == "vehicleBoost", "I13 second modal opens")
	get_viewport().push_input(key_event(KEY_ESCAPE))
	await wait_frames(2)
	if app.remap_action == "vehicleBoost":
		app._unhandled_key_input(key_event(KEY_ESCAPE))
		await wait_frames(1)
	check(app.remap_action == "", "I13 escape cancels modal")
	check(app.remap_bindings["vehicleBoost"] == "SHIFT", "I13 cancel leaves binding unchanged", app.remap_bindings["vehicleBoost"])
	check(not app.modal_layer.visible, "I13 modal hidden after cancel")


# --- I14: audio, languages, subtitle picker ---------------------------------

func test_i14() -> void:
	var master = app.settings_tab.audio_slider("master")
	check(master != null, "I14 audio slider exists")
	if master == null:
		return
	master.value = 55.0
	await wait_frames(2)
	check(is_equal_approx(float(app.audio_values["master"]), 55.0), "I14 audio slider updates value")
	check(app.settings_tab.audio_labels["master"].text == "55%", "I14 audio value displayed")

	var audio_option: OptionButton = app.settings_tab.audio_language_option()
	audio_option.selected = 2
	audio_option.item_selected.emit(2)
	await wait_frames(2)
	check(app.audio_language == "Français", "I14 audio language changes", app.audio_language)

	var subtitle_option: OptionButton = app.settings_tab.subtitle_language_option()
	subtitle_option.selected = 1
	subtitle_option.item_selected.emit(1)
	await wait_frames(2)
	check(app.subtitle_language == "Español", "I14 subtitle language changes", app.subtitle_language)

	var swatch: Button = app.settings_tab.swatch("signal")
	check(swatch != null, "I14 subtitle background swatch exists")
	if swatch == null:
		return
	swatch.pressed.emit()
	await wait_frames(2)
	check(app.subtitle_background == "signal", "I14 subtitle background updates", app.subtitle_background)
	check(app.settings_tab.preview_background_color().is_equal_approx(app.orion.color("signal")), "I14 preview strip background follows swatch")
	check(app.settings_tab.preview_text_color().is_equal_approx(app.orion.color("ink")), "I14 preview text contrast adapts")
	check(app.settings_tab.preview_text().contains("DUST FRONT"), "I14 preview strip shows preview line")
	check(app.settings_tab.preview_tag.text.contains("SIGNAL"), "I14 preview tag shows background", app.settings_tab.preview_tag.text)


# --- I15: cancel returns to prior state ------------------------------------

func test_i15() -> void:
	# Popover cancellation keeps data unchanged.
	app.select_tab("map")
	app.set_nav_target("cache-02")
	await wait_frames(2)
	app.open_marker_popover("relay-01")
	await wait_frames(6)
	check(app.marker_popover.value == "true", "I15 popover open before cancel")
	var nav_before: String = str(app.nav_target)
	get_viewport().push_input(key_event(KEY_ESCAPE))
	await wait_frames(2)
	if app.marker_popover.value == "true":
		app._unhandled_key_input(key_event(KEY_ESCAPE))
		await wait_frames(1)
	check(app.marker_popover.value == "false", "I15 escape closes popover")
	check(app.nav_target == nav_before, "I15 popover cancel leaves nav target unchanged")

	# Drawer cancellation returns to the list with data unchanged.
	app.select_tab("progress")
	await wait_frames(2)
	app.select_faction("hellforge")
	await wait_frames(24)
	check(app.progress_tab.drawer_open, "I15 drawer open before cancel")
	app.close_drawer()
	await wait_frames(18)
	check(not app.progress_tab.drawer_open, "I15 drawer close flag cleared")
	check(not app.progress_tab.drawer.visible, "I15 drawer hidden after close")
	check(app.drawer_faction == "", "I15 drawer state cleared")
	check(app.fixtures.faction_by_id("hellforge").get("unlocked") == true, "I15 faction data unchanged")


# --- report ------------------------------------------------------------------

func _report() -> void:
	var total := passes.size() + failures.size()
	print("TESTS_TOTAL %d" % total)
	print("TESTS_PASSED %d" % passes.size())
	print("TESTS_FAILED %d" % failures.size())
	print("TESTS_INPUT_DISPATCH %s" % input_mode)
	for failure in failures:
		print("TESTS_FAILURE %s" % failure)
	var result := {
		"total": total,
		"passed": passes.size(),
		"failed": failures.size(),
		"failures": failures,
		"input_dispatch": input_mode,
	}
	var file := FileAccess.open("user://godot-lane-parity-test-results.json", FileAccess.WRITE)
	if file != null:
		file.store_string(JSON.stringify(result, "  "))
		file.close()
		print("TESTS_RESULT_FILE %s" % ProjectSettings.globalize_path("user://godot-lane-parity-test-results.json"))
	if failures.is_empty():
		print("TESTS_OK")
		get_tree().quit(0)
	else:
		print("TESTS_FAILED_EXIT")
		get_tree().quit(1)
