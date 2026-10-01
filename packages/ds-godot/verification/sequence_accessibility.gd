extends Node
## External native accessibility inspection, deliberately separate from the
## engine assertions. Printed readiness does not assert an accessible tree.
const Carousel = preload("res://addons/full_stack_ds/components/Carousel/Carousel.tscn")
var root: Window:
	get: return get_tree().root
func _ready() -> void:
	_run.call_deferred()

func _run() -> void:
	var phase := OS.get_environment("FSDS_SEQUENCE_PHASE")
	root.title = "Carousel accessibility inspection - " + phase
	root.size = Vector2i(760, 460)
	var carousel = Carousel.instantiate()
	carousel.position = Vector2(40, 40)
	carousel.size = Vector2(640, 260)
	carousel.props = {"slides":["Blue", "Green"], "autoPlay":false}
	root.add_child(carousel)
	var bodies: Array[Button] = []
	for label in ["Blue slide action", "Green slide action"]:
		var body := Button.new()
		body.text = label
		bodies.append(body)
		carousel.add_slide(label, body)
	await get_tree().process_frame
	await get_tree().process_frame
	carousel.next.pressed.emit()
	carousel._tween.pause()
	carousel._tween.custom_step(0.08)
	if phase == "transfer":
		var independent := VBoxContainer.new()
		independent.accessibility_name = "Independent content"
		independent.position = Vector2(40, 340)
		independent.size = Vector2(640, 60)
		root.add_child(independent)
		bodies[0].reparent(independent)
		await get_tree().process_frame
		await get_tree().process_frame
		carousel.set_props({"slides":["Green"]})
	await RenderingServer.frame_post_draw
	root.get_texture().get_image().save_png(OS.get_environment("FSDS_ENGINE_OUT").path_join("accessibility-" + phase + ".png"))
	print(JSON.stringify({"kind":"godot-sequence-accessibility-inspection", "phase":phase, "runId":OS.get_environment("FSDS_ENGINE_RUN"), "ready":true, "nativeTreeVerified":false, "version":Engine.get_version_info().string}))
	await get_tree().create_timer(90).timeout
	get_tree().quit()
