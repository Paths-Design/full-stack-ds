@tool
class_name DSLabel
extends "res://addons/full_stack_ds/runtime/associated_label.gd"

func _init() -> void:
	configuration = JSON.parse_string("{\"operation\":\"associated-label\",\"form\":{\"kind\":\"associated-label\",\"part\":\"root\",\"targetProp\":\"htmlFor\",\"formProp\":\"form\"},\"colors\":{\"foreground\":\"#141414\"},\"excludedProps\":[\"form\"],\"omissions\":[\"HTML form ownership is not projected\",\"screen-reader label association requires separate proof\",\"style root/line-height: no native form paint carrier\"],\"theme\":\"source-bearing native form colors\",\"proof\":\"requires-runtime-witness\"}")
