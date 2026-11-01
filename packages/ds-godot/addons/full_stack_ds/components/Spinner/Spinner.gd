@tool
class_name DSSpinner
extends "res://addons/full_stack_ds/runtime/loop_visual.gd"

func _init() -> void:
	configuration = JSON.parse_string("{\"operation\":\"loop-visual\",\"targetPart\":\"visual\",\"durationMs\":800,\"multiplier\":1,\"easing\":[0,0,1,1],\"reducedValue\":0,\"sizeAxis\":\"size\",\"thicknessAxis\":\"thickness\",\"sizePixels\":{\"xs\":12,\"sm\":16,\"md\":20,\"lg\":24},\"thicknessPixels\":{\"hairline\":2,\"regular\":3,\"bold\":4},\"baseThicknessPx\":3,\"trackColor\":\"#d0d0d0\",\"accentColor\":\"#d92d2e\",\"hiddenProp\":\"ariaHidden\",\"labelProp\":\"label\",\"excluded\":[\"inline\",\"showAfterMs\"],\"defaults\":{},\"theme_color\":\"#141414\"}")
