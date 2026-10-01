extends PanelContainer
## The owned paint wrapper can remain visible while outgoing, but only the
## current slide belongs in assistive traversal. Consumer nodes stay untouched.
var accessibility_current := false:
	set(value):
		if accessibility_current == value: return
		accessibility_current = value
		queue_accessibility_update()

func _notification(what: int) -> void:
	if what == NOTIFICATION_ACCESSIBILITY_UPDATE:
		var element := get_accessibility_element()
		if element.is_valid():
			AccessibilityServer.update_set_flag(element, AccessibilityServer.FLAG_HIDDEN, not accessibility_current)
