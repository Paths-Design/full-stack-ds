extends Control

## Screenshot capture harness: boots the pause menu, drives a representative
## state per tab, and saves 1280x800 PNGs.
##
## Run non-headless (capture reads the rendered viewport texture):
##   /Applications/Godot.app/Contents/MacOS/Godot \
##     --path <lane> res://tools/capture.tscn \
##     -- --out=/abs/lane/evidence --mirror=/abs/canonical/tmp/game-pause-menu/godot
##
## The default output directory is <lane>/evidence/ (gitignored). `--mirror`
## writes the same bytes to a second directory from inside the Godot process
## (the canonical checkout is never mutated by shell copy tools).

var app
var out_dir := ""
var mirror_dir := ""


func _ready() -> void:
	# Watchdog: a script error inside an awaited coroutine aborts the harness
	# without reaching quit, leaving a window open forever. Fail loudly instead.
	var watchdog := Timer.new()
	watchdog.one_shot = true
	watchdog.wait_time = 60.0
	watchdog.timeout.connect(func() -> void:
		push_error("FSDS_GODOT_CAPTURE_TIMEOUT")
		get_tree().quit(2)
	)
	add_child(watchdog)
	watchdog.start()
	out_dir = _resolve_dir("--out=", ProjectSettings.globalize_path("res://").path_join("evidence"))
	mirror_dir = _resolve_dir("--mirror=", "")
	DirAccess.make_dir_recursive_absolute(out_dir)
	if not mirror_dir.is_empty():
		DirAccess.make_dir_recursive_absolute(mirror_dir)
	app = load("res://main.tscn").instantiate()
	add_child(app)
	await _settle(4)

	# Map: nav target set (footer + marker highlight).
	app.select_tab("map")
	app.set_nav_target("cache-02")
	await _capture("map")

	# Marker detail popover, viewport-clamped anchor.
	app.open_marker_popover("beacon-05")
	await _capture("popover")
	app.close_marker_popover()

	# Progress: left-edge faction dossier drawer.
	app.select_tab("progress")
	app.select_faction("ares-logistics")
	await _settle(20) # drawer slide
	await _capture("progress")
	await _capture("drawer")

	app.close_drawer()
	app.select_tab("abilities")
	app.select_ability("overclock") # size 2 -> compatible slots highlighted
	await _capture("abilities")

	app.select_tab("settings")
	await _capture("settings")

	# Remap modal waiting for input.
	app.open_remap("interact")
	await _capture("remap-modal")
	app.cancel_remap()

	# Subtitle background swatch + language reflected in the preview strip.
	app.set_subtitle_background("signal")
	app.set_subtitle_language(1)
	app.settings_tab.scroll_to_bottom()
	await _settle(3)
	await _capture("subtitle-picker")

	print("FSDS_GODOT_CAPTURE_OK " + out_dir + ((" mirror=" + mirror_dir) if not mirror_dir.is_empty() else ""))
	get_tree().quit(0)


func _resolve_dir(prefix: String, fallback: String) -> String:
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with(prefix):
			return arg.trim_prefix(prefix)
	return fallback


func _settle(frames: int) -> void:
	for _index in range(frames):
		await get_tree().process_frame


func _capture(name: String) -> void:
	await _settle(3)
	if DisplayServer.get_name() == "headless":
		# Headless has no rendered viewport texture; this mode exists only to
		# validate the capture flow (script/state errors) in CI-like runs.
		print("FSDS_GODOT_CAPTURE_SKIPPED_HEADLESS %s" % name)
		return
	await RenderingServer.frame_post_draw
	var image := get_viewport().get_texture().get_image()
	for directory in [out_dir, mirror_dir]:
		if directory.is_empty():
			continue
		var path: String = directory.path_join(name + ".png")
		var err: int = image.save_png(path)
		if err != OK:
			push_error("FSDS_GODOT_CAPTURE_FAILED %s err=%d" % [path, err])
			get_tree().quit(1)
			return
	print("FSDS_GODOT_CAPTURE %s %s" % [name, image.get_size()])
