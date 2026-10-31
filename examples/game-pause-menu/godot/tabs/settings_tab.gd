extends Control
class_name SettingsTab

## Settings tab: four stacked sections inside a scroll region.
##
## Generated components used here: Switch (one per General toggle), Button (one
## binding button per remap action). Sliders, dropdowns, swatches, section chrome
## and the remap modal are engine-native fallbacks (`# NOT FSDS` at each site):
## the Godot allowlist admits no Slider, Select/OptionButton, ColorPicker or
## Dialog/Sheet component.

var app: PauseMenuApp
var general_switches: Dictionary = {}
var general_chips: Dictionary = {}
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
var form_scroll: ScrollContainer


func _ready() -> void:
	custom_minimum_size = PauseMenuApp.BODY_SIZE
	add_child(_build_ground())
	_build_form()


func _build_ground() -> Control:
	var ground := UI.frame("panel", "rule", false)
	UI.place(ground, 0, 0, PauseMenuApp.BODY_SIZE.x, PauseMenuApp.BODY_SIZE.y)
	return ground


func _build_form() -> void:
	# NOT FSDS: no ScrollContainer/field-list component is admitted; the tab uses
	# Godot's native ScrollContainer so stacked sections stay reachable.
	var scroll := ScrollContainer.new()
	scroll.name = "SettingsScroll"
	scroll.position = Vector2.ZERO
	scroll.size = PauseMenuApp.BODY_SIZE
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	add_child(scroll)
	form_scroll = scroll
	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 24)
	margin.add_theme_constant_override("margin_right", 24)
	margin.add_theme_constant_override("margin_top", 18)
	margin.add_theme_constant_override("margin_bottom", 28)
	margin.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.add_child(margin)
	var content := UI.vbox(16)
	content.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	margin.add_child(content)

	content.add_child(_build_general())
	content.add_child(_build_controller())
	content.add_child(_build_remap())
	content.add_child(_build_audio())


func _heading(title: String, detail: String) -> Control:
	var row := UI.hbox(14)
	var title_label := UI.micro(title, "boneBright")
	row.add_child(title_label)
	row.add_child(UI.micro(detail, "muted"))
	row.add_child(UI.spacer())
	var dash := UI.dashed()
	dash.custom_minimum_size = Vector2(240, 1)
	dash.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	row.add_child(dash)
	return row


func _describe(label_text: String, description: String) -> VBoxContainer:
	var column := UI.vbox(1)
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.add_child(UI.label(label_text, 13, 700, "bone"))
	var description_label := UI.label(description, 11, 500, "muted")
	description_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	column.add_child(description_label)
	return column


func _build_general() -> VBoxContainer:
	var section := UI.vbox(8)
	section.add_child(_heading("GENERAL", "PERSONAL PREFERENCES"))
	for toggle in app.fixtures.settings.get("general", []):
		var toggle_id := str(toggle.get("id", ""))
		var row := UI.hbox(16)
		row.add_child(_describe(str(toggle.get("label", "")), str(toggle.get("description", ""))))
		var chip := UI.value_chip(bool(toggle.get("value", false)))
		row.add_child(chip)
		general_chips[toggle_id] = chip
		# Generated Switch (projection of the General toggle).
		var toggle_node = DSFactory.toggle("")
		toggle_node.name = "GeneralSwitch_" + toggle_id
		toggle_node.custom_minimum_size = Vector2(44, 40)
		toggle_node.value = "true" if bool(app.general_values.get(toggle_id, false)) else "false"
		toggle_node.value_changed.connect(_on_general_changed.bind(toggle_id))
		row.add_child(toggle_node)
		general_switches[toggle_id] = toggle_node
		section.add_child(row)
		section.add_child(UI.rule("rule", 1))
	return section


func _on_general_changed(next: String, toggle_id: String) -> void:
	app.set_general(toggle_id, next == "true")


func _build_controller() -> VBoxContainer:
	var section := UI.vbox(8)
	section.add_child(_heading("CONTROLLER", "LOOK, AIM, FEEL · ENGINE-NATIVE HSlider (NO SLIDER COMPONENT ADMITTED)"))
	for setting in app.fixtures.settings.get("controller", []):
		var setting_id := str(setting.get("id", ""))
		var row := UI.hbox(16)
		row.add_child(_describe(str(setting.get("label", "")), str(setting.get("description", ""))))
		# NOT FSDS: the Godot target admits no Slider component; native HSlider.
		var slider := HSlider.new()
		slider.name = "ControllerSlider_" + setting_id
		slider.min_value = float(setting.get("min", 0))
		slider.max_value = float(setting.get("max", 100))
		slider.step = float(setting.get("step", 1))
		slider.value = float(app.controller_values.get(setting_id, 0))
		slider.custom_minimum_size = Vector2(260, 24)
		slider.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		slider.value_changed.connect(_on_controller_changed.bind(setting_id))
		row.add_child(slider)
		var value_label := UI.label("", 12, 700, "bone")
		value_label.custom_minimum_size = Vector2(64, 0)
		value_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
		value_label.text = "%d%s" % [int(slider.value), str(setting.get("unit", ""))]
		row.add_child(value_label)
		controller_sliders[setting_id] = slider
		controller_labels[setting_id] = value_label
		section.add_child(row)
		section.add_child(UI.rule("rule", 1))
	return section


func _on_controller_changed(value: float, setting_id: String) -> void:
	app.set_controller(setting_id, value)


func _build_remap() -> VBoxContainer:
	var section := UI.vbox(8)
	section.add_child(_heading("CONTROLLER REMAP", "ACTIVATE A BINDING, THEN PRESS ANY KEY OR BUTTON"))
	for action in app.fixtures.settings.get("remap", []):
		var action_id := str(action.get("id", ""))
		var row := UI.hbox(16)
		var label_column := UI.vbox(1)
		label_column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		label_column.add_child(UI.label(str(action.get("label", "")), 13, 700, "bone"))
		label_column.add_child(UI.micro("CURRENT BINDING", "muted"))
		row.add_child(label_column)
		var binding = DSFactory.action(str(app.remap_bindings.get(action_id, "")), "outline", "small")
		binding.name = "RemapButton_" + action_id
		binding.custom_minimum_size = Vector2(150, 0)
		binding.activated.connect(app.open_remap.bind(action_id))
		row.add_child(binding)
		remap_buttons[action_id] = binding
		section.add_child(row)
		section.add_child(UI.rule("rule", 1))
	return section


func _build_audio() -> VBoxContainer:
	var section := UI.vbox(10)
	section.add_child(_heading("AUDIO & SUBTITLES", "MIX, LANGUAGE AND SUBTITLE PRESENTATION"))
	var audio: Dictionary = app.fixtures.settings.get("audio", {})
	for slider_data in audio.get("sliders", []):
		var slider_id := str(slider_data.get("id", ""))
		var row := UI.hbox(16)
		row.add_child(_describe(str(slider_data.get("label", "")), "MIX LEVEL"))
		# NOT FSDS: no Slider component on the Godot allowlist; native HSlider.
		var slider := HSlider.new()
		slider.name = "AudioSlider_" + slider_id
		slider.min_value = 0.0
		slider.max_value = 100.0
		slider.step = 5.0
		slider.value = float(app.audio_values.get(slider_id, 0))
		slider.custom_minimum_size = Vector2(260, 24)
		slider.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		slider.value_changed.connect(_on_audio_slider_changed.bind(slider_id))
		row.add_child(slider)
		var value_label := UI.label("%d%s" % [int(slider.value), "%"], 12, 700, "bone")
		value_label.custom_minimum_size = Vector2(64, 0)
		value_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
		row.add_child(value_label)
		audio_sliders[slider_id] = slider
		audio_labels[slider_id] = value_label
		section.add_child(row)
		section.add_child(UI.rule("rule", 1))

	var languages := UI.hbox(28)
	languages.add_child(_build_language_dropdown(audio.get("audioLanguage", {}), true))
	languages.add_child(_build_language_dropdown(audio.get("subtitleLanguage", {}), false))
	section.add_child(languages)

	section.add_child(_build_subtitle_background(audio.get("subtitleBackground", {})))
	section.add_child(_build_preview(str(audio.get("previewLine", ""))))
	return section


func _build_language_dropdown(config: Dictionary, is_audio: bool) -> VBoxContainer:
	var column := UI.vbox(4)
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.add_child(UI.micro(str(config.get("label", "")), "muted"))
	# NOT FSDS: no Select/Dropdown component is admitted on the Godot target;
	# the lane uses the native OptionButton.
	var option := OptionButton.new()
	option.name = "AudioLanguage" if is_audio else "SubtitleLanguage"
	var options: Array = config.get("options", [])
	for index in range(options.size()):
		option.add_item(str(options[index]))
	var selected := options.find(str(config.get("value", "")))
	option.selected = maxi(selected, 0)
	option.custom_minimum_size = Vector2(0, 34)
	if is_audio:
		option.item_selected.connect(app.set_audio_language)
		audio_option = option
	else:
		option.item_selected.connect(app.set_subtitle_language)
		subtitle_option = option
	column.add_child(option)
	return column


func _build_subtitle_background(config: Dictionary) -> VBoxContainer:
	var column := UI.vbox(6)
	column.add_child(UI.micro(str(config.get("label", "")), "muted"))
	var swatches := UI.hbox(8)
	var options: Array = config.get("options", [])
	for option in options:
		var option_id := str(option.get("id", ""))
		# NOT FSDS: no ColorPicker/Swatch component is admitted; lane-local
		# color-block buttons built from the fixture swatch options.
		var button := Button.new()
		button.name = "Swatch_" + option_id
		button.text = str(option.get("label", ""))
		button.custom_minimum_size = Vector2(112, 40)
		button.add_theme_font_override("font", app.orion.font(10, 700, 1.0))
		button.add_theme_font_size_override("font_size", 10)
		var swatch_color := Color(str(option.get("value", "#000000")))
		button.add_theme_color_override("font_color", _contrast_text(swatch_color))
		button.add_theme_color_override("font_hover_color", _contrast_text(swatch_color))
		button.add_theme_color_override("font_pressed_color", _contrast_text(swatch_color))
		button.add_theme_stylebox_override("normal", app.orion.flat(swatch_color, app.orion.color("rule"), 1, 0.0))
		button.add_theme_stylebox_override("hover", app.orion.flat(swatch_color, app.orion.color("boneBright"), 2, 0.0))
		button.add_theme_stylebox_override("pressed", app.orion.flat(swatch_color, app.orion.color("signal"), 2, 0.0))
		button.pressed.connect(app.set_subtitle_background.bind(option_id))
		swatches.add_child(button)
		swatch_buttons[option_id] = button
	column.add_child(swatches)
	return column


func _build_preview(preview_line: String) -> VBoxContainer:
	var column := UI.vbox(4)
	column.add_child(UI.micro("SUBTITLE PREVIEW", "muted"))
	preview_panel = PanelContainer.new()
	preview_panel.name = "SubtitlePreview"
	preview_panel.custom_minimum_size = Vector2(0, 56)
	column.add_child(preview_panel)
	var row := UI.hbox(14)
	preview_panel.add_child(UI.margin(row, 16, 8, 16, 8))
	preview_label = UI.label(preview_line, 13, 600, "bone")
	preview_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	preview_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	row.add_child(preview_label)
	preview_tag = UI.micro("", "muted")
	row.add_child(preview_tag)
	return column


func _contrast_text(background: Color) -> Color:
	# 0.45 keeps near-black copy on the signal-orange swatch (luminance ~0.51)
	# while staying light on ink/charcoal/black swatches.
	var luminance := 0.2126 * background.r + 0.7152 * background.g + 0.0722 * background.b
	return app.orion.color("ink") if luminance > 0.45 else app.orion.color("boneBright")


# --- app-driven refreshes ----------------------------------------------------

func apply_general(toggle_id: String, value: bool) -> void:
	var toggle_node = general_switches.get(toggle_id)
	if toggle_node != null:
		var next := "true" if value else "false"
		if str(toggle_node.value) != next:
			toggle_node.value = next
	if general_chips.has(toggle_id):
		var chip: Label = general_chips[toggle_id]
		chip.text = "ON" if value else "OFF"
		chip.add_theme_color_override("font_color", app.orion.color("signalHot" if value else "muted"))


func apply_controller(setting_id: String, value: float) -> void:
	var slider: HSlider = controller_sliders.get(setting_id)
	if slider != null and not is_equal_approx(slider.value, value):
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
	var slider: HSlider = audio_sliders.get(slider_id)
	if slider != null and not is_equal_approx(slider.value, value):
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
		button.add_theme_stylebox_override("normal", app.orion.flat(
			swatch_color,
			app.orion.color("signal") if selected else app.orion.color("rule"),
			2 if selected else 1,
			0.0
		))
	_refresh_preview()


func _refresh_preview() -> void:
	if preview_panel == null:
		return
	var background := app.orion.color("charcoal")
	for option in app.subtitle_background_options():
		if str(option.get("id", "")) == app.subtitle_background:
			background = Color(str(option.get("value", "#191917")))
	var text_color := _contrast_text(background)
	preview_panel.add_theme_stylebox_override("panel", app.orion.flat(background, app.orion.surface["ruleStrong"], 1, 0.0))
	preview_label.add_theme_color_override("font_color", text_color)
	preview_tag.add_theme_color_override("font_color", text_color)
	preview_tag.text = str(app.subtitle_background).to_upper() + " · " + app.subtitle_language.to_upper()


func _on_audio_slider_changed(value: float, slider_id: String) -> void:
	app.set_audio_slider(slider_id, value)


# --- node accessors used by the interaction tests ----------------------------

func general_switch(toggle_id: String):
	return general_switches.get(toggle_id)


func controller_slider(setting_id: String) -> HSlider:
	return controller_sliders.get(setting_id)


func remap_button(action_id: String):
	return remap_buttons.get(action_id)


func audio_slider(slider_id: String) -> HSlider:
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


func scroll_to(y: float) -> void:
	if form_scroll != null:
		form_scroll.scroll_vertical = int(y)


func scroll_to_bottom() -> void:
	if form_scroll != null:
		form_scroll.scroll_vertical = int(maxf(form_scroll.get_v_scroll_bar().max_value, 0.0))
