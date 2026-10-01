extends SceneTree
const Carousel = preload("res://addons/full_stack_ds/components/Carousel/Carousel.gd")
var failures: Array[String] = []
var requests: Array[int] = []
var pointer_observations: Array[Dictionary] = []
func check(condition: bool, message: String) -> void:
	if not condition: failures.append(message)

func _initialize() -> void:
	_run.call_deferred()

func pointer_click(button: Button) -> void:
	root.notify_mouse_entered()
	var point := button.get_global_rect().get_center()
	var move := InputEventMouseMotion.new()
	move.position = point
	move.global_position = point
	root.push_input(move, true)
	var down := InputEventMouseButton.new()
	down.position = point
	down.global_position = point
	down.button_index = MOUSE_BUTTON_LEFT
	down.button_mask = MOUSE_BUTTON_MASK_LEFT
	down.pressed = true
	root.push_input(down, true)
	pointer_observations.append({"phase":"down", "focused":button.has_focus(), "pressed":button.is_pressed(), "text":button.text, "intent":button.get_parent()._rotation_intent, "point":str(point), "viewport":str(root.get_visible_rect()), "hover":str(root.gui_get_hovered_control())})
	await process_frame
	var up := down.duplicate()
	up.pressed = false
	up.button_mask = 0
	root.push_input(up, true)
	pointer_observations.append({"phase":"up", "focused":button.has_focus(), "pressed":button.is_pressed(), "text":button.text, "intent":button.get_parent()._rotation_intent})
	await process_frame
	move.position = Vector2.ZERO
	move.global_position = Vector2.ZERO
	root.push_input(move, true)
	await process_frame
	root.notify_mouse_exited()

func _run() -> void:
	root.size = Vector2i(960, 640)
	var carousel = Carousel.new()
	carousel.motion_preference_query = func(): return 0
	carousel.position = Vector2(40, 40)
	carousel.size = Vector2(320, 260)
	carousel.props = {"slides":["Blue", "Green", "Red"], "duration":400, "autoPlay":false}
	root.add_child(carousel)
	carousel.index_requested.connect(func(value: int): requests.append(value))
	var bodies: Array[ColorRect] = []
	for color in [Color.BLUE, Color.GREEN, Color.RED]:
		var body := ColorRect.new()
		body.color = color
		bodies.append(body)
		carousel.add_slide(str(bodies.size()), body)
	await process_frame
	await process_frame
	check(carousel.budget.index == 0 and carousel.slides[0].wrapper.visible and not carousel.slides[1].wrapper.visible, "initial generated composition")
	check(carousel.accessibility_name == "Featured content" and carousel.next.accessibility_name == "Next slide", "contract accessible names")
	carousel.next.pressed.emit()
	# Seek the real native tween deterministically, as the browser fixture seeks
	# Web Animations. A separate rendered witness checks naturally sampled frames.
	carousel._tween.pause()
	carousel._tween.custom_step(0.08)
	var outgoing: float = carousel.slides[0].wrapper.position.x
	var incoming: float = carousel.slides[1].wrapper.position.x
	var width: float = carousel.viewport.size.x
	check(outgoing < -1 and outgoing > -width and incoming > 1 and incoming < width, "directional intermediate native tween geometry")
	check(carousel.budget.pauses.has("transition"), "motion owns reading pause")
	carousel.previous.pressed.emit()
	check(absf(carousel.slides[0].wrapper.position.x - outgoing) < 0.01, "interruption retains current position")
	await create_timer(0.32).timeout
	check(carousel.budget.index == 0 and not carousel.slides[1].wrapper.visible and is_zero_approx(carousel.slides[0].wrapper.position.x), "interrupted previous settles current content")
	check(bodies[0] == carousel.slides[0].body and bodies[0].color == Color.BLUE, "consumer identity and state retained")
	carousel.reduced_motion = true
	carousel.previous.pressed.emit()
	check(carousel.budget.index == 2 and carousel.slides[2].wrapper.visible and is_zero_approx(carousel.slides[2].wrapper.position.x), "reduced motion wraps immediately")
	carousel.set_props({"autoPlay":true})
	await create_timer(0.22).timeout
	var fill = carousel.projections.filter(func(p): return p.item == 2)[0].paint
	var ring = carousel.projections.filter(func(p): return p.item == -1)[0].paint
	check(fill.fraction() >= 0.4 and fill.fraction() <= 0.7 and fill.fraction() == ring.fraction(), "both progress views share the active budget")
	fill.elapsed = 0.529
	check(is_equal_approx(fill.fraction(), 0.5), "reduced motion steps the visual projection")
	carousel.notification(Node.NOTIFICATION_APPLICATION_FOCUS_OUT)
	var held: float = carousel.budget.elapsed()
	await create_timer(0.45).timeout
	check(carousel.budget.index == 2 and is_equal_approx(carousel.budget.elapsed(), held), "background preserves active dwell")
	carousel.notification(Node.NOTIFICATION_APPLICATION_FOCUS_IN)
	await create_timer(0.23).timeout
	check(carousel.budget.index == 0, "resume advances after remaining dwell")
	carousel.next.grab_focus()
	check(not carousel.budget.playing, "native descendant focus stops rotation")
	carousel.rotation_button.pressed.emit()
	check(carousel.budget.playing, "rotation explicitly restarts")
	var outside := Button.new()
	outside.position = Vector2(500, 400)
	root.add_child(outside)
	outside.grab_focus()
	await pointer_click(carousel.rotation_button)
	check(not carousel.budget.playing, "pointer Stop survives native focus dispatch")
	await pointer_click(carousel.rotation_button)
	check(carousel.budget.playing, "pointer Start explicitly restarts")
	outside.free()
	carousel.set_props({"index":0})
	var before := requests.size()
	await create_timer(0.9).timeout
	check(requests.size() == before + 1 and carousel.budget.index == 0 and carousel.budget.pending, "generated controlled acknowledgement gates repeated requests")
	carousel.set_props({"index":1})
	check(carousel.budget.index == 1 and not carousel.budget.pending, "controlled prop acknowledges")
	carousel.set_props({"duration":null})
	check(not carousel.rotation_button.visible and not carousel.budget.running(), "disabled timer has no rotation control")
	carousel.reduced_motion = false
	carousel.set_props({"index":2})
	await create_timer(0.08).timeout
	var new_owner := Control.new()
	root.add_child(new_owner)
	bodies[1].reparent(new_owner)
	bodies[1].position = Vector2(19, 23)
	bodies[1].show()
	await create_timer(0.35).timeout
	check(bodies[1].get_parent() == new_owner and bodies[1].visible and bodies[1].position == Vector2(19, 23), "transfer preserves new owner state after old motion completion")
	check(carousel.slides.size() == 2 and not carousel.budget.valid(), "transferred child invalidates label composition")
	carousel.free()
	new_owner.free()
	await process_frame
	var initial_selection = Carousel.new()
	initial_selection.motion_preference_query = func(): return 0
	initial_selection.position = Vector2(40, 40)
	initial_selection.props = {"slides":["A", "B"], "defaultIndex":1, "duration":null}
	root.add_child(initial_selection)
	initial_selection.add_slide("A", Label.new())
	initial_selection.add_slide("B", Label.new())
	check(initial_selection.budget.index == 1 and initial_selection.slides[1].wrapper.visible and initial_selection._tween == null, "initial index survives incremental native composition without entry movement")
	check(initial_selection.projections.filter(func(p): return p.item == 1)[0].paint.visible, "manual sequence retains current marker")
	initial_selection.layout_direction = Control.LAYOUT_DIRECTION_RTL
	initial_selection.size.x = 320
	await process_frame
	await process_frame
	check(is_zero_approx(initial_selection.slides[1].wrapper.position.x), "RTL resize preserves active frame origin")
	initial_selection.next.pressed.emit()
	initial_selection._tween.pause()
	initial_selection._tween.custom_step(0.125)
	var fast_fraction: float = absf(initial_selection.slides[1].wrapper.position.x) / initial_selection.viewport.size.x
	var widths: Array[float] = [initial_selection.viewport.size.x]
	check(initial_selection.slides[1].wrapper.position.x > 0 and initial_selection.slides[0].wrapper.position.x < 0, "RTL reverses inline movement")
	initial_selection._tween.custom_step(1.0)
	initial_selection.size.x = 640
	await process_frame
	await process_frame
	check(is_zero_approx(initial_selection.slides[0].wrapper.position.x), "larger RTL resize preserves active frame origin")
	initial_selection.previous.pressed.emit()
	initial_selection._tween.pause()
	initial_selection._tween.custom_step(0.125)
	var slow_fraction: float = absf(initial_selection.slides[0].wrapper.position.x) / initial_selection.viewport.size.x
	widths.append(initial_selection.viewport.size.x)
	check(fast_fraction > slow_fraction + 0.1, "larger viewport moves more slowly at the same elapsed time")
	initial_selection._tween.custom_step(1.0)
	initial_selection.size.x = 1280
	await process_frame
	await process_frame
	initial_selection.next.pressed.emit()
	initial_selection._tween.pause()
	initial_selection._tween.custom_step(0.125)
	var capped_fraction: float = absf(initial_selection.slides[1].wrapper.position.x) / initial_selection.viewport.size.x
	widths.append(initial_selection.viewport.size.x)
	check(widths == [320.0, 640.0, 1280.0], "fixture realizes the requested native viewport widths")
	check(is_equal_approx(slow_fraction, capped_fraction), "viewport multiplier honors the declared duration cap")
	initial_selection.free()
	# Exercise preference changes through the platform query boundary while the
	# same generated component owns an active native tween and reading budget.
	var preference := [0]
	var adaptive = Carousel.new()
	adaptive.motion_preference_query = func(): return preference[0]
	adaptive.position = Vector2(40, 40)
	adaptive.size = Vector2(320, 260)
	adaptive.props = {"slides":["A", "B"], "duration":1000, "autoPlay":true}
	root.add_child(adaptive)
	adaptive.add_slide("A", ColorRect.new())
	adaptive.add_slide("B", ColorRect.new())
	await process_frame
	await process_frame
	adaptive.next.pressed.emit()
	adaptive._tween.pause()
	adaptive._tween.custom_step(0.08)
	check(adaptive.budget.pauses.has("transition") and not is_zero_approx(adaptive.slides[1].wrapper.position.x), "preference fixture begins during movement")
	adaptive.budget.pause("host-test", adaptive._now())
	preference[0] = 1
	await process_frame
	await process_frame
	check(adaptive.system_motion_preference == 1 and adaptive.effective_reduced_motion and not adaptive.reduced_motion, "system preference applies without a host flag")
	check(is_zero_approx(adaptive.slides[1].wrapper.position.x) and not adaptive.slides[0].wrapper.visible and not adaptive.budget.pauses.has("transition"), "preference change settles active spatial movement")
	check(adaptive.budget.pauses.has("host-test") and adaptive.budget.remaining_ms == 1000.0, "preference settlement preserves full incoming dwell and other pauses")
	adaptive.budget.remaining_ms = 471.0
	await process_frame
	await process_frame
	var adaptive_ring = adaptive.projections.filter(func(p): return p.item == -1)[0].paint
	check(is_equal_approx(adaptive_ring.fraction(), 0.5), "system preference steps the shared countdown projection")
	adaptive.reduced_motion = false
	check(adaptive.effective_reduced_motion, "host cannot disable system motion reduction")
	preference[0] = 0
	await process_frame
	await process_frame
	check(not adaptive.effective_reduced_motion and adaptive.budget.remaining_ms == 471.0 and is_equal_approx(adaptive_ring.fraction(), 0.529), "preference removal resumes continuous paint without resetting time")
	adaptive.reduced_motion = true
	await process_frame
	check(adaptive.effective_reduced_motion, "host may still request reduced motion")
	preference[0] = -1
	await process_frame
	await process_frame
	check(adaptive.system_motion_preference == -1 and adaptive.effective_reduced_motion, "unknown system preference preserves host reduction and remains observable")
	adaptive.free()
	print(JSON.stringify({"kind":"godot-sequence-component", "passed":failures.is_empty(), "failures":failures, "requests":requests, "pointer":pointer_observations, "intermediate":{"outgoing":outgoing,"incoming":incoming}, "sizeFractions":[fast_fraction,slow_fraction,capped_fraction], "widths":widths, "version":Engine.get_version_info().string}))
	quit(0 if failures.is_empty() else 1)
