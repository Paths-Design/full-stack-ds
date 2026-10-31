extends Control
class_name ProgressTab

## Parity PROGRESS tab: 1232x552 roster panel (5 rows) plus the 560x552 paper
## dossier drawer that overlays the roster's left side when a faction is selected.
##
## Generated components: Badge (tier/status/rarity chips), Button (dossier close
## + SHOP PARTS). Roster rows, reputation bars and drawer surface are lane-local
## native fallbacks (`# NOT FSDS` at each site).

var app: PauseMenuApp
var rows: Dictionary = {}
var meta_label: Label
var drawer: Control
var drawer_body: Control
var drawer_open := false
var shop_button
var shop_note: Label
var _tween: Tween
var _origin: Vector2
var _list_panel: Control


func _ready() -> void:
	custom_minimum_size = Vector2(float(app.parity.panels["content"]["w"]) + float(app.parity.panels["content"]["x"]) * 2.0, float(app.parity.panels["content"]["h"]))
	_origin = Vector2(0.0, float(app.parity.panels["content"]["y"]))
	_build_list()
	_build_drawer()


func _local(json_rect: Dictionary) -> Rect2:
	return UI.local(json_rect, _origin)


func _build_list() -> void:
	var rect := _local(app.parity.progress["listPanel"])
	_list_panel = Control.new()
	_list_panel.name = "RosterPanel"
	UI.place_rect(_list_panel, rect)
	add_child(_list_panel)
	var frame := UI.frame("charcoal", "rule")
	frame.position = Vector2.ZERO
	frame.size = rect.size
	frame.custom_minimum_size = rect.size
	_list_panel.add_child(frame)
	var factions: Array = app.fixtures.factions.get("factions", [])
	var accessible := 0
	for faction in factions:
		if bool(faction.get("unlocked", false)):
			accessible += 1
	meta_label = UI.panel_header(
		_list_panel,
		rect.size.x,
		str(app.parity.progress["listTitle"]),
		"%d TRACKED · %d ACCESSIBLE" % [factions.size(), accessible]
	)

	var rows_data: Dictionary = app.parity.progress["rows"]
	var panel_origin := _origin + rect.position
	var row_x := float(rows_data["x"]) - panel_origin.x
	var first_y := float(rows_data["firstY"]) - panel_origin.y
	var row_h := float(rows_data["rowH"])
	var width := float(rows_data["width"])
	var index := 0
	for faction in factions:
		_add_faction_row(faction, row_x, first_y + index * row_h, width, row_h, rows_data)
		index += 1


func _add_faction_row(faction: Dictionary, row_x: float, row_y: float, width: float, row_h: float, rows_data: Dictionary) -> void:
	var faction_id := str(faction.get("id", ""))
	# NOT FSDS: no List/ListItem row component is admitted; engine-native row.
	var row := Button.new()
	row.name = "FactionRow_" + faction_id
	row.focus_mode = Control.FOCUS_ALL
	UI.place(row, row_x, row_y, width, row_h)
	row.add_theme_stylebox_override("normal", app.orion.flat(app.orion.color("charcoal"), Color.TRANSPARENT, 0, 0.0))
	row.add_theme_stylebox_override("hover", app.orion.flat(app.orion.color("graphite"), Color.TRANSPARENT, 0, 0.0))
	row.add_theme_stylebox_override("pressed", app.orion.flat(app.orion.color("graphite"), Color.TRANSPARENT, 0, 0.0))
	row.add_theme_stylebox_override("focus", StyleBoxEmpty.new())
	row.pressed.connect(app.select_faction.bind(faction_id))
	_list_panel.add_child(row)
	rows[faction_id] = row

	var unlocked := bool(faction.get("unlocked", false))
	var accent_color := app.orion.color("signal") if unlocked else app.orion.color("alert")
	var accent := ColorRect.new()
	accent.color = accent_color
	UI.place(accent, 0, 0, float(rows_data["accentW"]), row_h)
	accent.mouse_filter = Control.MOUSE_FILTER_IGNORE
	row.add_child(accent)

	var panel_origin := _origin + _local(app.parity.progress["listPanel"]).position
	var name_label := UI.label(str(faction.get("name", "")), app.parity.type_size("rowLabel"), 700, "boneBright", 0.0)
	UI.place(
		name_label,
		float(rows_data["nameX"]) - panel_origin.x,
		float(rows_data["nameY"]),
		520,
		18
	)
	row.add_child(name_label)
	var tagline := UI.sub(str(faction.get("tagline", "")), "muted")
	UI.place(tagline, float(rows_data["nameX"]) - panel_origin.x, float(rows_data["taglineY"]), 620, 14)
	row.add_child(tagline)

	var rep_x := float(rows_data["repBarX"]) - panel_origin.x
	var rep_label_text := ""
	if unlocked:
		var rep := int(faction.get("reputation", 0))
		var rep_max := maxi(int(faction.get("reputationMax", 1)), 1)
		rep_label_text = "REPUTATION %d / %d" % [rep, rep_max]
		var bar := UI.progress_bar(float(rows_data["repBarW"]), float(rows_data["repBarH"]), float(rep), float(rep_max))
		UI.place(bar, rep_x, float(rows_data["repBarY"]), float(rows_data["repBarW"]), float(rows_data["repBarH"]))
		row.add_child(bar)
	else:
		rep_label_text = str(faction.get("requirement", ""))
		var requirement := UI.sub(rep_label_text, "alert")
		UI.place(requirement, rep_x, float(rows_data["repBarY"]) - 16.0, 320, 14)
		row.add_child(requirement)
	if unlocked:
		var rep_label := UI.sub(rep_label_text, "muted")
		UI.place(rep_label, rep_x, float(rows_data["repBarY"]) - 16.0, 260, 14)
		row.add_child(rep_label)

	var status_x := float(rows_data["statusX"]) - panel_origin.x
	var status = null
	if unlocked:
		status = DSFactory.chip("ACCESS", app.parity.color("signal"), app.parity.color("onSignal"), app.parity.color("signal"), float(rows_data["statusW"]), float(rows_data["statusH"]), app.parity.type_size("micro"))
	else:
		status = DSFactory.chip("LOCKED", Color.TRANSPARENT, app.parity.color("alert"), app.parity.color("alert"), float(rows_data["statusW"]), float(rows_data["statusH"]), app.parity.type_size("micro"))
	UI.place(status, status_x, float(rows_data["statusY"]), float(rows_data["statusW"]), float(rows_data["statusH"]))
	row.add_child(status)
	DSFactory.prepare_chip(status)

	var dossier := UI.label(str(rows_data.get("dossierText", "OPEN →")), 11, 700, "signal", 0.4)
	dossier.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	var row_right := float(rows_data["x"]) + width - panel_origin.x
	var dossier_x := float(rows_data["dossierX"]) - panel_origin.x
	UI.place(dossier, dossier_x, float(rows_data["dossierY"]), row_right - dossier_x, 14)
	row.add_child(dossier)
	UI.ignore_mouse(row)

	var separator := UI.rule("rule", 1)
	UI.place(separator, row_x, row_y + row_h - 1, width, 1)
	_list_panel.add_child(separator)


func _build_drawer() -> void:
	# NOT FSDS: no Drawer/Sheet component is admitted; lane-local paper overlay.
	var rect := _local(app.parity.progress["drawer"]["rect"])
	drawer = Control.new()
	drawer.name = "FactionDrawer"
	UI.place_rect(drawer, rect)
	drawer.clip_contents = true
	drawer.visible = false
	drawer.set_meta("base_x", rect.position.x)
	add_child(drawer)
	var frame := UI.frame("paper", "ruleStrong")
	frame.position = Vector2.ZERO
	frame.size = rect.size
	frame.custom_minimum_size = rect.size
	drawer.add_child(frame)
	drawer_body = Control.new()
	drawer_body.name = "DrawerBody"
	UI.place(drawer_body, 0, 0, rect.size.x, rect.size.y)
	drawer.add_child(drawer_body)


func open_drawer(faction: Dictionary) -> void:
	_populate_drawer(faction)
	drawer_open = true
	drawer.visible = true
	if _tween != null and _tween.is_valid():
		_tween.kill()
	var base_x := float(drawer.get_meta("base_x"))
	drawer.position = Vector2(base_x - drawer.size.x, 0)
	_tween = create_tween()
	_tween.set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_CUBIC)
	_tween.tween_property(drawer, "position", Vector2(base_x, 0), 0.16)


func close_drawer() -> void:
	drawer_open = false
	if _tween != null and _tween.is_valid():
		_tween.kill()
	_tween = create_tween()
	_tween.set_ease(Tween.EASE_IN).set_trans(Tween.TRANS_CUBIC)
	_tween.tween_property(drawer, "position", Vector2(float(drawer.get_meta("base_x")) - drawer.size.x, 0), 0.12)
	_tween.tween_callback(func() -> void: drawer.visible = false)


func _clear_children(node: Node) -> void:
	for child in node.get_children():
		node.remove_child(child)
		child.queue_free()


func _populate_drawer(faction: Dictionary) -> void:
	_clear_children(drawer_body)
	var detail: Dictionary = faction.get("detail", {})
	var unlocked := bool(faction.get("unlocked", false))
	var drawer_data: Dictionary = app.parity.progress["drawer"]
	var drawer_origin := _local(drawer_data["rect"]).position
	var padding := float(drawer_data.get("padding", 24))

	var header := UI.micro("FACTION DOSSIER · TIER %d" % int(faction.get("tier", 0)), "paperMuted")
	UI.place(header, padding, float(drawer_data["headerY"]) - 176.0, 380, 14)
	drawer_body.add_child(header)

	var close_rect := UI.rect(drawer_data["close"])
	var close_button = DSFactory.action("CLOSE", "paper-outline", close_rect.size.x, close_rect.size.y, 11)
	UI.place(close_button, close_rect.position.x - drawer_origin.x, close_rect.position.y - 176.0, close_rect.size.x, close_rect.size.y)
	close_button.activated.connect(app.close_drawer)
	drawer_body.add_child(close_button)

	var title := UI.title(str(faction.get("name", "")), 28, "ink")
	UI.place(title, padding, float(drawer_data["titleY"]) - 176.0, 512, 36)
	drawer_body.add_child(title)
	var tagline := UI.label(str(faction.get("tagline", "")), app.parity.type_size("rowSub"), 600, "paperMuted", app.orion.micro_spacing())
	UI.place(tagline, padding, float(drawer_data["taglineY"]) - 176.0, 512, 14)
	drawer_body.add_child(tagline)
	var rule := UI.rule("paperMuted", 1)
	UI.place(rule, padding, float(drawer_data["ruleY"]) - 176.0, 512, 1)
	drawer_body.add_child(rule)

	drawer_body.add_child(_drawer_label("BRIEF", padding, float(drawer_data["briefLabelY"]) - 176.0))
	var brief := UI.label(str(detail.get("description", "")), app.parity.type_size("body"), 400, "ink", 0.0)
	brief.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	UI.place(brief, padding, float(drawer_data["briefBodyY"]) - 176.0, 512, 48)
	drawer_body.add_child(brief)

	drawer_body.add_child(_drawer_label("HISTORY", padding, float(drawer_data["historyLabelY"]) - 176.0))
	var history := UI.label(str(detail.get("history", "")), app.parity.type_size("body"), 400, "ink", 0.0)
	history.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	UI.place(history, padding, float(drawer_data["historyBodyY"]) - 176.0, 512, 44)
	drawer_body.add_child(history)

	drawer_body.add_child(_drawer_label("PERKS", padding, float(drawer_data["perksLabelY"]) - 176.0))
	var perk_y := float(drawer_data["perksY"]) - 176.0
	for perk in detail.get("perks", []):
		var perk_label := UI.label("· " + str(perk), 11, 400, "ink", 0.0)
		UI.place(perk_label, padding, perk_y, 512, 16)
		drawer_body.add_child(perk_label)
		perk_y += 18.0

	drawer_body.add_child(_drawer_label("PARTS", padding, float(drawer_data["partsLabelY"]) - 176.0))
	var header_y := float(drawer_data["partsHeaderY"]) - 176.0
	drawer_body.add_child(_part_cell("PART", padding, header_y, 180))
	drawer_body.add_child(_part_cell("COST", padding + 180, header_y, 90))
	drawer_body.add_child(_part_cell("RARITY", padding + 290, header_y, 90))
	drawer_body.add_child(_part_cell("SIZE", padding + 400, header_y, 60))
	var part_y := float(drawer_data["partRowY"]) - 176.0
	var row_height := float(drawer_data["partRowH"])
	for part in detail.get("parts", []):
		var part_name := UI.label(str(part.get("name", "")), 11, 600, "ink", 0.0)
		UI.place(part_name, padding, part_y, 180, row_height - 2)
		drawer_body.add_child(part_name)
		var cost := UI.label(UI.fmt_int(int(part.get("cost", 0))) + " CR", 11, 600, "ink", 0.0)
		UI.place(cost, padding + 180, part_y, 90, row_height - 2)
		drawer_body.add_child(cost)
		var rarity = DSFactory.rarity_chip(str(part.get("rarity", "")), 64, row_height - 2)
		UI.place(rarity, padding + 290, part_y, 64, row_height - 2)
		drawer_body.add_child(rarity)
		DSFactory.prepare_chip(rarity)
		var pips := UI.pips(int(part.get("size", 0)), 2, "signal", 6.0)
		UI.place(pips, padding + 400, part_y + 5, 60, 10)
		drawer_body.add_child(pips)
		part_y += row_height

	var shop_rect := UI.rect(drawer_data["shopButton"])
	shop_button = DSFactory.action("SHOP PARTS", "primary", shop_rect.size.x, shop_rect.size.y, 13)
	shop_button.disabled = not unlocked
	shop_button.activated.connect(_on_shop_parts_pressed.bind(str(faction.get("id", ""))))
	UI.place(shop_button, padding, shop_rect.position.y - 176.0, shop_rect.size.x, shop_rect.size.y)
	drawer_body.add_child(shop_button)

	shop_note = UI.label("", 11, 600, "moss" if unlocked else "alert", 0.0)
	shop_note.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	shop_note.text = "PARTS OPEN TO ALL CREWS" if unlocked else ("LOCKED · " + str(faction.get("requirement", "")))
	UI.place(shop_note, padding + shop_rect.size.x + 16.0, float(drawer_data["shopCaptionY"]) - 176.0, 320, 30)
	drawer_body.add_child(shop_note)


func _drawer_label(text: String, x: float, y: float) -> Label:
	var label := UI.micro(text, "paperMuted")
	UI.place(label, x, y, 200, 14)
	return label


func _part_cell(text: String, x: float, y: float, width: float) -> Label:
	var label := UI.micro(text, "paperMuted")
	UI.place(label, x, y, width, 14)
	return label


func _on_shop_parts_pressed(faction_id: String) -> void:
	if shop_note != null:
		shop_note.text = "SHOP OPEN · " + faction_id.to_upper()


func shop_enabled() -> bool:
	return shop_button != null and not shop_button.disabled
