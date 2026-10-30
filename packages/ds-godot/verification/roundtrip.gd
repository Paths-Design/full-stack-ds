extends SceneTree
func _initialize() -> void:
	var path := "res://roundtrip.tscn"
	if OS.get_environment("FSDS_ROUNDTRIP") == "write":
		var node = load("res://addons/full_stack_ds/components/Switch/Switch.tscn").instantiate()
		node.label = "Saved in editor"
		var packed := PackedScene.new()
		assert(packed.pack(node) == OK)
		assert(ResourceSaver.save(packed, path) == OK)
		node.free()
		var card = load("res://addons/full_stack_ds/components/Card/Card.tscn").instantiate()
		var header = load("res://addons/full_stack_ds/components/Text/Text.tscn").instantiate()
		header.content = "Saved heading"
		card.get_part("header").add_child(header)
		header.owner = card
		var badge = load("res://addons/full_stack_ds/components/Badge/Badge.tscn").instantiate()
		badge.content = "Saved status"
		card.get_part("badge").add_child(badge)
		badge.owner = card
		card.set_editable_instance(badge, true)
		var glyph := ColorRect.new()
		glyph.name = "SavedGlyph"
		glyph.color = Color("#123456")
		glyph.custom_minimum_size = Vector2(10, 10)
		badge.get_part("icon").add_child(glyph)
		glyph.owner = card
		var action = load("res://addons/full_stack_ds/components/Button/Button.tscn").instantiate()
		action.content = "Saved action"
		card.get_part("actions").add_child(action)
		action.owner = card
		var composed := PackedScene.new()
		assert(composed.pack(card) == OK)
		assert(ResourceSaver.save(composed, "res://composed-roundtrip.tscn") == OK)
		card.free()
		var icon = load("res://addons/full_stack_ds/components/Icon/Icon.tscn").instantiate()
		icon.glyph_name = "check"
		icon.size_axis = "xl"
		icon.decorative = false
		icon.aria_label = "Saved check"
		var icon_scene := PackedScene.new()
		assert(icon_scene.pack(icon) == OK)
		assert(ResourceSaver.save(icon_scene, "res://glyph-roundtrip.tscn") == OK)
		icon.free()
	else:
		var node = load(path).instantiate()
		assert(node.label == "Saved in editor")
		assert(node.get_script().resource_path.ends_with("Switch.gd"))
		node.free()
		var card = load("res://composed-roundtrip.tscn").instantiate()
		assert(card.get_part("header").get_node("Text").content == "Saved heading")
		assert(card.get_part("badge").get_node("Badge").content == "Saved status")
		var saved_glyph = card.get_part("badge").get_node("Badge").get_part("icon").get_node_or_null("SavedGlyph")
		if saved_glyph == null:
			push_error("Composed icon was not serialized inside the nested Badge instance")
			card.free()
			quit(1)
			return
		assert(saved_glyph.color.is_equal_approx(Color("#123456")))
		assert(card.get_part("actions").get_node("Button").content == "Saved action")
		card.free()
		var icon = load("res://glyph-roundtrip.tscn").instantiate()
		assert(icon.glyph_name == "check" and icon.size_axis == "xl")
		assert(not icon.decorative and icon.aria_label == "Saved check")
		icon.free()
	print("FSDS_ROUNDTRIP_OK")
	quit()
