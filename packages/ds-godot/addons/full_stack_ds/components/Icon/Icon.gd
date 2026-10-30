@tool
class_name DSIcon
extends "res://addons/full_stack_ds/runtime/glyph.gd"

func _init() -> void:
	configuration = JSON.parse_string("{\"operation\":\"glyph\",\"nameProp\":\"name\",\"sizeProp\":\"size\",\"decorativeProp\":\"decorative\",\"labelProp\":\"ariaLabel\",\"svgFill\":\"none\",\"sizeHints\":{\"sm\":16,\"md\":20,\"lg\":24,\"xl\":32},\"sizeStyles\":{\"sm\":{\"width\":\"16px\",\"height\":\"16px\"},\"md\":{\"width\":\"20px\",\"height\":\"20px\"},\"lg\":{\"width\":\"24px\",\"height\":\"24px\"},\"xl\":{\"width\":\"32px\",\"height\":\"32px\"}},\"excluded\":[],\"defaults\":{\"size\":\"\\\"md\\\"\",\"decorative\":\"true\"},\"theme_color\":\"#141414\"}")
