@tool
class_name DSDivider
extends "res://addons/full_stack_ds/runtime/static_content.gd"

func _init() -> void:
	configuration = JSON.parse_string("{\"operation\":\"rule\",\"excluded\":[\"decorative\"],\"styles\":[{\"source\":\"root\",\"predicates\":[],\"declarations\":[{\"property\":\"border-top-color\",\"value\":\"#d0d0d0\",\"token\":\"divider.color\"},{\"property\":\"border-top-width\",\"value\":\"1px\",\"token\":\"divider.size.thickness\"},{\"property\":\"margin-top\",\"value\":\"8px\",\"token\":\"divider.spacing.margin\"},{\"property\":\"margin-bottom\",\"value\":\"8px\",\"token\":\"divider.spacing.margin\"}]},{\"source\":\"--vertical\",\"predicates\":[{\"kind\":\"variant\",\"axis\":\"orientation\",\"value\":\"vertical\"}],\"declarations\":[{\"property\":\"border-left-color\",\"value\":\"#d0d0d0\",\"token\":\"divider.color\"},{\"property\":\"border-left-width\",\"value\":\"1px\",\"token\":\"divider.size.thickness\"},{\"property\":\"margin-left\",\"value\":\"8px\",\"token\":\"divider.spacing.margin\"},{\"property\":\"margin-right\",\"value\":\"8px\",\"token\":\"divider.spacing.margin\"}]}],\"defaults\":{},\"theme_color\":\"#141414\"}")
