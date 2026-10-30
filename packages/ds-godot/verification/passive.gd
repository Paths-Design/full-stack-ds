extends RefCounted

# The saved scene uses public generated instances, not replacement Labels/rules.
static func fixture() -> Control:
	var root := Control.new()
	root.name = "Passive"
	root.size = Vector2(250, 144)
	var text = load("res://addons/full_stack_ds/components/Text/Text.tscn").instantiate()
	text.name = "SavedText"
	text.content = "Saved mixed CASE sentence too long for one narrow line"
	text.variant = "headline"
	text.size_axis = "lg"
	text.weight = "semibold"
	text.align = "right"
	text.transform = "uppercase"
	text.truncate = true
	text.size = Vector2(220, 32)
	root.add_child(text)
	text.owner = root
	for orientation in ["horizontal", "vertical"]:
		var rule = load("res://addons/full_stack_ds/components/Divider/Divider.tscn").instantiate()
		rule.name = "SavedHorizontal" if orientation == "horizontal" else "SavedVertical"
		rule.orientation = orientation
		rule.thickness = "4px"
		rule.title = "Saved " + orientation + " separator"
		rule.position = Vector2(0, 40 if orientation == "horizontal" else 80)
		rule.size = Vector2(220, 32 if orientation == "horizontal" else 48)
		root.add_child(rule)
		rule.owner = root
	return root

static func serialized_settings_match(root: Control) -> bool:
	var text = root.get_node("SavedText")
	var horizontal = root.get_node("SavedHorizontal")
	var vertical = root.get_node("SavedVertical")
	return text.content == "Saved mixed CASE sentence too long for one narrow line" and text.variant == "headline" and text.size_axis == "lg" and text.weight == "semibold" and text.align == "right" and text.transform == "uppercase" and text.truncate and horizontal.orientation == "horizontal" and vertical.orientation == "vertical" and horizontal.thickness == "4px" and vertical.thickness == "4px" and horizontal.title == "Saved horizontal separator" and vertical.title == "Saved vertical separator"
