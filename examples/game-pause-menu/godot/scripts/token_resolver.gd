class_name TokenResolver
extends RefCounted

## Resolves the parity palette from the committed token graph instead of a
## lane-local palette copy.
##
## `setup.sh` copies `resolved.tokens.json` and the Orion brand file into
## `res://fixtures/ds-tokens/`; this resolver turns an authority `colorTokens` /
## `typeTokens` provenance map into the concrete values the lane renders, using
## the same light/dark extension semantics as the token build.

const RESOLVED_PATH := "res://fixtures/ds-tokens/resolved.tokens.json"
const BRAND_PATH := "res://fixtures/ds-tokens/orion.tokens.json"
const REM_PX := 16.0

var resolved: Dictionary = {}
var brand: Dictionary = {}
var errors: Array[String] = []


static func load_from_project() -> TokenResolver:
	var resolver := TokenResolver.new()
	resolver.resolved = resolver._read_map(RESOLVED_PATH, false)
	resolver.brand = resolver._read_map(BRAND_PATH, true)
	return resolver


func ok() -> bool:
	return errors.is_empty() and not resolved.is_empty() and not brand.is_empty()


func _read_map(path: String, is_brand: bool) -> Dictionary:
	if not FileAccess.file_exists(path):
		errors.append("%s: token source missing (run setup.sh)" % path)
		push_error("TOKEN_SOURCE_MISSING: " + path)
		return {}
	var text := FileAccess.get_file_as_string(path)
	var parsed = JSON.parse_string(text)
	if not parsed is Dictionary:
		errors.append("%s: token source must be a JSON object" % path)
		push_error("TOKEN_SOURCE_MALFORMED: " + path)
		return {}
	var out: Dictionary = {}
	_walk(parsed, [], out, is_brand)
	return out


func _walk(node, path: Array, out: Dictionary, is_brand: bool) -> void:
	if not node is Dictionary:
		return
	if node.has("$value"):
		var joined := ".".join(PackedStringArray(path.map(func(part): return str(part))))
		if is_brand:
			joined = "semantic." + joined
		out[joined] = node
		return
	for key in node:
		var key_text := str(key)
		if key_text.begins_with("$"):
			continue
		# Brand component overrides address component-local slots, not the
		# semantic layer; they are not part of the parity palette.
		if is_brand and path.is_empty() and key_text == "components":
			continue
		var next := path.duplicate()
		next.append(key_text)
		_walk(node[key], next, out, is_brand)


func _node_for(token: String) -> Array:
	if brand.has(token):
		return [brand[token], true]
	if resolved.has(token):
		return [resolved[token], false]
	return []


func _themed(value, mode: String):
	if not value is Dictionary:
		return value
	if value.has("light") or value.has("dark"):
		var key := "light" if mode == "light" else "dark"
		return value.get(key, value)
	return value


func _token_value(token: String, mode: String):
	var pair := _node_for(token)
	if pair.is_empty():
		return null
	var node: Dictionary = pair[0]
	var value = null
	if pair[1]:
		var extensions: Dictionary = node.get("$extensions", {})
		value = extensions.get("fsds.light" if mode == "light" else "fsds.dark")
		if value == null:
			value = node.get("$value")
	else:
		value = node.get("$value")
	return _themed(value, mode)


func resolve_color(token: String, mode := "dark") -> String:
	var value = _token_value(token, mode)
	if not value is String:
		return ""
	var text := (value as String).strip_edges()
	if text.length() == 7 and text.begins_with("#") and text.substr(1).is_valid_hex_number():
		return text
	return ""


func resolve_size(token: String, mode := "dark") -> float:
	var value = _token_value(token, mode)
	return _dimension_px(value)


func _dimension_px(value) -> float:
	if value is float or value is int:
		return float(value)
	if value is String:
		var text := (value as String).strip_edges()
		if text.ends_with("px"):
			return float(text.trim_suffix("px"))
		if text.ends_with("rem"):
			return float(text.trim_suffix("rem")) * REM_PX
		return NAN
	if value is Dictionary:
		if value.has("value") and value.has("unit"):
			match str(value["unit"]):
				"px":
					return float(value["value"])
				"rem":
					return float(value["value"]) * REM_PX
				_:
					return NAN
		if value.has("light") or value.has("dark"):
			return _dimension_px(_themed(value, "dark"))
	return NAN


## Overwrite an authority parity dictionary's raw `colors`/`type` values with
## token-resolved values. The literal fixture values remain the checked fallback.
func apply_to_authority(authority: Dictionary) -> void:
	var colors: Dictionary = authority.get("colors", {})
	for name in authority.get("colorTokens", {}):
		var provenance: Dictionary = authority["colorTokens"][name]
		var resolved_color := resolve_color(str(provenance.get("token", "")), str(provenance.get("mode", "dark")))
		if resolved_color.is_empty():
			errors.append("color '%s': token '%s' does not resolve" % [name, provenance.get("token", "")])
			continue
		colors[name] = resolved_color
	authority["colors"] = colors
	var type: Dictionary = authority.get("type", {})
	for key in authority.get("typeTokens", {}):
		var provenance: Dictionary = authority["typeTokens"][key]
		var resolved_size := resolve_size(str(provenance.get("token", "")), str(provenance.get("mode", "dark")))
		if is_nan(resolved_size):
			errors.append("type '%s': token '%s' does not resolve" % [key, provenance.get("token", "")])
			continue
		type[key] = resolved_size
	authority["type"] = type
