extends Control
class_name SettingsTab

## Parity SETTINGS tab: four 608x268 panels in a 2x2 grid.
##
## Generated components: Switch (5 General rows) and Button (6 remap binding
## buttons). Sliders, dropdowns, colour swatches, preview strip and modal are
## lane-local native fallbacks (`# NOT FSDS` at each site) driven by the parity
## JSON geometry.

var app: PauseMenuApp
var general_switches: Dictionary = {}
var controller_sliders: Dictionary = {}
var controller_labels: Dictionary = {}
var remap_buttons: Dictionary = {}
var audio_sliders: Dictionary = {}
var audio_labels: Dictionary = {}
var audio_option: OptionButton
var subtitle_option: OptionButton
var swatch_buttons: Dictionary = {}
var preview_panel: PanelContainer
var preview_label: Label
var preview_tag: Label
var _origin: Vector2
var _panels: Dictionary = {}


func _ready() -> void:
	custom_minimum_size = Vector2(float(app.parity.panels["content"]["w"]) + float(app.parity.panels["content"]["x"]) * 2.0, float(app.parity.panels["content"]["h"]))
	_origin = Vector2(0.0, float(app.parity.panels["content"]["y"]))
	var panel_defs: Array = app.parity.settings["panels"]
	var by_id: Dictionary = {}
	for panel_def in panel_defs:
		by_id[str(panel_def["id"])] = panel_def
	_build_general(by_id["general"])
	_build_controller(by_id["controller"])
	_build_remap(by_id["remap"])
	_build_audio(by_id["audio"])


func _local(json_rect: Dictionary) -> Rect2:
	return UI.local(json_rect, _origin)


func _panel_rect_for(panel_id: String) -> Dictionary:
	for panel_def in app.parity.settings["panels"]:
		if str(panel_def["id"]) == panel_id:
			return panel_def["rect"]
	return {}


func _build_panel(panel_def: Dictionary, header_height := 40.0) -> Dictionary:
	var rect := _local(panel_def["rect"])
	var panel := Control.new()
	panel.name = "Panel_" + str(panel_def["id"])
	UI.place_rect(panel, rect)
	add_child(panel)
	var frame := UI.frame(str(app.parity.panels["elevatedBackground"]), "rule")
	frame.position = Vector2.ZERO
	frame.size = rect.size
	frame.custom_minimum_size = rect.size
	panel.add_child(frame)
	var meta := _panel_header(panel, rect.size.x, str(panel_def["title"]), str(panel_def["meta"]), header_height)
	_panels[str(panel_def["id"])] = panel
	return {"panel": panel, "rect": rect, "meta": meta}


func _panel_header(parent: Control, width: float, title_text: String, meta_text: String, header_height: float) -> Label:
	var padding := float(app.parity.panels.get("padding", 16))
	var strip := UI.rect_node(str(app.parity.panels["elevatedBackground"]))
	UI.place(strip, 0, 0, width, header_height)
	parent.add_child(strip)
	var title_label := UI.panel_title(title_text)
	UI.place(title_label, padding, (header_height - 18) / 2.0, width - padding * 2, 16)
	parent.add_child(title_label)
	var meta_label := UI.panel_meta(meta_text)
	meta_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	UI.place(meta_label, padding, (header_height - 16) / 2.0, width - padding * 2, 14)
	parent.add_child(meta_label)
	var rule_node := UI.rule("rule", 1)
	UI.place(rule_node, 0, header_height - 1, width, 1)
	parent.add_child(rule_node)
	return meta_label


# --- General -----------------------------------------------------------------

func _build_general(panel_def: Dictionary) -> void:
	var built := _build_panel(panel_def)
	var panel: Control = built["panel"]
	var width := float(panel_def["rect"]["w"])
	var row_h := float(app.parity.settings["rowH"])
	var first_y := float(app.parity.settings["firstRowY"]) - float(panel_def["rect"]["y"])
	var switches_data := app.parity.switch_data
	var switch_w := float(switches_data["width"])
	var switch_h := float(switches_data["height"])
	var index := 0
	for toggle in app.fixtures.settings.get("general", []):
		var toggle_id := str(toggle.get("id", ""))
		var row_y := first_y + index * row_h
		var name_label := UI.label(str(toggle.get("label", "")), app.parity.type_size("rowLabel"), 700, "boneBright", 0.0)
		UI.place(name_label, 16, row_y + 4, width - 120, 16)
		panel.add_child(name_label)
		var description := UI.sub(str(toggle.get("description", "")), "muted")
		UI.place(description, 16, row_y + 20, width - 120, 14)
		panel.add_child(description)
		var toggle_node = DSFactory.toggle()
		UI.place(toggle_node, width - 16 - switch_w, row_y + (row_h - switch_h) / 2.0 - 4.0, switch_w, switch_h)
		panel.add_child(toggle_node)
		DSFactory.prepare_switch(toggle_node)
		toggle_node.value = "true" if bool(app.general_values.get(toggle_id, false)) else "false"
		toggle_node.value_changed.connect(_on_general_changed.bind(toggle_id))
		general_switches[toggle_id] = toggle_node
		var separator := UI.rule("rule", 1)
		UI.place(separator, 16, row_y + row_h - 1, width - 32, 1)
		panel.add_child(separator)
		index += 1


func _on_general_changed(next: String, toggle_id: String) -> void:
	app.set_general(toggle_id, next == "true")


# --- Controller --------------------------------------------------------------

func _build_controller(panel_def: Dictionary) -> void:
	var built := _build_panel(panel_def)
	var panel: Control = built["panel"]
	var width := float(panel_def["rect"]["w"])
	var row_h := float(app.parity.settings["rowH"])
	var first_y := float(app.parity.settings["firstRowY"]) - float(panel_def["rect"]["y"])
	var slider_data: Dictionary = app.parity.settings["slider"]
	var index := 0
	for setting in app.fixtures.settings.get("controller", []):
		var setting_id := str(setting.get("id", ""))
		var row_y := first_y + index * row_h
		var name_label := UI.label(str(setting.get("label", "")), app.parity.type_size("rowLabel"), 700, "boneBright", 0.0)
		UI.place(name_label, 16, row_y + 4, 240, 16)
		panel.add_child(name_label)
		var description := UI.sub(str(setting.get("description", "")), "muted")
		description.autowrap_mode = TextServer.AUTOWRAP_OFF
		description.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
		UI.place(description, 16, row_y + 24, 176, 14)
		panel.add_child(description)
		# NOT FSDS: no Slider component is admitted on the Godot target.
		var slider := ParitySlider.new()
		slider.name = "ControllerSlider_" + setting_id
		slider.configure(float(setting["min"]), float(setting["max"]), float(setting["step"]), float(app.controller_values.get(setting_id, 0)), float(slider_data["w"]))
		UI.place(slider, 200, row_y + 12, float(slider_data["w"]), 20)
		slider.value_changed.connect(_on_controller_changed.bind(setting_id))
		panel.add_child(slider)
		var value_label := UI.label("", app.parity.type_size("value"), 700, "boneBright", 0.0)
		value_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
		UI.place(value_label, width - 16 - 84, row_y + 4, 84, 20)
		value_label.text = "%d%s" % [int(slider.value), str(setting.get("unit", ""))]
		panel.add_child(value_label)
		controller_sliders[setting_id] = slider
		controller_labels[setting_id] = value_label
		var separator := UI.rule("rule", 1)
		UI.place(separator, 16, row_y + row_h - 1, width - 32, 1)
		panel.add_child(separator)
		index += 1


func _on_controller_changed(value: float, setting_id: String) -> void:
	app.set_controller(setting_id, value)


# --- Remap -------------------------------------------------------------------

func _build_remap(panel_def: Dictionary) -> void:
	var built := _build_panel(panel_def)
	var panel: Control = built["panel"]
	var width := float(panel_def["rect"]["w"])
	var row_h := float(app.parity.settings["remapRowH"])
	# JSON `remapFirstRowY` is inconsistent with the panel rect (212 is above the
	# remap panel); the lane uses the same 36px content inset as the audio panel.
	var first_y := 36.0
	var binding_size: Dictionary = app.parity.settings["bindingButton"]
	var index := 0
	for action in app.fixtures.settings.get("remap", []):
		var action_id := str(action.get("id", ""))
		var row_y := first_y + index * row_h
		var name_label := UI.label(str(action.get("label", "")), 11, 700, "boneBright", 0.0)
		UI.place(name_label, 16, row_y + 2, 240, 16)
		panel.add_child(name_label)
		var binding = DSFactory.action(
			str(app.remap_bindings.get(action_id, "")),
			"binding",
			float(binding_size["w"]),
			float(binding_size["h"]),
			11
		)
		binding.name = "RemapButton_" + action_id
		UI.place(binding, width - 16 - float(binding_size["w"]), row_y + 4, float(binding_size["w"]), float(binding_size["h"]))
		binding.activated.connect(app.open_remap.bind(action_id))
		panel.add_child(binding)
		remap_buttons[action_id] = binding
		var separator := UI.rule("rule", 1)
		UI.place(separator, 16, row_y + row_h - 1, width - 32, 1)
		panel.add_child(separator)
		index += 1


# --- Audio & subtitles -------------------------------------------------------

func _build_audio(panel_def: Dictionary) -> void:
	# Audio rows start 36px below the panel top in the JSON, so this panel's header
	# strip is 36px tall rather than the standard 40px.
	var built := _build_panel(panel_def, 36.0)
	var panel: Control = built["panel"]
	var width := float(panel_def["rect"]["w"])
	var row_h := float(app.parity.settings["audioRowH"])
	var first_y := float(app.parity.settings["audioFirstRowY"]) - float(panel_def["rect"]["y"])
	var slider_data: Dictionary = app.parity.settings["slider"]
	var audio: Dictionary = app.fixtures.settings.get("audio", {})
	var index := 0
	for slider_data_item in audio.get("sliders", []):
		var slider_id := str(slider_data_item.get("id", ""))
		var row_y := first_y + index * row_h
		var name_label := UI.label(str(slider_data_item.get("label", "")), app.parity.type_size("rowLabel"), 700, "boneBright", 0.0)
		UI.place(name_label, 16, row_y + 4, 130, 16)
		panel.add_child(name_label)
		# NOT FSDS: no Slider component is admitted on the Godot target.
		var slider := ParitySlider.new()
		slider.name = "AudioSlider_" + slider_id
		slider.configure(0.0, 100.0, 5.0, float(app.audio_values.get(slider_id, 0)), float(slider_data["w"]))
		UI.place(slider, 150, row_y + 4, float(slider_data["w"]), 20)
		slider.value_changed.connect(_on_audio_slider_changed.bind(slider_id))
		panel.add_child(slider)
		var value_label := UI.label("", app.parity.type_size("value"), 700, "boneBright", 0.0)
		value_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
		UI.place(value_label, width - 16 - 80, row_y + 4, 80, 20)
		value_label.text = "%d%%" % int(slider.value)
		panel.add_child(value_label)
		audio_sliders[slider_id] = slider
		audio_labels[slider_id] = value_label
		index += 1

	var audio_panel_rect := UI.rect(panel_def["rect"])
	var language_label_y := float(app.parity.settings["languageLabelY"]) - audio_panel_rect.position.y
	var dropdown_y := float(app.parity.settings["dropdownY"]) - audio_panel_rect.position.y
	var dropdown_h := float(app.parity.settings["dropdownH"])
	audio_option = _build_language_dropdown(panel, audio.get("audioLanguage", {}), 16.0, language_label_y, dropdown_y, dropdown_h, true)
	subtitle_option = _build_language_dropdown(panel, audio.get("subtitleLanguage", {}), 232.0, language_label_y, dropdown_y, dropdown_h, false)
	_build_background_swatches(panel, audio.get("subtitleBackground", {}))
	_build_preview(panel, str(audio.get("previewLine", "")))
	apply_subtitle_background()
	apply_audio_languages()


func _build_language_dropdown(parent: Control, config: Dictionary, x: float, label_y: float, control_y: float, control_h: float, is_audio: bool) -> OptionButton:
	var label := UI.micro(str(config.get("label", "")), "muted")
	UI.place(label, x, label_y, 200, 12)
	parent.add_child(label)
	# NOT FSDS: no Select/Dropdown component is admitted on this target.
	var dropdown_data: Dictionary = app.parity.settings["dropdown"]
	var option := OptionButton.new()
	option.name = "AudioLanguage" if is_audio else "SubtitleLanguage"
	var options: Array = config.get("options", [])
	for option_index in range(options.size()):
		option.add_item(str(options[option_index]))
	var selected := options.find(str(config.get("value", "")))
	option.selected = maxi(selected, 0)
	UI.place(option, x, control_y, float(dropdown_data["w"]), control_h)
	if is_audio:
		option.item_selected.connect(app.set_audio_language)
	else:
		option.item_selected.connect(app.set_subtitle_language)
	parent.add_child(option)
	return option


func _build_background_swatches(parent: Control, config: Dictionary) -> void:
	var swatch_data: Dictionary = app.parity.settings["swatch"]
	var settings_data: Dictionary = app.parity.settings
	var audio_panel_rect := UI.rect(app.parity.settings["panels"][3]["rect"])
	var swatch_y := float(settings_data["swatchY"]) - audio_panel_rect.position.y
	var swatch_h := float(settings_data["swatchH"])
	var label_y := float(settings_data["swatchLabelY"]) - audio_panel_rect.position.y
	var options: Array = config.get("options", [])
	var x := 16.0
	var gap := float(swatch_data["gap"])
	for option in options:
		var option_id := str(option.get("id", ""))
		# NOT FSDS: no ColorPicker/Swatch component is admitted on this target.
		var button := Button.new()
		button.name = "Swatch_" + option_id
		UI.place(button, x, swatch_y, float(swatch_data["w"]), swatch_h)
		button.pressed.connect(app.set_subtitle_background.bind(option_id))
		parent.add_child(button)
		swatch_buttons[option_id] = button
		x += float(swatch_data["w"]) + gap
	var label := UI.micro("SUBTITLE BACKGROUND", "muted")
	UI.place(label, 280, label_y, 240, 12)
	parent.add_child(label)
	apply_subtitle_background()


func _build_preview(parent: Control, preview_line: String) -> void:
	var preview_rect := UI.rect(app.parity.settings["preview"])
	preview_panel = PanelContainer.new()
	preview_panel.name = "SubtitlePreview"
	var audio_panel_rect := UI.rect(_panel_rect_for("audio"))
	var local_position := preview_rect.position - audio_panel_rect.position
	UI.place(preview_panel, local_position.x, local_position.y, preview_rect.size.x, preview_rect.size.y)
	parent.add_child(preview_panel)
	var row := UI.hbox(12)
	preview_panel.add_child(row)
	preview_label = UI.label(preview_line, 11, 400, "bone", 0.0)
	preview_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	preview_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	row.add_child(preview_label)
	preview_tag = UI.micro("", "muted")
	row.add_child(preview_tag)


func _on_audio_slider_changed(value: float, slider_id: String) -> void:
	app.set_audio_slider(slider_id, value)


# --- app-driven refreshes ----------------------------------------------------

func apply_general(toggle_id: String, value: bool) -> void:
	var toggle_node = general_switches.get(toggle_id)
	if toggle_node != null:
		var next := "true" if value else "false"
		if str(toggle_node.value) != next:
			toggle_node.value = next


func apply_controller(setting_id: String, value: float) -> void:
	var slider: ParitySlider = controller_sliders.get(setting_id)
	if slider != null:
		slider.set_value_no_signal(value)
	if controller_labels.has(setting_id):
		var unit := ""
		for setting in app.fixtures.settings.get("controller", []):
			if str(setting.get("id", "")) == setting_id:
				unit = str(setting.get("unit", ""))
		controller_labels[setting_id].text = "%d%s" % [int(value), unit]


func apply_remap(action_id: String, binding: String) -> void:
	var button = remap_buttons.get(action_id)
	if button != null:
		button.content = binding


func apply_audio_slider(slider_id: String, value: float) -> void:
	var slider: ParitySlider = audio_sliders.get(slider_id)
	if slider != null:
		slider.set_value_no_signal(value)
	if audio_labels.has(slider_id):
		audio_labels[slider_id].text = "%d%%" % int(value)


func apply_audio_languages() -> void:
	if audio_option != null:
		var audio_index := app.audio_language_options().find(app.audio_language)
		if audio_index >= 0:
			audio_option.selected = audio_index
	if subtitle_option != null:
		var subtitle_index := app.subtitle_language_options().find(app.subtitle_language)
		if subtitle_index >= 0:
			subtitle_option.selected = subtitle_index
	_refresh_preview()


func apply_subtitle_background() -> void:
	for option in app.subtitle_background_options():
		var option_id := str(option.get("id", ""))
		var button: Button = swatch_buttons.get(option_id)
		if button == null:
			continue
		var swatch_color := Color(str(option.get("value", "#000000")))
		var selected := option_id == app.subtitle_background
		var border_width := 2 if selected else 1
		var border_color := app.orion.color("signal") if selected else app.orion.color("ruleStrong")
		button.add_theme_stylebox_override("normal", app.orion.flat(swatch_color, border_color, border_width, 0.0))
		button.add_theme_stylebox_override("hover", app.orion.flat(swatch_color, app.orion.color("boneBright"), 2, 0.0))
		button.add_theme_stylebox_override("pressed", app.orion.flat(swatch_color, app.orion.color("signal"), 2, 0.0))
	_refresh_preview()


func _refresh_preview() -> void:
	if preview_panel == null:
		return
	var background := app.orion.color("charcoal")
	for option in app.subtitle_background_options():
		if str(option.get("id", "")) == app.subtitle_background:
			background = Color(str(option.get("value", "#191917")))
	var text_color := app.parity.contrast_text(background)
	preview_panel.add_theme_stylebox_override("panel", app.orion.flat(background, app.orion.color("ruleStrong"), 1, 4.0))
	preview_label.add_theme_color_override("font_color", text_color)
	preview_tag.add_theme_color_override("font_color", text_color)
	preview_tag.text = str(app.subtitle_background).to_upper()


# --- node accessors used by the interaction tests ----------------------------

func panel_node(panel_id: String) -> Control:
	return _panels.get(panel_id)


func general_switch(toggle_id: String):
	return general_switches.get(toggle_id)


func controller_slider(setting_id: String):
	return controller_sliders.get(setting_id)


func remap_button(action_id: String):
	return remap_buttons.get(action_id)


func audio_slider(slider_id: String):
	return audio_sliders.get(slider_id)


func audio_language_option() -> OptionButton:
	return audio_option


func subtitle_language_option() -> OptionButton:
	return subtitle_option


func swatch(option_id: String) -> Button:
	return swatch_buttons.get(option_id)


func preview_background_color() -> Color:
	var style := preview_panel.get_theme_stylebox("panel")
	return style.bg_color if style is StyleBoxFlat else Color.TRANSPARENT


func preview_text_color() -> Color:
	return preview_label.get_theme_color("font_color")


func preview_text() -> String:
	return preview_label.text
