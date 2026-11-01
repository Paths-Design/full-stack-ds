extends Control

var failures: Array[String] = []

func check(ok: bool, message: String) -> void:
	if not ok:
		failures.append(message)
		push_error(message)

func _ink_count(image: Image, origin: Vector2i, dimensions: int, accent: bool) -> int:
	var count := 0
	for y in range(dimensions):
		for x in range(dimensions):
			var pixel := image.get_pixelv(origin + Vector2i(x, y))
			if accent and pixel.r > 0.55 and pixel.r > pixel.g * 1.8 and pixel.g < 0.35: count += 1
			if not accent and pixel.r > 0.55 and absf(pixel.r - pixel.g) < 0.08 and absf(pixel.g - pixel.b) < 0.08: count += 1
	return count

func _ready() -> void:
	var spinner = load("res://addons/full_stack_ds/components/Spinner/Spinner.tscn").instantiate()
	spinner.position = Vector2(80, 80)
	add_child(spinner)
	check(spinner.selected_size == 16.0 and spinner.selected_thickness == 3.0, "Theme-sized default and authored border width were not applied")
	spinner.set_contract_prop("size", "lg")
	spinner.set_contract_prop("thickness", "bold")
	check(spinner.selected_size == 24.0 and spinner.selected_thickness == 4.0, "Declared large/bold geometry did not reach the native ring")
	check(spinner.rendered.custom_minimum_size == Vector2(24, 24), "Ring child did not receive source-bound geometry")
	spinner._process(0.2)
	check(absf(spinner.angle_degrees - 90.0) < 0.2, "Quarter-period loop did not rotate to the declared angle")
	spinner.reduced_motion = true
	spinner._process(0.2)
	check(spinner.angle_degrees == 0.0, "Reduced motion did not hold the authored static angle")
	spinner.reduced_motion = false
	spinner.elapsed_ms = 0.0
	spinner.angle_degrees = 0.0
	spinner.rendered.queue_redraw()
	await RenderingServer.frame_post_draw
	var frame: Image = get_viewport().get_texture().get_image()
	var origin := Vector2i(spinner.rendered.global_position)
	check(_ink_count(frame, origin, 24, true) > 3, "Authored accent color did not paint viewport pixels")
	check(_ink_count(frame, origin, 24, false) > 10, "Authored track color did not paint viewport pixels")
	print("FSDS_SPINNER_RESULT " + JSON.stringify({"runId":OS.get_environment("FSDS_ENGINE_RUN"),"passed":failures.is_empty(),"failures":failures,"exported":OS.has_feature("template"),"size":spinner.selected_size,"thickness":spinner.selected_thickness,"angle":spinner.angle_degrees,"accentPixels":_ink_count(frame, origin, 24, true),"trackPixels":_ink_count(frame, origin, 24, false)}))
	get_tree().quit(0 if failures.is_empty() else 1)
