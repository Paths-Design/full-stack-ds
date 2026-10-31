extends Control

## Parity capture harness: boots the menu and captures exactly the `captures`
## states declared in `fixtures/parity-layout.json`.
##
## Run non-headless (capture reads the rendered viewport texture):
##   /Applications/Godot.app/Contents/MacOS/Godot \
##     --path <lane> res://tools/capture.tscn \
##     -- --out=/abs/lane/evidence --mirror=/abs/canonical/tmp/game-pause-menu/godot
##
## Required four: map, progress, abilities, settings. Extra states:
## map-popover, abilities-hover, settings-remap-modal, settings-subtitle.
## The default output directory is <lane>/evidence/ (gitignored).

const STATE_ORDER := [
	"map",
	"map-popover",
	"progress",
	"abilities",
	"abilities-hover",
	"settings",
	"settings-remap-modal",
	"settings-subtitle",
]

var app
var out_dir := ""
var mirror_dir := ""


func _ready() -> void:
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

	for state_name in STATE_ORDER:
		app.apply_capture_state(state_name)
		await _settle(24) # drawer slide + popover surface settle
		await _capture(state_name)

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
	await _settle(2)
	if DisplayServer.get_name() == "headless":
		# Headless has no rendered viewport texture; this mode only validates the
		# capture flow (state application / script errors).
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
