extends RefCounted
## One active-time budget. The owning Control supplies monotonic timestamps,
## platform pause reasons and index acknowledgements; paint never advances it.
signal index_requested(next: int)
var index := 0
var count := 0
var duration_ms := 0.0
var remaining_ms := 0.0
var playing := false
var pending := false
var direction := 1
var revision := 0
var pauses: Dictionary = {}
var _last_ms := 0.0
var _auto_play := false
var _focus_stopped := false
var _initialized := false
var _destroyed := false
var _identity := ""

func valid() -> bool:
	return count > 1 and not _destroyed

func running() -> bool:
	return valid() and playing and not pending and pauses.is_empty() and duration_ms > 0.0

func elapsed() -> float:
	return clampf(1.0 - remaining_ms / duration_ms, 0.0, 1.0) if duration_ms > 0.0 else 0.0

func tick(now_ms: float) -> void:
	if _destroyed: return
	var delta := maxf(0.0, now_ms - _last_ms)
	_last_ms = now_ms
	if not running(): return
	remaining_ms = maxf(0.0, remaining_ms - delta)
	if remaining_ms <= 0.0: request(index + 1, now_ms)

func sync(next_index: int, labels: Array, keys: Array, dwell_ms: float, auto_play: bool, now_ms: float) -> void:
	if _destroyed: return
	# Account elapsed time without requesting against the previous composition.
	if running(): remaining_ms = maxf(0.0, remaining_ms - maxf(0.0, now_ms - _last_ms))
	_last_ms = now_ms
	var next_identity := JSON.stringify([labels, keys])
	var changed := not _initialized or next_index != index or next_identity != _identity
	var timing_changed := dwell_ms != duration_ms
	if not _initialized or auto_play != _auto_play: playing = auto_play and not _focus_stopped
	if changed:
		if not pending: direction = 1 if next_index >= index else -1
		pending = false
		revision += 1
	count = keys.size() if labels.size() == keys.size() else 0
	index = clampi(next_index, 0, maxi(0, count - 1))
	duration_ms = dwell_ms if is_finite(dwell_ms) and dwell_ms > 0.0 else 0.0
	if changed or timing_changed: remaining_ms = duration_ms
	_identity = next_identity
	_auto_play = auto_play
	_initialized = true

func request(next: int, now_ms: float) -> void:
	if not valid(): return
	var wrapped := posmod(next, count)
	if wrapped == index: return
	direction = 1 if next > index else -1
	if running(): remaining_ms = maxf(0.0, remaining_ms - maxf(0.0, now_ms - _last_ms))
	_last_ms = now_ms
	pending = true
	index_requested.emit(wrapped)

func pause(reason: String, now_ms: float) -> void:
	if running(): remaining_ms = maxf(0.0, remaining_ms - maxf(0.0, now_ms - _last_ms))
	_last_ms = now_ms
	pauses[reason] = true

func resume(reason: String, now_ms: float) -> void:
	if running(): remaining_ms = maxf(0.0, remaining_ms - maxf(0.0, now_ms - _last_ms))
	_last_ms = now_ms
	pauses.erase(reason)

func stop(now_ms: float) -> void:
	pause("focus-update", now_ms)
	playing = false
	_focus_stopped = true
	pauses.erase("focus-update")

func rotate(enabled: bool, now_ms: float) -> void:
	pause("rotation-update", now_ms)
	playing = enabled
	_focus_stopped = false
	if remaining_ms <= 0.0 and not pending: remaining_ms = duration_ms
	pauses.erase("rotation-update")

func begin_transition(now_ms: float) -> int:
	pause("transition", now_ms)
	remaining_ms = duration_ms
	return revision

func finish_transition(owner: int, now_ms: float) -> void:
	if owner == revision: resume("transition", now_ms)

func destroy() -> void:
	_destroyed = true
	playing = false
	pauses.clear()
