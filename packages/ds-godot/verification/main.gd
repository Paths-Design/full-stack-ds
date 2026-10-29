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
	if divider.rendered is ColorRect:
		check(is_equal_approx(divider.rendered.custom_minimum_size.x, 4.0), "Vertical rule thickness mismatch")
	rows.append({"id":"rule-orientation","verticalPx":4})
	divider.queue_free()
	var changed_rule = make_control("RuleProbe")
	add_child(changed_rule)
	if changed_rule.rendered is ColorRect:
		check(changed_rule.rendered.color.is_equal_approx(Color("#123456")), "Changed token did not reach rendered rule")
	rows.append({"id":"rule-token","color":"#123456"})
	changed_rule.queue_free()
	var column := VBoxContainer.new()
	column.position = Vector2(24, 24)
	column.size.x = 580
	column.add_theme_constant_override("separation", 16)
	add_child(column)
	var heading := Label.new()
	heading.text = "Full Stack DS · Godot comparison"
	column.add_child(heading)
	for component in ["Switch", "Accordion", "Tabs", "Popover", "Text", "Divider"]:
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
	for i in range(5): await get_tree().process_frame
	await RenderingServer.frame_post_draw
	var out := OS.get_environment("FSDS_ENGINE_OUT")
	if out.is_empty(): return
	get_viewport().get_texture().get_image().save_png(out.path_join("godot.png"))
	var file := FileAccess.open(out.path_join("godot.json"), FileAccess.WRITE)
	file.store_string(JSON.stringify({"runId":OS.get_environment("FSDS_ENGINE_RUN"),"engine":"godot","version":Engine.get_version_info().string,"exported":OS.has_feature("template"),"passed":not failed,"rows":rows}))
	file.close()
	get_tree().quit(1 if failed else 0)
