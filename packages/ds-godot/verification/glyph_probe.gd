extends Control

var failures: Array[String] = []

func solid_pixel(image: Image) -> Vector2i:
	for y in range(image.get_height()):
		for x in range(image.get_width()):
			if image.get_pixel(x, y).a > 0.95: return Vector2i(x, y)
	return Vector2i(-1, -1)

func check(ok: bool, message: String) -> void:
	if not ok:
		failures.append(message)
		push_error(message)

func _ready() -> void:
	var host := VBoxContainer.new()
	var inherited := Theme.new()
	inherited.set_color("font_color", "Label", Color("#cc3300"))
	host.theme = inherited
	add_child(host)
	var icon = load("res://addons/full_stack_ds/components/Icon/Icon.tscn").instantiate()
	icon.decorative = false
	icon.aria_label = "Pre-attached check"
	host.add_child(icon)
	check(not icon.decorative and icon.rendered.accessibility_name == "Pre-attached check", "Pre-attached informative state was overwritten by the authored default")
	icon.set_contract_prop("name", "check")
	check(icon.rendered.texture != null, "Named glyph is blank")
	if icon.rendered.texture == null:
		_finish()
		return
	check(icon.selected_grid == 16 and icon.rendered.texture.get_size() == Vector2(20, 20), "Default frame and grid mismatch")
	var check_bytes: PackedByteArray = icon.rendered.texture.get_image().get_data()
	check(solid_pixel(icon.rendered.texture.get_image()).x >= 0, "Authored check path painted no opaque glyph pixel")
	icon.size_axis = "lg"
	check(icon.selected_grid == 24 and icon.rendered.texture.get_size() == Vector2(24, 24), "Large grid mismatch")
	icon.size_axis = "xl"
	check(icon.selected_grid == 24 and icon.rendered.texture.get_size() == Vector2(32, 32), "Extra-large frame mismatch")
	icon.size_axis = "md"
	icon.glyph_name = "x"
	check(icon.rendered.texture != null and icon.rendered.texture.get_image().get_data() != check_bytes, "Distinct glyphs have the same pixels")
	icon.glyph_name = "check"
	var before: PackedByteArray = icon.rendered.texture.get_image().get_data()
	inherited.set_color("font_color", "Label", Color("#0066cc"))
	await get_tree().process_frame
	check(icon.rendered.texture.get_image().get_data() != before, "Inherited foreground did not change glyph pixels")
	var ink: Vector2i = solid_pixel(icon.rendered.texture.get_image())
	check(ink.x >= 0, "Recolored glyph painted no opaque pixel")
	if ink.x >= 0:
		var texture_color: Color = icon.rendered.texture.get_image().get_pixelv(ink)
		check(texture_color.b > 0.7 and texture_color.r < 0.1, "Inherited blue did not reach rasterized pixel")
		await RenderingServer.frame_post_draw
		var screen = get_viewport().get_texture().get_image()
		var screen_color: Color = screen.get_pixelv(Vector2i(icon.rendered.global_position) + ink)
		check(screen_color.b > 0.7 and screen_color.r < 0.1, "Rasterized blue glyph did not reach viewport pixel")
	inherited.set_color("font_color", "Label", Color(0.0, 0.4, 0.8, 0.25))
	await get_tree().process_frame
	var translucent_ink: Image = icon.rendered.texture.get_image()
	var alpha_peak := 0.0
	for y in range(translucent_ink.get_height()):
		for x in range(translucent_ink.get_width()): alpha_peak = maxf(alpha_peak, translucent_ink.get_pixel(x, y).a)
	check(alpha_peak > 0.15 and alpha_peak < 0.35, "Inherited foreground alpha was not preserved")
	var no_fill := Image.new()
	var source_without_path_fill := {"viewBox":"0 0 16 16", "paths":[{"d":"M0 0H16V16H0Z"}]}
	check(no_fill.load_svg_from_string(icon._svg(source_without_path_fill, Color.WHITE)) == OK and no_fill.is_invisible(), "Authored SVG root fill did not reach a path without fill")
	var defaulted = load("res://addons/full_stack_ds/runtime/glyph.gd").new()
	defaulted.configuration = icon.configuration.duplicate(true)
	defaulted.configuration.defaults["name"] = '"check"'
	defaulted.configuration.defaults["decorative"] = "false"
	defaulted.configuration.defaults["ariaLabel"] = '"Default check"'
	host.add_child(defaulted)
	check(defaulted.glyph_name == "check" and not defaulted.decorative and defaulted.aria_label == "Default check", "Authored glyph defaults did not initialize native state")
	check(defaulted.explicit_props.is_empty(), "Authored defaults were mistaken for consumer overrides")
	check(defaulted.rendered.texture != null and defaulted.rendered.accessibility_name == "Default check", "Authored glyph defaults did not reach rendering and name")
	defaulted.queue_free()
	icon.decorative = false
	icon.aria_label = "Confirmed"
	check(icon.rendered.accessibility_name == "Confirmed", "Informative name was not projected")
	icon.glyph_name = "absent"
	check(icon.rendered.texture == null and icon.selected_grid == 0, "Unknown glyph did not disappear")
	var group = load("res://addons/full_stack_ds/components/Accordion/Accordion.tscn").instantiate()
	group.position = Vector2(96, 120)
	group.custom_minimum_size = Vector2(240, 48)
	add_child(group)
	group.add_item("settings", "Settings", Label.new())
	var composed = group.items[0].button.get_node_or_null("chevron")
	check(composed != null, "Nested componentRef did not mount on the trigger")
	if composed != null:
		check(composed.glyph_name == "chevron-down" and composed.size_axis == "sm" and composed.selected_grid == 16, "Nested Icon lost contract attributes or catalog selection")
		check(composed.rendered.texture != null and solid_pixel(composed.rendered.texture.get_image()).x >= 0, "Nested Icon did not rasterize authored geometry")
		group.theme.set_color("font_color", "Label", Color("#00cc66"))
		await get_tree().process_frame
		var composed_ink: Vector2i = solid_pixel(composed.rendered.texture.get_image())
		if composed_ink.x >= 0:
			var composed_color: Color = composed.rendered.texture.get_image().get_pixelv(composed_ink)
			check(composed_color.g > 0.7 and composed_color.r < 0.1, "Nested Icon ignored inherited foreground")
			await RenderingServer.frame_post_draw
			var composed_frame: Image = get_viewport().get_texture().get_image()
			var composed_pixel: Color = composed_frame.get_pixelv(Vector2i(composed.rendered.global_position) + composed_ink)
			check(composed_pixel.g > 0.7 and composed_pixel.r < 0.1, "Nested Icon did not paint inherited foreground in the viewport")
		composed.set_contract_prop("name", "absent")
		check(composed.rendered.texture == null, "Nested unknown Icon retained stale pixels")
	var synthetic = load("res://addons/full_stack_ds/components/SyntheticGroup/SyntheticGroup.tscn").instantiate()
	synthetic.position = Vector2(96, 220)
	add_child(synthetic)
	synthetic.add_item("item", "Synthetic", Label.new())
	var renamed_icon = synthetic.items[0].button.get_node_or_null("chevron")
	check(renamed_icon != null, "Renamed host did not mount its contract reference")
	if renamed_icon != null:
		check(not renamed_icon.decorative and renamed_icon.aria_label == "Synthetic indicator", "Typed static reference attributes changed during mounting")
		check(renamed_icon.glyph_name == "chevron-down" and renamed_icon.rendered.texture != null, "Renamed host lost its authored glyph")
		synthetic.theme.set_color("font_color", "Label", Color("#00cc66"))
		await get_tree().process_frame
		var renamed_ink: Vector2i = solid_pixel(renamed_icon.rendered.texture.get_image())
		if renamed_ink.x >= 0:
			var renamed_color: Color = renamed_icon.rendered.texture.get_image().get_pixelv(renamed_ink)
			check(renamed_color.g > 0.7 and renamed_color.r < 0.1, "Renamed host did not inherit foreground")
	_finish()

func _finish() -> void:
	print("FSDS_GLYPH_RESULT " + JSON.stringify({"runId":OS.get_environment("FSDS_ENGINE_RUN"),"passed":failures.is_empty(),"failures":failures,"exported":OS.has_feature("template"),"version":Engine.get_version_info().string}))
	get_tree().quit(0 if failures.is_empty() else 1)
