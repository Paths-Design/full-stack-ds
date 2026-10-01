extends VBoxContainer
## Native sequence adapter. Configuration is emitted from normalized IR;
## consumers pass contract-named props and owned Controls through add_slide.
signal index_requested(next: int)
const Budget = preload("res://addons/full_stack_ds/runtime/sequence_budget.gd")
const Progress = preload("res://addons/full_stack_ds/runtime/budget_progress.gd")
const Slide = preload("res://addons/full_stack_ds/runtime/sequence_slide.gd")
var configuration: Dictionary = {}
var props: Dictionary = {}
var budget = Budget.new()
var viewport: Control
var previous: Button
var next: Button
var rotation_button: Button
var pickers: HBoxContainer
var slides: Array[Dictionary] = []
var projections: Array[Dictionary] = []
## Hosts may request less motion, but cannot override a system request.
## The query boundary also lets an embedding platform supply its preference.
var motion_preference_query: Callable = _system_motion_preference
var system_motion_preference := -1
var effective_reduced_motion := false
var reduced_motion := false:
	set(value):
		reduced_motion = value
		if is_node_ready(): _sync_motion_preference()
var _index := 0
var _initialized := false
var _tween: Tween
var _motion_owner := 0
var _rotation_intent: Variant = null
var _touches: Dictionary = {}

func _now() -> float:
	return Time.get_ticks_usec() / 1000.0

func _system_motion_preference() -> int:
	return int(DisplayServer.call("accessibility_should_reduce_animation")) if DisplayServer.has_method("accessibility_should_reduce_animation") else -1

func _sync_motion_preference() -> void:
	var observed: int = int(motion_preference_query.call()) if motion_preference_query.is_valid() else -1
	system_motion_preference = observed if observed in [-1, 0, 1] else -1
	var previous_preference := effective_reduced_motion
	effective_reduced_motion = reduced_motion or system_motion_preference == 1
	if effective_reduced_motion and not previous_preference: _settle()

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	for key in configuration.defaults:
		if not props.has(key): props[key] = JSON.parse_string(configuration.defaults[key])
	rotation_button = _button(configuration.sequence.labels.start)
	rotation_button.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
	add_child(rotation_button)
	rotation_button.pressed.connect(_rotate)
	viewport = Control.new()
	viewport.clip_contents = true
	viewport.size_flags_vertical = Control.SIZE_EXPAND_FILL
	add_child(viewport)
	var controls := HBoxContainer.new()
	controls.alignment = BoxContainer.ALIGNMENT_CENTER
	add_child(controls)
	previous = _button(configuration.names.previous)
	controls.add_child(previous)
	previous.pressed.connect(func(): budget.request(budget.index - 1, _now()))
	pickers = HBoxContainer.new()
	controls.add_child(pickers)
	next = _button(configuration.names.next)
	controls.add_child(next)
	next.pressed.connect(func(): budget.request(budget.index + 1, _now()))
	for navigation in [previous, next]:
		var outline := StyleBoxFlat.new()
		outline.bg_color = Color.TRANSPARENT
		outline.border_color = navigation.get_theme_color("font_color")
		outline.set_border_width_all(1)
		outline.set_corner_radius_all(20)
		navigation.add_theme_stylebox_override("normal", outline)
	for binding in configuration.sequence.progress:
		if binding.effect == "elapsed-ring": _add_projection(next, binding, -1)
	budget.index_requested.connect(_request)
	get_viewport().gui_focus_changed.connect(_focus_changed)
	viewport.resized.connect(_resize)
	visibility_changed.connect(_visibility)
	_sync_motion_preference()
	_sync()
	_visibility()

func _button(text: String) -> Button:
	var button := Button.new()
	button.text = text
	button.accessibility_name = text
	button.custom_minimum_size = Vector2(40, 40)
	return button

func set_props(values: Dictionary) -> void:
	props.merge(values, true)
	if is_node_ready(): _sync()

func add_slide(key: String, body: Control) -> void:
	assert(is_node_ready(), "Add consumer slides after the sequence enters the scene tree")
	assert(body.get_parent() == null, "Consumer must release its Control before transferring it")
	for slide in slides: assert(slide.key != key, "Duplicate slide identity")
	var wrapper := Slide.new()
	wrapper.add_theme_stylebox_override("panel", StyleBoxEmpty.new())
	viewport.add_child(wrapper)
	wrapper.add_child(body)
	var picker := _button("")
	picker.flat = true
	picker.toggle_mode = true
	pickers.add_child(picker)
	var position_in_sequence := slides.size()
	picker.pressed.connect(func():
		for i in slides.size():
			if slides[i].key == key: budget.request(i, _now())
	)
	slides.append({"key":key, "body":body, "wrapper":wrapper, "picker":picker})
	_update_content_minimum()
	for binding in configuration.sequence.progress:
		if binding.effect == "elapsed-width": _add_projection(picker, binding, position_in_sequence)
	_sync()
	_resize()

func remove_slide(key: String) -> Control:
	for i in slides.size():
		if slides[i].key != key: continue
		var slide: Dictionary = slides[i]
		slides.remove_at(i)
		for p in range(projections.size() - 1, -1, -1):
			if projections[p].item == i: projections.remove_at(p)
			elif projections[p].item > i: projections[p].item -= 1
		slide.picker.queue_free()
		var body: Control = slide.body if is_instance_valid(slide.body) else null
		if body and body.get_parent() == slide.wrapper: slide.wrapper.remove_child(body)
		slide.wrapper.queue_free()
		_update_content_minimum()
		_sync()
		return body
	return null

func _update_content_minimum() -> void:
	# Reserve the largest composed minimum, including inactive content, so a
	# transition never clips a taller slide or changes the control positions.
	var minimum := Vector2.ZERO
	for slide in slides:
		if is_instance_valid(slide.body) and slide.body.get_parent() == slide.wrapper:
			minimum = minimum.max(slide.body.get_combined_minimum_size())
	viewport.custom_minimum_size = minimum

func _add_projection(host: Control, binding: Dictionary, item: int) -> void:
	var paint = Progress.new()
	paint.effect = binding.effect
	paint.steps = binding.reducedMotion.steps
	paint.foreground = host.get_theme_color("font_color", "Button")
	paint.track = Color(paint.foreground, 0.25)
	host.add_child(paint)
	paint.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	projections.append({"paint":paint, "item":item, "when":binding.get("when", {})})

func _sync() -> void:
	var sequence: Dictionary = configuration.sequence
	var channel: Dictionary = configuration.channel
	var value = props.get(channel.valueProp)
	var controlled := value != null
	if controlled: _index = int(value)
	elif not _initialized: _index = int(props.get(channel.get("defaultValueProp", ""), 0))
	var labels: Array = props.get(sequence.itemsProp, [])
	var keys: Array = slides.map(func(slide): return slide.key)
	var duration = props.get(sequence.timing.durationProp, sequence.timing.defaultMs)
	var old_index: int = budget.index
	var old_count: int = budget.count
	var old_revision: int = budget.revision
	budget.sync(_index, labels, keys, float(duration) if duration != null else 0.0, bool(props.get(sequence.timing.autoPlayProp, false)), _now())
	if budget.count > 0: _index = budget.index
	accessibility_name = str(props.get(configuration.get("nameProp", ""), ""))
	for i in slides.size():
		var label := str(labels[i]) if i < labels.size() else ""
		slides[i].picker.accessibility_name = label
		slides[i].wrapper.accessibility_name = label
	if _initialized and old_count > 0 and budget.valid() and (old_index != budget.index or (old_revision != budget.revision and _tween and _tween.is_running())): _move(old_index)
	elif old_revision != budget.revision: _settle()
	_initialized = true
	_refresh()

func _request(value: int) -> void:
	# Commit uncontrolled state before emitting; controlled consumers acknowledge
	# by calling set_props with the channel's value prop.
	if props.get(configuration.channel.valueProp) == null:
		_index = value
		_sync()
	index_requested.emit(value)

func _refresh() -> void:
	if not is_instance_valid(rotation_button): return
	rotation_button.visible = budget.valid() and budget.duration_ms > 0
	rotation_button.text = configuration.sequence.labels.stop if budget.playing else configuration.sequence.labels.start
	rotation_button.accessibility_name = rotation_button.text
	previous.disabled = not budget.valid()
	next.disabled = not budget.valid()
	# Navigation direction is a sequence operation; the native glyph is a
	# presentation choice, while contract names remain the accessible labels.
	previous.text = "→" if is_layout_rtl() else "←"
	next.text = "←" if is_layout_rtl() else "→"
	for i in slides.size():
		slides[i].picker.disabled = not budget.valid()
		slides[i].picker.set_pressed_no_signal(i == budget.index)
		slides[i].picker.text = "●" if i == budget.index else "○"
		slides[i].wrapper.accessibility_current = i == budget.index and budget.count > 0
		slides[i].wrapper.focus_behavior_recursive = Control.FOCUS_BEHAVIOR_INHERITED if i == budget.index else Control.FOCUS_BEHAVIOR_DISABLED
		slides[i].wrapper.mouse_behavior_recursive = Control.MOUSE_BEHAVIOR_INHERITED if i == budget.index else Control.MOUSE_BEHAVIOR_DISABLED
	for projection in projections:
		projection.paint.elapsed = budget.elapsed()
		projection.paint.reduced_motion = effective_reduced_motion
		var condition: Dictionary = projection.when
		var presented: bool = condition.is_empty() or props.get(condition.axis) in condition["values"]
		projection.paint.visible = presented and budget.valid() and budget.duration_ms > 0 and (projection.item == budget.index or projection.item < 0)
		if projection.item >= 0 and projection.paint.visible:
			slides[projection.item].picker.text = ""
		projection.paint.queue_redraw()

func _process(_delta: float) -> void:
	if not _initialized: return
	_sync_motion_preference()
	# Transfers and deletion release our wrapper only. Never restore or hide a
	# consumer Control after its parent has changed.
	for i in range(slides.size() - 1, -1, -1):
		var body = slides[i].body
		if not is_instance_valid(body) or body.get_parent() != slides[i].wrapper: remove_slide(slides[i].key)
	# Hidden Controls can change their minimum without emitting the native
	# minimum_size_changed signal. Sample owned content before reading time.
	_update_content_minimum()
	var now := _now()
	if get_tree().paused: budget.pause("tree", now)
	else: budget.resume("tree", now)
	if get_global_rect().has_point(get_global_mouse_position()) and is_visible_in_tree(): budget.pause("hover", now)
	else: budget.resume("hover", now)
	budget.tick(now)
	_refresh()

func _focus_changed(control: Control) -> void:
	if control == self or is_ancestor_of(control):
		budget.stop(_now())
		_refresh()

func _rotate() -> void:
	budget.rotate(not budget.playing if _rotation_intent == null else bool(_rotation_intent), _now())
	_rotation_intent = null
	_refresh()

func _input(event: InputEvent) -> void:
	if not is_instance_valid(rotation_button): return
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		if event.pressed:
			_rotation_intent = not budget.playing if rotation_button.is_visible_in_tree() and rotation_button.get_global_rect().has_point(event.position) else null
		else: _clear_intent.call_deferred()
	if event is InputEventScreenTouch:
		if event.pressed and get_global_rect().has_point(event.position):
			_touches[event.index] = true
			budget.pause("touch", _now())
		else:
			_touches.erase(event.index)
			if _touches.is_empty(): budget.resume("touch", _now())

func _clear_intent() -> void:
	_rotation_intent = null

func _visibility() -> void:
	if is_visible_in_tree(): budget.resume("visibility", _now())
	else:
		budget.pause("visibility", _now())
		_clear_intent()

func _notification(what: int) -> void:
	if not _initialized: return
	if what == NOTIFICATION_APPLICATION_FOCUS_OUT:
		budget.pause("application-focus", _now())
		_touches.clear()
		budget.resume("touch", _now())
		_clear_intent()
	elif what == NOTIFICATION_APPLICATION_FOCUS_IN: budget.resume("application-focus", _now())
	elif what == NOTIFICATION_APPLICATION_PAUSED: budget.pause("application-paused", _now())
	elif what == NOTIFICATION_APPLICATION_RESUMED: budget.resume("application-paused", _now())
	elif what == NOTIFICATION_LAYOUT_DIRECTION_CHANGED: _settle.call_deferred()

func _resize() -> void:
	if not is_instance_valid(viewport): return
	for slide in slides: slide.wrapper.size = viewport.size
	# Godot preserves the right edge when sizing inherited RTL Controls. Restore
	# our physical frame origin after sizing, even when no tween is running.
	_settle()

func _move(from: int) -> void:
	_sync_motion_preference()
	if _tween: _tween.kill()
	var profile: Dictionary = configuration.sequence.get("transition", {})
	if effective_reduced_motion or profile.is_empty() or viewport.size.x <= 0:
		_settle()
		return
	_motion_owner = budget.begin_transition(_now())
	var owner := _motion_owner
	var distance: float = viewport.size.x * budget.direction * (-1 if is_layout_rtl() else 1)
	var targets: Array[Dictionary] = []
	for i in slides.size():
		var wrapper: Control = slides[i].wrapper
		if i == budget.index:
			if not wrapper.visible: wrapper.position.x = distance
			wrapper.show()
			targets.append({"node":wrapper, "start":wrapper.position.x, "end":0.0})
		elif wrapper.visible and (i == from or not is_zero_approx(wrapper.position.x)):
			targets.append({"node":wrapper, "start":wrapper.position.x, "end":-distance})
	var duration := float(profile.durationMs) / 1000.0 * clampf(sqrt(viewport.size.x / float(profile.referenceWidth)), float(profile.minMultiplier), float(profile.maxMultiplier))
	var bezier := str(profile.easing).trim_prefix("cubic-bezier(").trim_suffix(")").split(",")
	_tween = create_tween()
	_tween.tween_method(func(fraction: float):
		if owner != _motion_owner: return
		var eased := _ease(fraction, bezier)
		for target in targets:
			if is_instance_valid(target.node) and target.node.get_parent() == viewport:
				target.node.position.x = lerpf(target.start, target.end, eased)
	, 0.0, 1.0, duration)
	_tween.finished.connect(func():
		if owner == _motion_owner: _settle()
	)

func _ease(x: float, values: PackedStringArray) -> float:
	var low := 0.0
	var high := 1.0
	for _iteration in 18:
		var t := (low + high) / 2.0
		if _cubic(t, float(values[0]), float(values[2])) < x: low = t
		else: high = t
	return _cubic((low + high) / 2.0, float(values[1]), float(values[3]))

func _cubic(t: float, a: float, b: float) -> float:
	return 3.0 * (1.0 - t) * (1.0 - t) * t * a + 3.0 * (1.0 - t) * t * t * b + t * t * t

func _settle() -> void:
	if _tween: _tween.kill()
	_motion_owner = budget.revision
	for i in slides.size():
		slides[i].wrapper.visible = i == budget.index and budget.count > 0
		slides[i].wrapper.position.x = 0.0
	budget.finish_transition(_motion_owner, _now())

func _exit_tree() -> void:
	if _tween: _tween.kill()
	budget.destroy()
