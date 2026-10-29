import SwiftUI

/// Source-ordered, target-admitted text facts emitted from nativeStyleRules.
public struct FsdsNativeTextDeclaration: Sendable {
    public let property: String
    public let value: String
    public let token: String?
    public let designSlot: String?

    public init(property: String, value: String, token: String? = nil, designSlot: String? = nil) {
        self.property = property
        self.value = value
        self.token = token
        self.designSlot = designSlot
    }
}

public struct FsdsNativeTextPredicate: Sendable {
    public let axis: String
    public let value: String

    public init(axis: String, value: String) {
        self.axis = axis
        self.value = value
    }
}

public struct FsdsNativeTextRule: Sendable {
    public let part: String
    public let predicates: [FsdsNativeTextPredicate]
    public let declarations: [FsdsNativeTextDeclaration]

    public init(part: String, predicates: [FsdsNativeTextPredicate] = [], declarations: [FsdsNativeTextDeclaration]) {
        self.part = part
        self.predicates = predicates
        self.declarations = declarations
    }
}

public struct FsdsNativeTextStyleError: Error, CustomStringConvertible {
    public let code: String
    public let detail: String

    public var description: String { "\(code): \(detail)" }

    public init(_ code: String, _ detail: String) {
        self.code = code
        self.detail = detail
    }
}

public struct FsdsResolvedNativeTextStyle {
    public let raw: [String: FsdsTokenValue]
    public let color: Color?
    public let fontSize: CGFloat?
    public let fontWeight: Font.Weight?
}

private extension FsdsTokenValue {
    var nativeTextPoints: CGFloat? {
        switch self {
        case .adaptive: return nil
        case .number(let number): return CGFloat(number)
        case .string(let string):
            let trimmed = string.trimmingCharacters(in: .whitespacesAndNewlines)
            let factor: Double
            let magnitude: String
            if trimmed.hasSuffix("rem") {
                factor = 16
                magnitude = String(trimmed.dropLast(3))
            } else if trimmed.hasSuffix("px") {
                factor = 1
                magnitude = String(trimmed.dropLast(2))
            } else {
                factor = 1
                magnitude = trimmed
            }
            guard let number = Double(magnitude), number.isFinite else { return nil }
            return CGFloat(number * factor)
        }
    }

    var nativeFontWeight: Font.Weight? {
        guard let number = nativeTextPoints, number.isFinite else { return nil }
        switch Int(number) {
        case 100 where number == 100: return .ultraLight
        case 200 where number == 200: return .thin
        case 300 where number == 300: return .light
        case 400 where number == 400: return .regular
        case 500 where number == 500: return .medium
        case 600 where number == 600: return .semibold
        case 700 where number == 700: return .bold
        case 800 where number == 800: return .heavy
        case 900 where number == 900: return .black
        default: return nil
        }
    }
}

/// Root text facts inherit into a named content part; that part's declarations
/// override root facts. Matching token definitions resolve after all active
/// rules, so a variant can rebind a root property without restating it.
public func resolveFsdsNativeTextStyle(
    _ rules: [FsdsNativeTextRule],
    theme: FsdsTheme,
    variants: [String: String],
    part: String
) throws -> FsdsResolvedNativeTextStyle {
    let active = rules.filter { rule in
        (rule.part == "root" || rule.part == part) &&
        rule.predicates.allSatisfy { variants[$0.axis] == $0.value }
    }
    var definitions: [String: FsdsNativeTextDeclaration] = [:]
    for rule in active {
        for declaration in rule.declarations where declaration.property.contains(".") {
            definitions[declaration.property] = declaration
        }
    }

    func resolve(_ declaration: FsdsNativeTextDeclaration, visiting: Set<String>) throws -> FsdsTokenValue {
        if let slot = declaration.designSlot, let override = theme.tokens[slot] { return override }
        guard let token = declaration.token else { return .string(declaration.value) }
        if let override = theme.tokens[token] { return override }
        guard let definition = definitions[token] else { return .string(declaration.value) }
        if visiting.contains(token) {
            throw FsdsNativeTextStyleError("FSDS_NATIVE_TEXT_TOKEN_CYCLE", token)
        }
        return try resolve(definition, visiting: visiting.union([token]))
    }

    var selected: [String: FsdsNativeTextDeclaration] = [:]
    let ordered = active.filter { $0.part == "root" } + (part == "root" ? [] : active.filter { $0.part == part })
    for rule in ordered {
        for declaration in rule.declarations where ["color", "font-size", "font-weight"].contains(declaration.property) {
            selected[declaration.property] = declaration
        }
    }
    var raw: [String: FsdsTokenValue] = [:]
    for (property, declaration) in selected {
        raw[property] = try resolve(declaration, visiting: [])
    }
    let color = raw["color"]?.color
    let fontSize = raw["font-size"]?.nativeTextPoints
    let fontWeight = raw["font-weight"]?.nativeFontWeight
    if raw["color"] != nil && color == nil { throw FsdsNativeTextStyleError("FSDS_NATIVE_TEXT_COLOR_UNSUPPORTED", "\(raw["color"]!)") }
    if raw["font-size"] != nil && (fontSize == nil || fontSize! <= 0) { throw FsdsNativeTextStyleError("FSDS_NATIVE_TEXT_SIZE_UNSUPPORTED", "\(raw["font-size"]!)") }
    if raw["font-weight"] != nil && fontWeight == nil { throw FsdsNativeTextStyleError("FSDS_NATIVE_TEXT_WEIGHT_UNSUPPORTED", "\(raw["font-weight"]!)") }
    return FsdsResolvedNativeTextStyle(raw: raw, color: color, fontSize: fontSize, fontWeight: fontWeight)
}
