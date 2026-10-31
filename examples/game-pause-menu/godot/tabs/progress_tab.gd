extends Control
class_name ProgressTab

## Progress tab: faction list plus a left-edge dossier drawer.
##
## Generated components used here: Text/Divider (dossier body on bone paper),
## Badge (tier / locked / part rarity tags), Button (SHOP PARTS + CLOSE).
## The list rows, reputation bars and the drawer surface are engine-native app
## chrome (`# NOT FSDS` at each site).

var app: PauseMenuApp
var rows: Dictionary = {}
var drawer: Control
var drawer_header: HBoxContainer
var drawer_scroll: ScrollContainer
var drawer_body: VBoxContainer
var drawer_actions: HBoxContainer
var drawer_open := false
var shop_button
var shop_note: Label
var _tween: Tween
var _pending_faction: Dictionary = {}


func _ready() -> void:
	custom_minimum_size = PauseMenuApp.BODY_SIZE
	add_child(_build_ground())
	_build_list()
	_build_drawer()


func _build_ground() -> Control:
	var ground := UI.frame("panel", "rule", false)
	UI.place(ground, 0, 0, PauseMenuApp.BODY_SIZE.x, PauseMenuApp.BODY_SIZE.y)
	return ground


func _build_list() -> void:
	var header := UI.hbox(14)
	UI.place(header, 24, 14, 1200, 24)
	add_child(header)
	header.add_child(UI.micro("FACTIONS", "boneBright"))
	header.add_child(UI.micro("%d ORGANIZATIONS · ARES BASIN STANDING" % app.fixtures.factions.get("factions", []).size(), "muted"))
	header.add_child(UI.spacer())
	header.add_child(UI.micro("LOCKED ROWS STATE THEIR UNLOCK REQUIREMENT", "muted"))

	var rule := UI.rule("rule", 1)
	UI.place(rule, 24, 46, 1200, 1)
	add_child(rule)

	var y := 56.0
	var index := 0
	for faction in app.fixtures.factions.get("factions", []):
		_add_faction_row(faction, y, index)
		y += 100.0
		index += 1


func _add_faction_row(faction: Dictionary, y: float, index: int) -> void:
	var faction_id := str(faction.get("id", ""))
	# NOT FSDS: no List/ListItem/Row component is admitted on the Godot target;
	# the faction row is an engine-native Button with lane-local chrome.
	var row := Button.new()
	row.name = "FactionRow_" + faction_id
	row.focus_mode = Control.FOCUS_ALL
	row.custom_minimum_size = Vector2(1200, 96)
	row.position = Vector2(24, y)
	row.size = Vector2(1200, 96)
	row.add_theme_stylebox_override("normal", app.orion.flat(app.orion.color("panel"), app.orion.color("rule"), 1, 0.0))
	row.add_theme_stylebox_override("hover", app.orion.flat(app.orion.color("raised"), app.orion.color("signal"), 1, 0.0))
	row.add_theme_stylebox_override("pressed", app.orion.flat(app.orion.color("raised"), app.orion.color("signal"), 1, 0.0))
	row.add_theme_stylebox_override("focus", StyleBoxEmpty.new())
	add_child(row)
	rows[faction_id] = row

	var inner := UI.hbox(18)
	inner.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	inner.offset_left = 18
	inner.offset_right = -18
	inner.offset_top = 10
	inner.offset_bottom = -10
	row.add_child(inner)

	inner.add_child(UI.micro("%02d" % (index + 1), "muted"))
	var tone := ColorRect.new()
	tone.color = app.orion.color("signal") if bool(faction.get("unlocked", false)) else app.orion.color("alert")
	tone.custom_minimum_size = Vector2(3, 0)
	tone.size_flags_vertical = Control.SIZE_EXPAND_FILL
	inner.add_child(tone)

	var identity := UI.vbox(2)
	identity.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	inner.add_child(identity)
	var name_row := UI.hbox(10)
	name_row.add_child(UI.title(str(faction.get("name", "")), 17, "boneBright"))
	name_row.add_child(DSFactory.badge(
		"TIER " + str(int(faction.get("tier", 0))),
		app.orion.surface["raised"],
		app.orion.palette["bone"],
		app.orion.surface["ruleStrong"]
	))
	if not bool(faction.get("unlocked", false)):
		name_row.add_child(DSFactory.badge("LOCKED", app.orion.palette["alert"], app.orion.palette["boneBright"], app.orion.palette["alert"]))
	identity.add_child(name_row)
	identity.add_child(UI.micro(str(faction.get("tagline", "")), "muted"))

	var standing := UI.vbox(4)
	standing.custom_minimum_size = Vector2(250, 0)
	inner.add_child(standing)
	if bool(faction.get("unlocked", false)):
		var rep := int(faction.get("reputation", 0))
		var rep_max := maxi(int(faction.get("reputationMax", 1)), 1)
		var bar := ProgressBar.new()
		bar.min_value = 0.0
		bar.max_value = float(rep_max)
		bar.value = float(rep)
		bar.show_percentage = false
		bar.custom_minimum_size = Vector2(250, 6)
		standing.add_child(bar)
		var rep_row := UI.hbox(8)
		rep_row.add_child(UI.micro("REPUTATION", "muted"))
		rep_row.add_child(UI.spacer())
		rep_row.add_child(UI.label("%d / %d" % [rep, rep_max], 12, 600, "bone"))
		standing.add_child(rep_row)
	else:
		standing.add_child(UI.micro("UNLOCK REQUIRES", "muted"))
		var requirement := UI.label(str(faction.get("requirement", "")), 12, 700, "alert")
		requirement.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		standing.add_child(requirement)

	inner.add_child(UI.micro("OPEN DOSSIER →", "signalHot"))
	UI.ignore_mouse(inner)
	row.pressed.connect(app.select_faction.bind(faction_id))


func _build_drawer() -> void:
	# NOT FSDS: no Drawer/Sheet component is admitted on the Godot target; the
	# dossier surface is a lane-local sliding panel with the Orion paper ground.
	drawer = UI.frame("bone", "ruleStrong", true)
	drawer.name = "FactionDrawer"
	drawer.clip_contents = true
	drawer.custom_minimum_size = Vector2(560, PauseMenuApp.BODY_SIZE.y)
	UI.place(drawer, -560, 0, 560, PauseMenuApp.BODY_SIZE.y)
	drawer.visible = false
	add_child(drawer)
	# Fixed chrome: header row and the SHOP PARTS action row stay visible at
	# 1280x800; only the dossier body scrolls.
	drawer_header = UI.hbox(10)
	UI.place(drawer_header, 24, 16, 512, 26)
	drawer.add_child(drawer_header)
	drawer_scroll = ScrollContainer.new()
	drawer_scroll.name = "DrawerScroll"
	drawer_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	UI.place(drawer_scroll, 24, 50, 512, 442)
	drawer.add_child(drawer_scroll)
	drawer_body = UI.vbox(7)
	drawer_body.custom_minimum_size = Vector2(500, 0)
	drawer_body.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	drawer_scroll.add_child(drawer_body)
	drawer_actions = UI.hbox(12)
	UI.place(drawer_actions, 24, 502, 512, 56)
	drawer.add_child(drawer_actions)


func open_drawer(faction: Dictionary) -> void:
	_pending_faction = faction
	_populate_drawer(faction)
	drawer_open = true
	drawer.visible = true
	if _tween != null and _tween.is_valid():
		_tween.kill()
	drawer.position = Vector2(-560, 0)
	_tween = create_tween()
	_tween.set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_CUBIC)
	_tween.tween_property(drawer, "position", Vector2(0, 0), 0.16)


func close_drawer() -> void:
	drawer_open = false
	if _tween != null and _tween.is_valid():
		_tween.kill()
	_tween = create_tween()
	_tween.set_ease(Tween.EASE_IN).set_trans(Tween.TRANS_CUBIC)
	_tween.tween_property(drawer, "position", Vector2(-560, 0), 0.12)
	_tween.tween_callback(func() -> void: drawer.visible = false)


func _populate_drawer(faction: Dictionary) -> void:
	_clear_children(drawer_header)
	_clear_children(drawer_body)
	_clear_children(drawer_actions)
	var detail: Dictionary = faction.get("detail", {})
	var unlocked := bool(faction.get("unlocked", false))

	drawer_header.add_child(UI.micro("FACTION DOSSIER · TIER " + str(int(faction.get("tier", 0))), "moss"))
	drawer_header.add_child(UI.spacer())
	var close = DSFactory.action("CLOSE", "ink-outline", "small")
	close.activated.connect(app.close_drawer)
	drawer_header.add_child(close)

	drawer_body.add_child(UI.label(str(faction.get("name", "")), 23, 800, "ink"))
	drawer_body.add_child(UI.micro(str(faction.get("tagline", "")), "moss"))
	drawer_body.add_child(_divider())
	# Generated Text on the paper dossier. The explicit 464px minimum keeps its
	# autowrapped label out of the one-character collapse and its inner width
	# stable against the drawer's 512px body. (`# NOT FSDS: no min-width channel`)
	var description_text = DSFactory.text(str(detail.get("description", "")), "body")
	description_text.custom_minimum_size = Vector2(464, 0)
	drawer_body.add_child(description_text)
	var history_text = DSFactory.text(str(detail.get("history", "")), "caption")
	history_text.custom_minimum_size = Vector2(464, 0)
	drawer_body.add_child(history_text)

	drawer_body.add_child(UI.micro("PERKS", "moss"))
	for perk in detail.get("perks", []):
		# Simple bullet lines use native ink labels: generated Text as an HBox
		# child collapses to one character per line on this target.
		var perk_row := UI.hbox(8)
		var tick := ColorRect.new()
		tick.color = app.orion.color("signal")
		tick.custom_minimum_size = Vector2(4, 4)
		tick.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		perk_row.add_child(tick)
		var perk_label := UI.label(str(perk), 12, 500, "ink")
		perk_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		perk_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		perk_row.add_child(perk_label)
		drawer_body.add_child(perk_row)

	drawer_body.add_child(UI.micro("PARTS", "moss"))
	var table_header := UI.hbox(10)
	table_header.add_child(_table_label("PART", 210))
	table_header.add_child(_table_label("COST", 90))
	table_header.add_child(_table_label("RARITY", 100))
	table_header.add_child(_table_label("SIZE", 60))
	drawer_body.add_child(table_header)
	for part in detail.get("parts", []):
		var part_row := UI.hbox(10)
		var name_label := UI.label(str(part.get("name", "")), 12, 600, "ink")
		name_label.custom_minimum_size = Vector2(210, 0)
		part_row.add_child(name_label)
		var cost := UI.label(UI.fmt_int(int(part.get("cost", 0))) + " CR", 12, 600, "ink")
		cost.custom_minimum_size = Vector2(90, 0)
		part_row.add_child(cost)
		var rarity_colors := app.orion.rarity(str(part.get("rarity", "")))
		part_row.add_child(DSFactory.badge(str(part.get("rarity", "")).to_upper(), rarity_colors["bg"], rarity_colors["fg"], rarity_colors["border"]))
		var size_holder := Control.new()
		size_holder.custom_minimum_size = Vector2(60, 18)
		var pips := UI.pips(int(part.get("size", 0)), 2, "signal")
		pips.position = Vector2(0, 2)
		size_holder.add_child(pips)
		part_row.add_child(size_holder)
		drawer_body.add_child(part_row)

	shop_button = DSFactory.action("SHOP PARTS", "primary", "medium")
	shop_button.disabled = not unlocked
	shop_button.activated.connect(_on_shop_parts_pressed.bind(str(faction.get("id", ""))))
	drawer_actions.add_child(shop_button)
	shop_note = UI.label("", 11, 600, "alert" if not unlocked else "moss")
	shop_note.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	shop_note.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	shop_note.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	shop_note.text = ("LOCKED · " + str(faction.get("requirement", ""))) if not unlocked else "PARTS OPEN TO ALL CREWS"
	drawer_actions.add_child(shop_note)


func _clear_children(node: Node) -> void:
	for child in node.get_children():
		node.remove_child(child)
		child.queue_free()


func _table_label(text: String, width: float) -> Label:
	var label := UI.micro(text, "moss")
	label.custom_minimum_size = Vector2(width, 0)
	return label


func _divider() -> Control:
	var divider = DSFactory.divider()
	divider.custom_minimum_size = Vector2(0, 1)
	return divider


func _on_shop_parts_pressed(faction_id: String) -> void:
	# Shop navigation is outside this example app's surface; the button's enabled
	# state is the behavior under test.
	if shop_note != null:
		shop_note.text = "SHOP OPEN · " + faction_id.to_upper()


func shop_enabled() -> bool:
	return shop_button != null and not shop_button.disabled
