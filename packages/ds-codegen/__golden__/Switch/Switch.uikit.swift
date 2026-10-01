// Hand-authored golden output. Not generated.
// See ../README.md for annotation conventions.

// SRC: framework-grammar (UIKit module import)
import UIKit

// SRC: contract.types.SwitchSize
public enum SwitchSize: String, CaseIterable {
    case sm
    case md
    case lg
}

// SRC: contract.name → class identifier
// SRC: anatomy.dom root is interactive (role=switch) → UIControl, not UIView
// SRC: semantic (role=switch + form.participates=true → UIControl subclass
//      so target/action and accessibilityTraits work natively)
public final class Switch: UIControl {

    // MARK: - State (ir.normalizedChannels[0]: checked)

    // SRC: contract.channels.checked.value=checked, valueType=boolean
    // SRC: framework-grammar (UIKit has no @Binding; controlled mode is
    //      enforced by the consumer calling setChecked(_:animated:) from
    //      their own state; uncontrolledChecked holds the default)
    private var _checked: Bool

    // SRC: ir.normalizedChannels[0] → read accessor
    public var checked: Bool {
        get { _checked }
        // SRC: ir.normalizedChannels[0] → write site goes through setChecked
        //      so the value-callback fires and accessibility updates run
        set { setChecked(newValue, animated: false) }
    }

    // SRC: contract.channels.checked.onChange=onChange
    // SRC: ir.normalizedChannels[0].callbackKind=value
    public var onChange: ((Bool) -> Void)?

    // SRC: contract.props.styled.members[name=size], default=md
    public var size: SwitchSize = .md {
        didSet { invalidateIntrinsicContentSize(); setNeedsLayout() }
    }

    // SRC: framework-grammar (UIView.isEnabled is the canonical disabled
    //      surface for UIControl subclasses)
    // SRC: contract.props.styled.members[name=disabled, type=boolean]
    //      maps to UIControl.isEnabled (inherited)

    // SRC: contract.props.styled.members[name=name, type=string]
    // SRC: form.participates=true — UIKit has no <form>, but `name` is
    //      retained for consumers that wire to a server-side form payload.
    public var name: String?

    // SRC: contract.props.styled.members[name=value, type=string]
    // SRC: form.serialization.valueSource=static:on
    public var value: String?

    // MARK: - Anatomy parts (contract.anatomy.parts)

    // SRC: anatomy.parts=[root, track, thumb, input]
    //      root → self (UIControl)
    //      track → trackView
    //      thumb → thumbView
    //      input → omitted; UIControl replaces native <input>
    private let trackView = UIView()
    private let thumbView = UIView()

    // MARK: - Init

    // SRC: framework-grammar (UIView designated init)
    public override init(frame: CGRect) {
        // SRC: contract.props.styled.members[defaultChecked] used at instantiation
        // SRC: framework-grammar (Swift requires all stored properties set
        //      before super.init)
        self._checked = false
        super.init(frame: frame)
        setupViews()
    }

    // SRC: framework-grammar (NSCoder init required for UIView subclasses)
    public required init?(coder: NSCoder) {
        self._checked = false
        super.init(coder: coder)
        setupViews()
    }

    private func setupViews() {
        // SRC: anatomy parts → addSubview wiring
        addSubview(trackView)
        trackView.addSubview(thumbView)

        // SRC: contract.tokens.root["switch.size.md.track.radius"]=full
        // SRC: framework-grammar (UIKit corner radius is CGFloat, "full"
        //      resolves to half the height at layout time)
        trackView.layer.masksToBounds = true
        thumbView.layer.masksToBounds = true

        // SRC: contract.tokens.root["switch.color.track.background"]
        //      fallback=#cecece
        trackView.backgroundColor = UIColor(white: 0.81, alpha: 1.0)
        // SRC: contract.tokens.root["switch.color.thumb.background"]
        //      fallback=#ffffff
        thumbView.backgroundColor = .white

        // SRC: a11y.keyboard=[{key=Space, action=Toggle}]
        // SRC: framework-a11y (UIKit on iOS has no Space key; on macOS
        //      via Catalyst, UIControlEvents.primaryActionTriggered fires
        //      on Space for accessibilityTraits=.button|.toggleButton.
        //      We register the gesture for tap on all platforms.)
        let tap = UITapGestureRecognizer(target: self, action: #selector(handleTap))
        addGestureRecognizer(tap)

        // SRC: contract.a11y.labeling[2]=aria-checked
        // SRC: framework-a11y (iOS uses accessibilityTraits, not aria-*;
        //      role=switch → no direct UIAccessibilityTraits.switch exists
        //      pre-iOS 17; .button + accessibilityValue("on"|"off") is
        //      the documented substitute)
        isAccessibilityElement = true
        accessibilityTraits = .button
        updateAccessibility()
    }

    // MARK: - Layout

    // SRC: contract.tokens.root["switch.size.md.track.width|height"]
    // GAP: only md tokens shipped; sm/lg are guessed.
    public override var intrinsicContentSize: CGSize {
        switch size {
        case .sm: return CGSize(width: 36, height: 18)  // GAP
        case .md: return CGSize(width: 48, height: 24)  // SRC: contract.tokens.root
        case .lg: return CGSize(width: 60, height: 30)  // GAP
        }
    }

    public override func layoutSubviews() {
        super.layoutSubviews()
        trackView.frame = bounds
        // SRC: contract.tokens.root["switch.size.md.track.radius"]=full → height/2
        trackView.layer.cornerRadius = bounds.height / 2

        // SRC: motion.transitions[name=toggle, properties=[transform]]
        // SRC: framework-grammar (UIKit transform via frame.origin.x for
        //      thumb position; checked=true → thumb at right edge)
        let thumbSize = bounds.height - 4
        let thumbX = _checked ? bounds.width - thumbSize - 2 : 2
        thumbView.frame = CGRect(x: thumbX, y: 2, width: thumbSize, height: thumbSize)
        thumbView.layer.cornerRadius = thumbSize / 2

        // SRC: contract.tokens.checked|disabled tokens (state-conditional)
        if !isEnabled {
            // SRC: contract.tokens.disabled["switch.color.track.background.disabled"]
            trackView.backgroundColor = UIColor(white: 0.81, alpha: 1.0)
        } else if _checked {
            // SRC: contract.tokens.checked["switch.color.track.background.checked"]
            //      fallback=#d9292b
            trackView.backgroundColor = UIColor(red: 0.85, green: 0.16, blue: 0.17, alpha: 1.0)
            // SRC: contract.tokens.checked["switch.color.thumb.background.checked"]
            thumbView.backgroundColor = .white
        } else {
            trackView.backgroundColor = UIColor(white: 0.81, alpha: 1.0)
            thumbView.backgroundColor = .white
        }
    }

    // MARK: - Interaction (ir.normalizedChannels[0])

    @objc private func handleTap() {
        // SRC: framework-a11y (respect isEnabled before toggling)
        guard isEnabled else { return }
        setChecked(!_checked, animated: true)
    }

    public func setChecked(_ next: Bool, animated: Bool) {
        guard _checked != next else { return }
        _checked = next
        // SRC: motion.reducedMotion=respect
        // SRC: framework-a11y (UIAccessibility.isReduceMotionEnabled)
        let duration = (animated && !UIAccessibility.isReduceMotionEnabled) ? 0.1 : 0.0
        // SRC: contract.motion.transitions[name=toggle, duration=core.motion.duration.short]
        // GAP: core.motion.duration.short fallback not in this contract;
        //      "100ms" is taken from switch.motion.duration fallback.
        UIView.animate(withDuration: duration) {
            self.setNeedsLayout()
            self.layoutIfNeeded()
        }
        updateAccessibility()
        // SRC: ir.normalizedChannels[0].changeHandlerProp=onChange
        onChange?(next)
        // SRC: form.participates=true → UIControl event for form consumers
        sendActions(for: .valueChanged)
    }

    private func updateAccessibility() {
        // SRC: contract.a11y.labeling[2]=aria-checked
        // SRC: framework-a11y (iOS: accessibilityValue replaces aria-checked)
        accessibilityValue = _checked ? "on" : "off"
    }
}
