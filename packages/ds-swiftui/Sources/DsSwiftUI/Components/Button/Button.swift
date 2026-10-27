// @generated:start imports
import SwiftUI
// @generated:end

// @generated:start types
public enum ButtonSize: String, CaseIterable {
    case small
    case medium
    case large
}
public enum ButtonVariant: String, CaseIterable {
    case primary
    case secondary
    case tertiary
    case ghost
    case destructive
    case outline
}
public enum ButtonType: String, CaseIterable {
    case button
    case submit
    case reset
}
// @generated:end

// @generated:start component
/// Token scope data for FsdsButton (ir.tokenScopes → RN normal form: data consumed through FsdsTheme at render, never resolved constants). A caseless enum namespace because generic types cannot hold static stored properties.
enum ButtonTokens {
    public static let scopes: FsdsComponentTokenScopes = [
        "root": [
            "box-model.padding-block-start": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-padding-block-start", name: "box-model.padding-block-start", ref: "semantic.action.size.medium.padding-block", fallback: .string("4px")),
            "box-model.padding-inline-start": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-padding-inline-start", name: "box-model.padding-inline-start", ref: "semantic.action.size.medium.padding-inline", fallback: .string("8px")),
            "box-model.min-height": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-min-height", name: "box-model.min-height", ref: "semantic.action.size.medium.min-height", fallback: .string("32px")),
            "button.color.background.default": FsdsComponentTokenDefinition(cssVar: "--fsds-button-color-background-default", name: "button.color.background.default", ref: "semantic.color.action.background.primary.default", fallback: .string("#0566fe")),
            "button.color.foreground.default": FsdsComponentTokenDefinition(cssVar: "--fsds-button-color-foreground-default", name: "button.color.foreground.default", ref: "semantic.color.foreground.inverse", fallback: .adaptive(light: "#fafafa", dark: "#fafafa")),
            "button.color.border.default": FsdsComponentTokenDefinition(cssVar: "--fsds-button-color-border-default", name: "button.color.border.default", ref: "semantic.color.border.default", fallback: .adaptive(light: "#a0a0a1", dark: "#5c5b5c")),
            "button.size.radius": FsdsComponentTokenDefinition(cssVar: "--fsds-button-size-radius", name: "button.size.radius", ref: "semantic.shape.control.radius.pill", fallback: .string("9999px")),
            "button.size.border": FsdsComponentTokenDefinition(cssVar: "--fsds-button-size-border", name: "button.size.border", ref: "semantic.shape.control.border.defaultWidth", fallback: .string("1px")),
        ],
        "variant_small": [
            "box-model.padding-block-start": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-padding-block-start", name: "box-model.padding-block-start", ref: "core.spacing.size.03", fallback: .string("4px")),
            "box-model.padding-inline-start": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-padding-inline-start", name: "box-model.padding-inline-start", ref: "core.spacing.size.04", fallback: .string("8px")),
            "box-model.min-height": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-min-height", name: "box-model.min-height", ref: "core.dimension.actionMinHeightSmall", fallback: .string("28px")),
        ],
        "variant_medium": [
            "box-model.padding-block-start": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-padding-block-start", name: "box-model.padding-block-start", ref: "core.spacing.size.04", fallback: .string("8px")),
            "box-model.padding-inline-start": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-padding-inline-start", name: "box-model.padding-inline-start", ref: "core.spacing.size.05", fallback: .string("12px")),
            "box-model.min-height": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-min-height", name: "box-model.min-height", ref: "core.dimension.actionMinHeight", fallback: .string("36px")),
        ],
        "variant_large": [
            "box-model.padding-block-start": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-padding-block-start", name: "box-model.padding-block-start", ref: "core.spacing.size.05", fallback: .string("12px")),
            "box-model.padding-inline-start": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-padding-inline-start", name: "box-model.padding-inline-start", ref: "core.spacing.size.06", fallback: .string("16px")),
            "box-model.min-height": FsdsComponentTokenDefinition(cssVar: "--fsds-box-model-min-height", name: "box-model.min-height", ref: "core.dimension.actionMinHeightLarge", fallback: .string("48px")),
        ],
        "variant_primary": [
            "button.color.background.default": FsdsComponentTokenDefinition(cssVar: "--fsds-button-color-background-default", name: "button.color.background.default", ref: "semantic.color.action.background.primary.default", fallback: .string("#0566fe")),
            "button.color.foreground.default": FsdsComponentTokenDefinition(cssVar: "--fsds-button-color-foreground-default", name: "button.color.foreground.default", ref: "semantic.color.foreground.inverse", fallback: .adaptive(light: "#fafafa", dark: "#fafafa")),
            "button.color.border.default": FsdsComponentTokenDefinition(cssVar: "--fsds-button-color-border-default", name: "button.color.border.default", ref: "semantic.color.action.background.primary.default", fallback: .string("#0566fe")),
        ],
        "variant_secondary": [
            "button.color.background.default": FsdsComponentTokenDefinition(cssVar: "--fsds-button-color-background-default", name: "button.color.background.default", ref: "semantic.color.action.background.secondary.default", fallback: .adaptive(light: "#fafafa", dark: "#141414")),
            "button.color.foreground.default": FsdsComponentTokenDefinition(cssVar: "--fsds-button-color-foreground-default", name: "button.color.foreground.default", ref: "semantic.color.foreground.primary", fallback: .adaptive(light: "#141414", dark: "#fafafa")),
            "button.color.border.default": FsdsComponentTokenDefinition(cssVar: "--fsds-button-color-border-default", name: "button.color.border.default", ref: "semantic.color.border.default", fallback: .adaptive(light: "#a0a0a1", dark: "#5c5b5c")),
        ],
        "variant_tertiary": [
            "button.color.background.default": FsdsComponentTokenDefinition(cssVar: "--fsds-button-color-background-default", name: "button.color.background.default", literal: .string("transparent")),
            "button.color.foreground.default": FsdsComponentTokenDefinition(cssVar: "--fsds-button-color-foreground-default", name: "button.color.foreground.default", ref: "semantic.color.foreground.primary", fallback: .adaptive(light: "#141414", dark: "#fafafa")),
            "button.color.border.default": FsdsComponentTokenDefinition(cssVar: "--fsds-button-color-border-default", name: "button.color.border.default", literal: .string("transparent")),
        ],
        "variant_destructive": [
            "button.color.background.default": FsdsComponentTokenDefinition(cssVar: "--fsds-button-color-background-default", name: "button.color.background.default", literal: .string("transparent")),
            "button.color.foreground.default": FsdsComponentTokenDefinition(cssVar: "--fsds-button-color-foreground-default", name: "button.color.foreground.default", ref: "semantic.color.foreground.on.danger.subtle", fallback: .adaptive(light: "#900909", dark: "#ee8181")),
            "button.color.border.default": FsdsComponentTokenDefinition(cssVar: "--fsds-button-color-border-default", name: "button.color.border.default", ref: "semantic.color.border.danger", fallback: .adaptive(light: "#b31b1b", dark: "#d92d2e")),
        ],
        "variant_ghost": [
            "button.color.background.default": FsdsComponentTokenDefinition(cssVar: "--fsds-button-color-background-default", name: "button.color.background.default", literal: .string("transparent")),
            "button.color.foreground.default": FsdsComponentTokenDefinition(cssVar: "--fsds-button-color-foreground-default", name: "button.color.foreground.default", ref: "semantic.color.foreground.primary", fallback: .adaptive(light: "#141414", dark: "#fafafa")),
            "button.color.border.default": FsdsComponentTokenDefinition(cssVar: "--fsds-button-color-border-default", name: "button.color.border.default", literal: .string("transparent")),
        ],
        "variant_outline": [
            "button.color.background.default": FsdsComponentTokenDefinition(cssVar: "--fsds-button-color-background-default", name: "button.color.background.default", literal: .string("transparent")),
            "button.color.foreground.default": FsdsComponentTokenDefinition(cssVar: "--fsds-button-color-foreground-default", name: "button.color.foreground.default", ref: "semantic.color.foreground.primary", fallback: .adaptive(light: "#141414", dark: "#fafafa")),
            "button.color.border.default": FsdsComponentTokenDefinition(cssVar: "--fsds-button-color-border-default", name: "button.color.border.default", ref: "semantic.color.border.default", fallback: .adaptive(light: "#a0a0a1", dark: "#5c5b5c")),
        ],
    ]
}

/// Emitted through the projected-children action path: interactive button root with a single consumer content region.
/// SwiftUI reserves the `Button` type name; this target exports it as `FsdsButton`.
public struct FsdsButton<Label: View>: View {
    private var fsdsScopes: FsdsComponentTokenScopes {
        ButtonTokens.scopes
    }
    private let size: ButtonSize
    private let variant: ButtonVariant
    private let disabled: Bool
    private let loading: Bool
    private let accessibilityLabel: String?
    private let onTap: (() -> Void)?
    private let label: Label
    @Environment(\.fsdsTheme) private var fsdsTheme

    public init(
        size: ButtonSize = .medium,
        variant: ButtonVariant = .primary,
        disabled: Bool = false,
        loading: Bool = false,
        accessibilityLabel: String? = nil,
        onTap: (() -> Void)? = nil,
        @ViewBuilder label: () -> Label
    ) {
        self.size = size
        self.variant = variant
        self.disabled = disabled
        self.loading = loading
        self.accessibilityLabel = accessibilityLabel
        self.onTap = onTap
        self.label = label()
    }

    private var layered: [String: FsdsTokenValue?] {
        resolveFsdsLayeredTokens(
            fsdsScopes,
            fsdsTheme,
            layers: ["root", "variant_\(size.rawValue)", "variant_\(variant.rawValue)"]
        )
    }

    private func colorSlot(_ suffix: String) -> Color? {
        layered.first { $0.key.hasSuffix(suffix) }?.value?.color
    }

    private func pxSlot(_ suffix: String) -> CGFloat? {
        layered.first { $0.key.hasSuffix(suffix) }?.value?.px
    }

    private var background: Color { colorSlot("color.background.default") ?? .accentColor }
    private var foreground: Color { colorSlot("color.foreground.default") ?? .primary }
    private var borderColor: Color { colorSlot("color.border.default") ?? .clear }
    private var borderWidth: CGFloat { pxSlot("size.border") ?? 0 }
    private var radius: CGFloat { pxSlot("size.radius") ?? 0 }
    private var blockPadding: CGFloat { pxSlot("padding-block-start") ?? 0 }
    private var inlinePadding: CGFloat { pxSlot("padding-inline-start") ?? 0 }
    private var minHeight: CGFloat { pxSlot("min-height") ?? 0 }

    @ViewBuilder
    private var labelContent: some View {
        if loading {
            ProgressView().controlSize(.small)
        } else {
            label
        }
    }

    public var body: some View {
        Button(action: { onTap?() }) {
            labelContent
                .padding(.vertical, blockPadding)
                .padding(.horizontal, inlinePadding)
                .frame(minHeight: minHeight)
                .background(background)
                .clipShape(RoundedRectangle(cornerRadius: radius, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: radius, style: .continuous).stroke(borderColor, lineWidth: borderWidth))
        }
        .buttonStyle(.plain)
        .foregroundStyle(foreground)
        .disabled(disabled || loading)
        .fsdsAccessibilityLabel(accessibilityLabel)
    }
}
// @generated:end
