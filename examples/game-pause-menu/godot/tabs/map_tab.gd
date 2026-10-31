extends Control
class_name MapTab

## Parity MAP tab: 872x552 map panel (40px header + 840x480 sage field) and the
## 344x552 icon-visibility panel with eight 64x32 generated switches.
##
## Generated components: Switch (8 icon filters), Icon (row glyphs), Badge
## (session chip in the shell). Map plot/markers/panel chrome are lane-local
## native fallbacks (`# NOT FSDS` at each site).

var app: PauseMenuApp
var field: MapField
var switches: Dictionary = {}
var meta_label: Label
var map_panel: Control
var icon_panel: Control
var _origin: Vector2


func _ready() -> void:
	custom_minimum_size = Vector2(float(app.parity.panels["content"]["w"]) + float(app.parity.panels["content"]["x"]) * 2.0, float(app.parity.panels["content"]["h"]))
	_origin = Vector2(0.0, float(app.parity.panels["content"]["y"]))
	_build_map_panel()
	_build_icon_panel()


func _local(json_rect: Dictionary) -> Rect2:
	return UI.local(json_rect, _origin)


func _build_map_panel() -> void:
	var rect := _local(app.parity.map["mapPanel"])
	map_panel = Control.new()
	map_panel.name = "MapPanel"
	UI.place_rect(map_panel, rect)
	add_child(map_panel)
	var frame := UI.frame("charcoal", "rule")
	frame.position = Vector2.ZERO
	frame.size = rect.size
	frame.custom_minimum_size = rect.size
	map_panel.add_child(frame)
	var title_data: Dictionary = app.parity.map["mapTitle"]
	UI.panel_header(map_panel, rect.size.x, str(title_data["text"]), str(title_data["meta"]))

	field = MapField.new()
	field.name = "MapField"
	field.icons = app.fixtures.map_icons.get("icons", [])
	field.visibility = app.icon_visible.duplicate()
	field.nav_target = app.nav_target
	var panel_rect := _local(app.parity.map["mapPanel"])
	var field_rect := _local(app.parity.map["field"])
	UI.place_rect(field, Rect2(field_rect.position - panel_rect.position, field_rect.size))
	map_panel.add_child(field)
	for icon in app.fixtures.map_icons.get("icons", []):
		var marker: MarkerButton = field.markers.get(str(icon.get("id", "")))
		if marker != null:
			marker.pressed.connect(app.open_marker.bind(str(icon.get("id", ""))))


func _build_icon_panel() -> void:
	var rect := _local(app.parity.map["iconPanel"])
	icon_panel = Control.new()
	icon_panel.name = "IconPanel"
	UI.place_rect(icon_panel, rect)
	add_child(icon_panel)
	var frame := UI.frame("charcoal", "rule")
	frame.position = Vector2.ZERO
	frame.size = rect.size
	frame.custom_minimum_size = rect.size
	icon_panel.add_child(frame)
	meta_label = UI.panel_header(icon_panel, rect.size.x, str(app.parity.map["iconPanelTitle"]), "")

	var rows: Dictionary = app.parity.map["iconRows"]
	var panel_origin := _origin + rect.position
	var row_x := float(rows["x"]) - panel_origin.x
	var first_y := float(rows["firstY"]) - panel_origin.y
	var row_h := float(rows["rowH"])
	var icon_size := float(rows["iconSize"])
	var name_x := float(rows["nameX"]) - panel_origin.x
	var switch_x := float(rows["switchX"]) - panel_origin.x
	var switch_y := float(rows["switchY"])
	var width := float(rows["width"])
	var index := 0
	for icon in app.fixtures.map_icons.get("icons", []):
		_add_icon_row(icon, row_x, first_y + index * row_h, row_h, icon_size, name_x, switch_x, switch_y, width)
		index += 1

	var note_data: Dictionary = app.parity.map["iconPanelNote"]
	var note := UI.sub(str(note_data["text"]), "muted")
	UI.place(
		note,
		float(note_data["x"]) - panel_origin.x,
		float(note_data["y"]) - panel_origin.y,
		width,
		14
	)
	icon_panel.add_child(note)
	_refresh_meta()


func _add_icon_row(icon: Dictionary, row_x: float, row_y: float, row_h: float, icon_size: float, name_x: float, switch_x: float, switch_y: float, width: float) -> void:
	var icon_id := str(icon.get("id", ""))
	var glyph = DSFactory.icon(
		PauseFixtures.glyph_name_for(str(icon.get("icon", ""))),
		icon_size,
		app.orion.color("boneBright")
	)
	UI.place(glyph, row_x, row_y + (row_h - icon_size) / 2.0, icon_size, icon_size)
	icon_panel.add_child(glyph)
	var name_label := UI.label(str(icon.get("label", "")), app.parity.type_size("rowLabel"), 700, "boneBright", 0.0)
	UI.place(name_label, name_x, row_y + float(app.parity.map["iconRows"]["nameY"]), 260, 16)
	icon_panel.add_child(name_label)
	var status := UI.sub("%s · %s KM" % [str(icon.get("status", "")), str(icon.get("distanceKm", ""))], "muted")
	UI.place(status, name_x, row_y + float(app.parity.map["iconRows"]["subY"]), 260, 14)
	icon_panel.add_child(status)

	var toggle_node = DSFactory.toggle()
	var switch_width := float(app.parity.switch_data["width"])
	var switch_height := float(app.parity.switch_data["height"])
	UI.place(toggle_node, switch_x, row_y + switch_y - 4.0, switch_width, switch_height)
	icon_panel.add_child(toggle_node)
	DSFactory.prepare_switch(toggle_node)
	toggle_node.value = "true" if bool(app.icon_visible.get(icon_id, false)) else "false"
	toggle_node.value_changed.connect(_on_icon_switch_changed.bind(icon_id))
	switches[icon_id] = toggle_node
	var separator := UI.rule("rule", 1)
	UI.place(separator, row_x, row_y + row_h - 1, width, 1)
	icon_panel.add_child(separator)


func _on_icon_switch_changed(next: String, icon_id: String) -> void:
	app.set_icon_visibility(icon_id, next == "true")
	_refresh_meta()


func _refresh_meta() -> void:
	if meta_label == null:
		return
	var icons: Array = app.fixtures.map_icons.get("icons", [])
	var plotted := 0
	for icon in icons:
		if bool(app.icon_visible.get(str(icon.get("id", "")), false)):
			plotted += 1
	meta_label.text = ("%d/%d PLOTTED" % [plotted, icons.size()]).to_upper()


func apply_state(visibility: Dictionary, nav_target: String) -> void:
	if field != null:
		field.apply_state(visibility, nav_target)
	for icon_id in switches:
		var toggle_node = switches[icon_id]
		var next := "true" if bool(visibility.get(icon_id, false)) else "false"
		if str(toggle_node.value) != next:
			toggle_node.value = next
	_refresh_meta()


func switch_for(icon_id: String):
	return switches.get(icon_id)


func marker_node(icon_id: String) -> Control:
	if field == null:
		return null
	return field.markers.get(icon_id)
