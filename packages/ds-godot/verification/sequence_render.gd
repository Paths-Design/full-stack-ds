extends SceneTree
const Carousel = preload("res://addons/full_stack_ds/components/Carousel/Carousel.gd")
var samples: Array[Dictionary] = []

func _initialize() -> void:
	_run.call_deferred()

func _pixels(view: Control) -> Dictionary:
	var image := root.get_texture().get_image()
	var rect := view.get_global_rect()
	var blue := 0
	var green := 0
	for x in range(int(rect.position.x), int(rect.end.x)):
		var color := image.get_pixel(x, int(rect.get_center().y))
		if color.b > 0.9 and color.r < 0.1 and color.g < 0.1: blue += 1
		if color.g > 0.9 and color.r < 0.1 and color.b < 0.1: green += 1
	return {"blue":blue, "green":green}

func _run() -> void:
	root.size = Vector2i(760, 420)
	var out := OS.get_environment("FSDS_ENGINE_OUT")
	var carousel = Carousel.new()
	carousel.position = Vector2(40, 40)
	carousel.size = Vector2(640, 260)
	carousel.props = {"slides":["Blue", "Green"], "autoPlay":false}
	root.add_child(carousel)
	for color in [Color.BLUE, Color.GREEN]:
		var body := ColorRect.new()
		body.color = color
		carousel.add_slide(str(color), body)
	await process_frame
	await RenderingServer.frame_post_draw
	var initial := _pixels(carousel.viewport)
	root.get_texture().get_image().save_png(out.path_join("initial.png"))
	carousel.next.pressed.emit()
	var start := Time.get_ticks_msec()
	var intermediates := 0
	while Time.get_ticks_msec() - start < 700:
		await RenderingServer.frame_post_draw
		var sample := _pixels(carousel.viewport)
		sample["ms"] = Time.get_ticks_msec() - start
		samples.append(sample)
		if sample.blue > 1 and sample.green > 1:
			if intermediates == 0 or intermediates == 3: root.get_texture().get_image().save_png(out.path_join("movement-%d.png" % intermediates))
			intermediates += 1
	var final := _pixels(carousel.viewport)
	root.get_texture().get_image().save_png(out.path_join("final.png"))
	var edges: Dictionary = {}
	var monotonic := true
	var prior: int = initial.blue
	for sample in samples:
		if sample.blue > prior: monotonic = false
		prior = sample.blue
		if sample.blue > 1 and sample.green > 1: edges[sample.blue] = true
	var width: int = int(carousel.viewport.size.x)
	var passed: bool = initial.blue == width and initial.green == 0 and final.green == width and final.blue == 0 and edges.size() >= 3 and monotonic
	var receipt := {"kind":"godot-sequence-render", "passed":passed, "initial":initial, "final":final, "distinctIntermediateEdges":edges.size(), "samples":samples, "version":Engine.get_version_info().string}
	FileAccess.open(out.path_join("render-receipt.json"), FileAccess.WRITE).store_string(JSON.stringify(receipt, "  "))
	var summary := receipt.duplicate()
	summary.erase("samples")
	print(JSON.stringify(summary))
	# Explicit half-budget paint sample; this is separate from natural movement
	# and the component fixture's actual timed projection assertions.
	carousel.budget.remaining_ms = carousel.budget.duration_ms / 2.0
	carousel._refresh()
	await RenderingServer.frame_post_draw
	root.get_texture().get_image().save_png(out.path_join("progress-half-sample.png"))
	carousel.free()
	quit(0 if passed else 1)
