extends Node

## Headless interaction tests for the Orion N5 pause menu (Godot lane).
##
## Run:
##   /Applications/Godot.app/Contents/MacOS/Godot --headless --path <lane> \
##     res://tests/test_main.tscn
##
## The script boots the real main scene, drives the same interaction entry points
## the UI wires to (generated component channels, emitted widget signals, viewport
## input events) and asserts observable app/component state. Exit code 0 = all
## checks passed, 1 = at least one failed. Fixture-corpus failure paths are also
## covered.

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


func key_event(keycode: int) -> InputEventKey:
	var event := InputEventKey.new()
	event.keycode = keycode
	event.physical_keycode = keycode
	event.pressed = true
	return event


## Dispatch a key the way the platform would. Returns "viewport_push_input" when
## the SceneTree delivered the event to the app's `_unhandled_key_input`; on
## headless runs that do not route OS input, falls back to calling the same handler
## directly and reports "direct_handler_fallback" so the report can say which path
## actually exercised the binding capture.
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
	check(app.fixtures.commander.get("callsign", "") == "ORION N5", "commander callsign")
	check(app.fixtures.map_icons.get("icons", []).size() == 8, "map icon count")
	check(app.fixtures.factions.get("factions", []).size() == 5, "faction count")
	check(app.fixtures.abilities.get("abilities", []).size() == 10, "ability count")
	check(app.fixtures.vehicle.get("slots", []).size() == 6, "vehicle slot count")
	check(app.settings_tab != null, "settings tab constructed")

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
		var marker: Control = app.map_tab.marker_node("beacon-05")
		var marker_rect: Rect2 = marker.get_global_rect()
		check(absf(rect.position.x - marker_rect.position.x) < 520.0, "I3 popover anchored near marker")
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
		check(nav_marker.is_nav_target, "I4 marker highlighted as nav target")
		check(app.marker_popover.value == "false", "I4 popover closes after setting target")
	# reset for later captures/tests
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
	check(absf(app.progress_tab.drawer.position.x) < 0.5, "I5 drawer entered from the left edge", str(app.progress_tab.drawer.position))
	check(app.progress_tab.shop_button != null and not app.progress_tab.shop_button.disabled, "I5 SHOP PARTS enabled for unlocked faction")
	check(count_badges(app.progress_tab.drawer_body) >= 3, "I5 parts rarity tags rendered")
	check(find_label_containing("The guild owns every viable freight lane"), "I5 description rendered")
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
	check(style_border(card).is_equal_approx(app.orion.palette["signal"]), "I7 selected card gets signal border")
	check(app.compatible_slots("overclock") == ["CORE-A", "CORE-B", "UTIL-A"], "I7 size-2 ability compatible slot set", str(app.compatible_slots("overclock")))
	for slot_id in ["CORE-A", "CORE-B", "UTIL-A"]:
		check(style_border(app.abilities_tab.slot_node(slot_id)).is_equal_approx(app.orion.palette["clear"]), "I7 compatible slot highlighted %s" % slot_id)
	for slot_id in ["AUX-A", "AUX-B", "UTIL-B"]:
		check(style_border(app.abilities_tab.slot_node(slot_id)).is_equal_approx(app.orion.surface["rule"]), "I7 incompatible slot not highlighted %s" % slot_id)


# --- I8: compatible install (and replace) -----------------------------------

func test_i8() -> void:
	# Fixture baseline: CORE-A carries THERMAL SHIELD, AUX-A carries THREADING.
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
	check(style_border(app.abilities_tab.slot_node("UTIL-B")).is_equal_approx(app.orion.palette["alert"]), "I9 reject border applied")
	await wait_frames(60) # let the reject timer clear


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
	check(app.settings_tab.general_chips["autoSave"].text == ("ON" if before == "false" else "OFF"), "I11 row chip reflects value")
	toggle_node.activate()
	await wait_frames(2)
	check(str(toggle_node.value) == before, "I11 switch flips back")
	check(flips[0] == 2, "I11 second flip counted once", str(flips[0]))


# --- I12: controller slider -------------------------------------------------

func test_i12() -> void:
	var slider: HSlider = app.settings_tab.controller_slider("lookSensitivity")
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
	var master: HSlider = app.settings_tab.audio_slider("master")
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
	check(app.settings_tab.preview_background_color().is_equal_approx(app.orion.palette["signal"]), "I14 preview strip background follows swatch")
	check(app.settings_tab.preview_text_color().is_equal_approx(app.orion.palette["ink"]), "I14 preview text contrast adapts")
	check(app.settings_tab.preview_text().contains("DUST FRONT"), "I14 preview strip shows preview line")
	check(app.settings_tab.preview_tag.text.contains("SIGNAL"), "I14 preview tag shows background/language", app.settings_tab.preview_tag.text)


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
	var file := FileAccess.open("user://godot-lane-test-results.json", FileAccess.WRITE)
	if file != null:
		file.store_string(JSON.stringify(result, "  "))
		file.close()
		print("TESTS_RESULT_FILE %s" % ProjectSettings.globalize_path("user://godot-lane-test-results.json"))
	if failures.is_empty():
		print("TESTS_OK")
		get_tree().quit(0)
	else:
		print("TESTS_FAILED_EXIT")
		get_tree().quit(1)
