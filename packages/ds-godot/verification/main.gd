extends Control
var rows: Array = []
var failed := false
func check(condition: bool, message: String) -> void:
	if not condition:
		failed = true
		push_error(message)

func make_control(component: String):
	var scene = load("res://addons/full_stack_ds/components/%s/%s.tscn" % [component, component])
	return scene.instantiate()

func _ready() -> void:
	var trace = JSON.parse_string(FileAccess.get_file_as_string("res://traces.json"))
	for case in trace.cases:
		var control = make_control(case.component)
		add_child(control)
		control.controlled = case.get("controlled", false)
		if case.component in ["Accordion", "Tabs"]:
			control.collapsible = true
			for key in ["a", "b", "locked"]:
				var body := Label.new()
				body.text = "Panel " + key
				control.add_item(key, key, body, key == "locked")
		var states: Array = []
		for command in case.commands:
			match command.op:
				"activate": control.activate(command.get("value", ""))
				"disable": control.disabled = true
				"commit": control.value = command.value
			states.append(control.value)
		check(states == case.expected, "Trace mismatch: " + case.id)
		rows.append({"id":case.id,"states":states})
		control.queue_free()
		await get_tree().process_frame
	var probe = make_control("TokenProbe")
	add_child(probe)
	check(probe.theme.get_color("font_color", "Button").is_equal_approx(Color("#123456")), "Changed token did not reach Theme")
	probe.queue_free()
	var prose = make_control("Text")
	add_child(prose)
	prose.content = "Parity sentence"
	prose.variant = "display"
	check(prose.rendered is Label, "Static text did not create a Label")
	if prose.rendered is Label:
		check(prose.rendered.text == "Parity sentence", "Text content was not rendered")
		check(prose.rendered.get_theme_font_size("font_size") == 60, "Display typography did not render at its token size")
		var display_font = prose.rendered.get_theme_font("font")
		check(display_font is FontVariation and display_font.base_font is SystemFont and display_font.base_font.font_weight == 700, "Display font weight did not reach rendered label")
	prose.variant = "caption"
	check(prose.rendered is Label, "Text variant update lost its rendered Label")
	if prose.rendered is Label:
		check(prose.rendered.get_theme_font_size("font_size") == 12, "Caption typography did not change the rendered size")
		check(prose.rendered.get_theme_font("font") is SystemFont and prose.rendered.get_theme_font("font").font_weight == 400, "Caption font weight did not reach rendered label")
		check(prose.rendered.get_theme_constant("line_spacing") == 2, "Caption line height did not reach rendered label")
	rows.append({"id":"text-variant","displayPx":60,"captionPx":12})
	prose.queue_free()
	var divider = make_control("Divider")
	add_child(divider)
	check(divider.rendered is ColorRect, "Rule did not create a rendered rectangle")
	if divider.rendered is ColorRect:
		check(divider.rendered.color.is_equal_approx(Color("#d0d0d0")), "Divider color did not reach rendered rule")
		check(is_equal_approx(divider.rendered.custom_minimum_size.y, 1.0), "Horizontal rule thickness mismatch")
		check(divider.host is MarginContainer and divider.host.get_theme_constant("margin_top") == 8, "Horizontal rule spacing mismatch")
	divider.orientation = "vertical"
	divider.thickness = "4px"
	check(divider.rendered is ColorRect, "Vertical rule update lost its rendered rectangle")
	if divider.rendered is ColorRect:
		check(is_equal_approx(divider.rendered.custom_minimum_size.x, 4.0), "Vertical rule thickness mismatch")
	divider.thickness = "0.5px"
	check(divider.rendered is ColorRect, "Fractional rule update lost its rendered rectangle")
	if divider.rendered is ColorRect:
		check(is_equal_approx(divider.rendered.custom_minimum_size.x, 0.5), "Fractional rule thickness was clamped")
	divider.thickness = "0px"
	check(divider.rendered is ColorRect, "Zero-width rule update lost its rendered rectangle")
	if divider.rendered is ColorRect:
		check(is_equal_approx(divider.rendered.custom_minimum_size.x, 0.0), "Zero-width rule thickness was clamped")
	rows.append({"id":"rule-orientation","verticalPx":4})
	divider.queue_free()
	var tall_frame := Control.new()
	tall_frame.size = Vector2(200, 80)
	add_child(tall_frame)
	var tall_rule = make_control("Divider")
	tall_frame.add_child(tall_rule)
	tall_rule.size = Vector2(200, 80)
	tall_rule.orientation = "vertical"
	tall_rule.thickness = "4px"
	for i in range(2): await get_tree().process_frame
	check(tall_rule.rendered is ColorRect, "Sized vertical rule did not create a rendered rectangle")
	if tall_rule.rendered is ColorRect:
		check(is_equal_approx(tall_rule.rendered.size.x, 4.0), "Vertical rule stretched across its container")
		check(is_equal_approx(tall_rule.rendered.size.y, 80.0), "Vertical rule did not stretch along its container")
	rows.append({"id":"rule-sized-layout","widthPx":tall_rule.rendered.size.x,"heightPx":tall_rule.rendered.size.y})
	tall_frame.queue_free()
	var changed_rule = make_control("RuleProbe")
	add_child(changed_rule)
	check(changed_rule.rendered is ColorRect, "Changed-token rule did not create a rendered rectangle")
	if changed_rule.rendered is ColorRect:
		check(changed_rule.rendered.color.is_equal_approx(Color("#123456")), "Changed token did not reach rendered rule")
	rows.append({"id":"rule-token","color":"#123456"})
	changed_rule.queue_free()
	var action = make_control("Button")
	add_child(action)
	action.content = "Activate"
	action.aria_label = "Activate item"
	action.title = "Opens the item"
	var calls := [0]
	action.activated.connect(func(): calls[0] += 1)
	check(action.rendered is Button and action.rendered.text == "Activate", "Action text was not rendered")
	check(action.rendered.accessibility_name == "Activate item", "Action accessible name did not reach Button")
	check(action.rendered.tooltip_text == "Opens the item", "Action title did not reach Button tooltip")
	check(action.rendered.get_theme_stylebox("normal") is StyleBoxFlat, "Action style did not reach Button")
	check(action.rendered.get_theme_stylebox("normal").bg_color.is_equal_approx(Color("#0566fe")), "Action default background mismatch")
	check(action.rendered.get_theme_stylebox("hover").bg_color.is_equal_approx(Color("#034fd6")), "Action hover token did not reach native state")
	check(action.rendered.get_theme_stylebox("pressed").bg_color.is_equal_approx(Color("#013ab0")), "Action pressed token did not reach native state")
	check(action.rendered.get_theme_stylebox("disabled").bg_color.is_equal_approx(Color("#b8b8b8")), "Action disabled token did not reach native state")
	action.rendered.pressed.emit()
	check(calls[0] == 1, "Action did not emit exactly one activation")
	action.rendered.grab_focus()
	var press := InputEventAction.new()
	press.action = "ui_accept"
	press.pressed = true
	Input.parse_input_event(press)
	await get_tree().process_frame
	var release := InputEventAction.new()
	release.action = "ui_accept"
	release.pressed = false
	Input.parse_input_event(release)
	await get_tree().process_frame
	check(calls[0] == 2, "Focused action did not activate once from ui_accept")
	action.variant = "secondary"
	check(action.rendered.get_theme_stylebox("normal").bg_color.is_equal_approx(Color("#fafafa")), "Action intent did not change background")
	check(action.rendered.get_theme_color("font_color").is_equal_approx(Color("#141414")), "Action intent did not change foreground")
	action.size_axis = "large"
	check(action.rendered.get_theme_font_size("font_size") == 18, "Action size did not change text geometry")
	check(is_equal_approx(action.rendered.custom_minimum_size.y, 48), "Action size did not change minimum height")
	action.token_overrides = {"button.color.background.default":"#123456"}
	check(action.rendered.get_theme_stylebox("normal").bg_color.is_equal_approx(Color("#123456")), "Action token override did not reach rendered Button")
	action.token_overrides = {"button.color.background.default":"#123456", "background-color":"#456789"}
	check(action.rendered.get_theme_stylebox("normal").bg_color.is_equal_approx(Color("#456789")), "Action property override did not outrank token override")
	action.token_overrides = {"button.color.background.default":"#123456", "background-color":"#456789", "button.design.root.background.fill":"#654321"}
	check(action.rendered.get_theme_stylebox("normal").bg_color.is_equal_approx(Color("#654321")), "Action design-slot override did not outrank property and token overrides")
	action.token_overrides = {"button.color.background.default":"#123456"}
	action.loading = true
	check(action.rendered.disabled and action.rendered.text.is_empty() and action.loading_indicator.visible, "Loading did not replace and suppress action")
	action.rendered.pressed.emit()
	check(calls[0] == 2, "Loading action activated")
	action.loading = false
	action.disabled = true
	action.rendered.pressed.emit()
	check(calls[0] == 2 and action.rendered.disabled, "Disabled action activated")
	rows.append({"id":"action-content","activations":calls[0],"largePx":18,"tokenColor":"#123456","precedence":["design-slot","property","token"]})
	action.queue_free()
	var defaulted_action = make_control("DefaultedAction")
	add_child(defaulted_action)
	check(defaulted_action.disabled and defaulted_action.loading, "Authored action defaults did not initialize native state")
	check(defaulted_action.rendered.disabled and defaulted_action.loading_indicator.visible, "Authored action defaults did not reach rendered control")
	defaulted_action.disabled = false
	defaulted_action.loading = false
	check(not defaulted_action.rendered.disabled and not defaulted_action.loading_indicator.visible, "Explicit consumer values did not override authored defaults")
	rows.append({"id":"action-defaults","initialDisabled":true,"initialLoading":true,"consumerOverride":true})
	defaulted_action.queue_free()
	var card_preview = make_control("Card")
	card_preview.position = Vector2(650, 24)
	card_preview.custom_minimum_size.x = 250
	add_child(card_preview)
	var composed_title = make_control("Text")
	card_preview.get_part("header").add_child(composed_title)
	composed_title.content = "Composed heading"
	composed_title.variant = "headline"
	var composed_body = make_control("Text")
	card_preview.get_part("content").add_child(composed_body)
	composed_body.content = "Retained native content"
	var composed_badge = make_control("Badge")
	card_preview.get_part("badge").add_child(composed_badge)
	composed_badge.content = "Ready"
	composed_badge.intent = "danger"
	composed_badge.size_axis = "lg"
	var glyph := ColorRect.new()
	glyph.color = Color("#123456")
	glyph.custom_minimum_size = Vector2(10, 10)
	composed_badge.get_part("icon").add_child(glyph)
	var composed_action = make_control("Button")
	card_preview.get_part("actions").add_child(composed_action)
	composed_action.content = "Use item"
	var composed_calls := [0]
	composed_action.activated.connect(func(): composed_calls[0] += 1)
	var title_id = composed_title.get_instance_id()
	var badge_id = composed_badge.get_instance_id()
	var action_id = composed_action.get_instance_id()
	var glyph_id = glyph.get_instance_id()
	check(card_preview.chrome.get_theme_stylebox("panel").content_margin_left == 16, "Card default padding did not reach native stylebox")
	card_preview.density = "inset"
	check(card_preview.chrome.get_theme_stylebox("panel").content_margin_left == 8, "Card density did not change native padding")
	check(card_preview._properties("root", card_preview._active_rules()).color == "#141414", "A child-part token override leaked into Card root color")
	card_preview.token_overrides = {"card.color.background.default":"#123456"}
	check(card_preview.chrome.get_theme_stylebox("panel").bg_color.is_equal_approx(Color("#123456")), "Card token override did not reach native stylebox")
	card_preview.token_overrides = {"card.color.background.default":"#123456", "background-color":"#456789"}
	check(card_preview.chrome.get_theme_stylebox("panel").bg_color.is_equal_approx(Color("#456789")), "Card property override did not outrank token override")
	card_preview.token_overrides = {"card.color.background.default":"#123456", "background-color":"#456789", "card.design.root.background.fill":"#654321"}
	check(card_preview.chrome.get_theme_stylebox("panel").bg_color.is_equal_approx(Color("#654321")), "Card design slot did not outrank property and token overrides")
	card_preview.token_overrides = {"card.color.background.default":"#123456"}
	check(card_preview.get_part("header").get_child(0).get_instance_id() == title_id, "Card restyle replaced title content")
	check(card_preview.get_part("badge").get_child(0).get_instance_id() == badge_id, "Card restyle replaced Badge")
	check(card_preview.get_part("actions").get_child(0).get_instance_id() == action_id, "Card restyle replaced action")
	check(composed_badge.get_part("icon").get_child(0).get_instance_id() == glyph_id, "Badge restyle replaced composed icon")
	check(composed_badge.chrome.get_theme_stylebox("panel").bg_color.is_equal_approx(Color("#fac2c2")), "Badge danger intent did not change native background")
	composed_badge.intent = "success"
	check(composed_badge.chrome.get_theme_stylebox("panel").bg_color.is_equal_approx(Color("#b3dba7")), "Badge intent update did not change native background")
	composed_badge.intent = "danger"
	check(composed_badge.get_part("icon").get_child(0).get_instance_id() == glyph_id, "Badge intent update replaced composed icon")
	check(composed_badge.content_label.text == "Ready" and composed_badge.content_label.get_theme_font_size("font_size") == 14, "Badge content or large typography did not render")
	check(is_equal_approx(composed_badge.chrome.custom_minimum_size.y, 32), "Badge large minimum height did not render")
	composed_badge.token_overrides = {"badge.color.background.default":"#654321"}
	check(composed_badge.chrome.get_theme_stylebox("panel").bg_color.is_equal_approx(Color("#654321")), "Badge token override did not reach native background")
	composed_action.rendered.pressed.emit()
	check(composed_calls[0] == 1, "Nested action did not reach consumer exactly once")
	check(composed_title.content == "Composed heading" and composed_body.content == "Retained native content", "Card restyle lost nested Text state")
	rows.append({"id":"composed-parts","titleRetained":true,"badgeRetained":true,"actionRetained":true,"actionCalls":composed_calls[0],"insetPadding":8,"badgeLargePx":14,"precedence":["design-slot","property","token"]})
	var column := VBoxContainer.new()
	column.position = Vector2(24, 24)
	column.size.x = 580
	column.add_theme_constant_override("separation", 16)
	add_child(column)
	var heading := Label.new()
	heading.text = "Full Stack DS · Godot comparison"
	column.add_child(heading)
	var action_preview = null
	for component in ["Switch", "Accordion", "Tabs", "Popover", "Text", "Divider", "Button"]:
		var control = make_control(component)
		if component == "Text":
			var text_panel := PanelContainer.new()
			var text_surface := StyleBoxFlat.new()
			text_surface.bg_color = Color("#f7f7f7")
			text_surface.content_margin_left = 12
			text_surface.content_margin_right = 12
			text_surface.content_margin_top = 8
			text_surface.content_margin_bottom = 8
			text_panel.add_theme_stylebox_override("panel", text_surface)
			column.add_child(text_panel)
			text_panel.add_child(control)
			control.content = "Contract-projected text"
			control.variant = "headline"
		else:
			column.add_child(control)
		if component == "Button":
			control.content = "Contract-derived action"
			control.token_overrides = {"button.color.background.default":"#123456"}
			action_preview = control
		if component in ["Accordion", "Tabs"]:
			for key in ["Overview", "Inventory"]:
				var body := Label.new()
				body.text = "Your " + key.to_lower() + " content."
				control.add_item(key, key, body)
		elif component == "Popover":
			var body := Label.new()
			body.text = "Shared contract, Godot scene tree."
			control.content.add_child(body)
		var expected := Color(control.configuration.theme_color)
		check(control.theme.get_color("font_color", "Button").is_equal_approx(expected), "Theme projection mismatch")
	var loading_preview = make_control("Button")
	column.add_child(loading_preview)
	loading_preview.content = "Loading action"
	loading_preview.loading = true
	check(loading_preview.loading_indicator.visible, "Loading preview lost its indeterminate affordance")
	for i in range(5): await get_tree().process_frame
	await RenderingServer.frame_post_draw
	var out := OS.get_environment("FSDS_ENGINE_OUT")
	if out.is_empty(): return
	var frame := get_viewport().get_texture().get_image()
	var pixel_point: Vector2 = action_preview.rendered.global_position + Vector2(action_preview.rendered.size.x / 2.0, 5)
	var painted: Color = frame.get_pixelv(Vector2i(pixel_point))
	check(painted.is_equal_approx(Color("#123456")), "Action token override did not paint expected viewport pixel")
	rows.append({"id":"action-pixel","color":painted.to_html(false)})
	var card_pixel: Color = frame.get_pixelv(Vector2i(card_preview.chrome.global_position + Vector2(5, 5)))
	check(card_pixel.is_equal_approx(Color("#123456")), "Card token override did not paint expected viewport pixel")
	rows.append({"id":"composite-pixel","color":card_pixel.to_html(false)})
	var badge_point: Vector2 = composed_badge.chrome.global_position + Vector2(composed_badge.chrome.size.x - 12, composed_badge.chrome.size.y / 2.0)
	var badge_pixel: Color = frame.get_pixelv(Vector2i(badge_point))
	check(badge_pixel.is_equal_approx(Color("#654321")), "Badge token override did not paint expected viewport pixel")
	rows.append({"id":"badge-pixel","color":badge_pixel.to_html(false)})
	frame.save_png(out.path_join("godot.png"))
	var file := FileAccess.open(out.path_join("godot.json"), FileAccess.WRITE)
	file.store_string(JSON.stringify({"runId":OS.get_environment("FSDS_ENGINE_RUN"),"engine":"godot","version":Engine.get_version_info().string,"exported":OS.has_feature("template"),"passed":not failed,"rows":rows}))
	file.close()
	get_tree().quit(1 if failed else 0)
