extends Control
class_name MapTab

## Map tab: stylized plot (lane-local drawing), icon-visibility filter rows using
## the generated Switch, and the detailed commander stat row.
##
## Generated components used here: Switch (one per fixture icon), Text + Divider
## (map chrome on the light telemetry ground). Markers/map drawing/stat chrome
## are engine-native app layers (`# NOT FSDS` at each site).

var app: PauseMenuApp
var field: MapField
var switches: Dictionary = {}
var contacts_label: Label


func _ready() -> void:
	custom_minimum_size = PauseMenuApp.BODY_SIZE
	add_child(_build_ground())
	_build_map()
	_build_stat_row()
	_build_icon_panel()


func _build_ground() -> Control:
	var ground := UI.frame("panel", "rule", false)
	UI.place(ground, 0, 0, PauseMenuApp.BODY_SIZE.x, PauseMenuApp.BODY_SIZE.y)
	return ground


func _build_map() -> void:
	field = MapField.new()
	field.name = "MapField"
	field.sector = str(app.fixtures.map_icons.get("sector", ""))
	field.scale_label = "SCALE " + str(app.fixtures.map_icons.get("scale", ""))
	field.icons = app.fixtures.map_icons.get("icons", [])
	field.visibility = app.icon_visible.duplicate()
	field.nav_target = app.nav_target
	field.position = Vector2(16, 16)
	field.size = Vector2(800, 384)
	field.custom_minimum_size = Vector2(800, 384)
	add_child(field)
	for icon in app.fixtures.map_icons.get("icons", []):
		var marker: MarkerButton = field.markers.get(str(icon.get("id", "")))
		if marker != null:
			marker.pressed.connect(app.open_marker.bind(str(icon.get("id", ""))))
	# Lane-local corner ticks bracket the plot region.
	var ticks := CornerTicks.new()
	ticks.color = app.orion.surface["ruleStrong"]
	UI.place(ticks, 16, 16, 800, 384)
	ticks.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(ticks)


func _build_stat_row() -> void:
	var frame := UI.frame("panel", "rule", true)
	UI.place(frame, 16, 412, 800, 144)
	add_child(frame)
	var margin := UI.vbox(6)
	UI.place(margin, 16, 14, 768, 116)
	frame.add_child(margin)

	var cells := UI.hbox(24)
	margin.add_child(cells)
	var commander: Dictionary = app.fixtures.commander
	var rank: Dictionary = commander.get("rank", {})
	var earnings: Dictionary = commander.get("earnings", {})
	var followers: Dictionary = commander.get("followers", {})

	cells.add_child(_stat_cell("RANKING", str(rank.get("label", "")), "%d" % int(rank.get("level", 0)), "LEVEL"))
	cells.add_child(UI.vrule("rule", 1))
	cells.add_child(_stat_cell("EARNINGS", "%s CR" % UI.fmt_int(int(earnings.get("credits", 0))), "", ""))
	cells.add_child(UI.vrule("rule", 1))
	cells.add_child(_stat_cell("FOLLOWERS", UI.fmt_int(int(followers.get("total", 0))), "", ""))
	cells.add_child(UI.vrule("rule", 1))
	var position_cell := UI.vbox(2)
	position_cell.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	position_cell.add_child(UI.micro("GLOBAL POSITION", "muted"))
	position_cell.add_child(UI.heavy("#%d" % int(rank.get("globalPosition", 0)), 22, "boneBright"))
	position_cell.add_child(UI.micro(str(rank.get("percentile", "")), "signalHot"))
	cells.add_child(position_cell)

	var progress_row := UI.hbox(12)
	margin.add_child(progress_row)
	progress_row.add_child(UI.micro("RANK PROGRESSION", "muted"))
	var bar := ProgressBar.new()
	bar.min_value = 0.0
	bar.max_value = float(rank.get("nextLevelAt", 1))
	bar.value = float(rank.get("points", 0))
	bar.show_percentage = false
	bar.custom_minimum_size = Vector2(300, 8)
	progress_row.add_child(bar)
	progress_row.add_child(UI.label("%s / %s XP" % [UI.fmt_int(int(rank.get("points", 0))), UI.fmt_int(int(rank.get("nextLevelAt", 0)))], 11, 600, "bone"))
	var trend := UI.micro("%s %s · PENDING %s CR" % [followers.get("trend", ""), followers.get("period", ""), UI.fmt_int(int(earnings.get("pending", 0)))], "clear")
	progress_row.add_child(UI.spacer())
	progress_row.add_child(trend)


func _stat_cell(caption: String, value: String, suffix: String, suffix_caption: String) -> VBoxContainer:
	var cell := UI.vbox(2)
	cell.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	cell.add_child(UI.micro(caption, "muted"))
	var row := UI.hbox(6)
	row.add_child(UI.heavy(value, 22, "boneBright"))
	if not suffix.is_empty():
		row.add_child(UI.micro(suffix, "muted"))
	cell.add_child(row)
	if not suffix_caption.is_empty():
		cell.add_child(UI.micro(suffix_caption, "muted"))
	return cell


func _build_icon_panel() -> void:
	var frame := UI.frame("raised", "rule", true)
	UI.place(frame, 832, 16, 400, 540)
	add_child(frame)

	var header := UI.hbox(8)
	UI.place(header, 16, 14, 368, 18)
	frame.add_child(header)
	header.add_child(UI.micro("ICON VISIBILITY", "boneBright"))
	header.add_child(UI.spacer())
	contacts_label = UI.micro("", "muted")
	header.add_child(contacts_label)

	var rule := UI.rule("rule", 1)
	UI.place(rule, 16, 40, 368, 1)
	frame.add_child(rule)

	var row_y := 48.0
	for icon in app.fixtures.map_icons.get("icons", []):
		_add_icon_row(frame, icon, row_y)
		row_y += 56.0

	var footer_note := UI.micro("FILTER OVER THE MAP FIELD · FIXTURE DATA IS NOT MUTATED", "muted")
	footer_note.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	UI.place(footer_note, 16, 500, 368, 34)
	frame.add_child(footer_note)
	_refresh_contacts()


func _add_icon_row(frame: Control, icon: Dictionary, y: float) -> void:
	var icon_id := str(icon.get("id", ""))
	var kind_bar := ColorRect.new()
	kind_bar.color = app.orion.kind_color(str(icon.get("kind", "")))
	UI.place(kind_bar, 16, y + 8, 3, 30)
	kind_bar.mouse_filter = Control.MOUSE_FILTER_IGNORE
	frame.add_child(kind_bar)

	var labels := UI.vbox(1)
	UI.place(labels, 28, y + 2, 290, 44)
	frame.add_child(labels)
	labels.add_child(UI.micro(str(icon.get("label", "")), "bone"))
	labels.add_child(UI.micro("%s · %s KM" % [str(icon.get("status", "")), str(icon.get("distanceKm", ""))], "muted"))

	# Generated Switch drives the marker visibility filter.
	var visibility_switch = DSFactory.toggle("")
	visibility_switch.name = "Switch_" + icon_id
	visibility_switch.custom_minimum_size = Vector2(44, 40)
	UI.place(visibility_switch, 332, y + 6, 44, 40)
	frame.add_child(visibility_switch)
	visibility_switch.value = "true" if bool(app.icon_visible.get(icon_id, false)) else "false"
	visibility_switch.value_changed.connect(_on_icon_switch_changed.bind(icon_id))
	switches[icon_id] = visibility_switch

	var separator := UI.rule("rule", 1)
	UI.place(separator, 16, y + 50, 368, 1)
	frame.add_child(separator)


func _on_icon_switch_changed(next: String, icon_id: String) -> void:
	app.set_icon_visibility(icon_id, next == "true")
	_refresh_contacts()


func _refresh_contacts() -> void:
	if contacts_label == null:
		return
	var plotted := 0
	for icon in app.fixtures.map_icons.get("icons", []):
		if bool(app.icon_visible.get(str(icon.get("id", "")), false)):
			plotted += 1
	contacts_label.text = "%d / %d PLOTTED" % [plotted, app.fixtures.map_icons.get("icons", []).size()]


func apply_state(visibility: Dictionary, nav_target: String) -> void:
	if field != null:
		field.apply_state(visibility, nav_target)
	for icon_id in switches:
		var toggle_node = switches[icon_id]
		var next := "true" if bool(visibility.get(icon_id, false)) else "false"
		if str(toggle_node.value) != next:
			toggle_node.value = next
	_refresh_contacts()


func switch_for(icon_id: String):
	return switches.get(icon_id)


func marker_node(icon_id: String) -> Control:
	if field == null:
		return null
	return field.markers.get(icon_id)
