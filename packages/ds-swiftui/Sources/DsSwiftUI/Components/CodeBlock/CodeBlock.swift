// @generated:start imports
import SwiftUI
// @generated:end

// @generated:start types
public enum CodeBlockLanguage: String, CaseIterable {
    case bash
    case css
    case html
    case javascript
    case json
    case jsx
    case markdown
    case plaintext
    case svelte
    case tsx
    case typescript
    case vue
}
public enum CodeBlockTokenType: String, CaseIterable {
    case comment
    case definition
    case keyword
    case plain
    case property
    case punctuation
    case `static`
    case string
    case tag
}
// @generated:end

// @generated:start component
/// Token scope data for CodeBlock (ir.tokenScopes → RN normal form: data consumed through FsdsTheme at render, never resolved constants). A caseless enum namespace because generic types cannot hold static stored properties.
enum CodeBlockTokens {
    public static let scopes: FsdsComponentTokenScopes = [
        "root": [
            "code-block.token.color.plain": FsdsComponentTokenDefinition(cssVar: "--fsds-code-block-token-color-plain", name: "code-block.token.color.plain", ref: "semantic.color.foreground.syntax.plain", fallback: .adaptive(light: "#141414", dark: "#fafafa")),
            "code-block.token.color.comment": FsdsComponentTokenDefinition(cssVar: "--fsds-code-block-token-color-comment", name: "code-block.token.color.comment", ref: "semantic.color.foreground.syntax.comment.color", fallback: .adaptive(light: "#474647", dark: "#a0a0a1")),
            "code-block.token.color.keyword": FsdsComponentTokenDefinition(cssVar: "--fsds-code-block-token-color-keyword", name: "code-block.token.color.keyword", ref: "semantic.color.foreground.syntax.keyword", fallback: .adaptive(light: "#013ab0", dark: "#00a9fb")),
            "code-block.token.color.definition": FsdsComponentTokenDefinition(cssVar: "--fsds-code-block-token-color-definition", name: "code-block.token.color.definition", ref: "semantic.color.foreground.syntax.definition", fallback: .adaptive(light: "#900909", dark: "#ee8181")),
            "code-block.token.color.punctuation": FsdsComponentTokenDefinition(cssVar: "--fsds-code-block-token-color-punctuation", name: "code-block.token.color.punctuation", ref: "semantic.color.foreground.syntax.punctuation", fallback: .adaptive(light: "#013ab0", dark: "#00a9fb")),
            "code-block.token.color.property": FsdsComponentTokenDefinition(cssVar: "--fsds-code-block-token-color-property", name: "code-block.token.color.property", ref: "semantic.color.foreground.syntax.property", fallback: .adaptive(light: "#6c3a00", dark: "#ec8802")),
            "code-block.token.color.static": FsdsComponentTokenDefinition(cssVar: "--fsds-code-block-token-color-static", name: "code-block.token.color.static", ref: "semantic.color.foreground.syntax.static", fallback: .adaptive(light: "#900909", dark: "#ee8181")),
            "code-block.token.color.string": FsdsComponentTokenDefinition(cssVar: "--fsds-code-block-token-color-string", name: "code-block.token.color.string", ref: "semantic.color.foreground.syntax.string", fallback: .adaptive(light: "#900909", dark: "#ee8181")),
            "code-block.token.color.tag": FsdsComponentTokenDefinition(cssVar: "--fsds-code-block-token-color-tag", name: "code-block.token.color.tag", ref: "semantic.color.foreground.syntax.tag", fallback: .adaptive(light: "#900909", dark: "#ee8181")),
        ],
    ]
}

public struct CodeBlockToken: View {
    public let kind: CodeBlockTokenType
    public var text: String
    @Environment(\.fsdsTheme) private var fsdsTheme

    public init(kind: CodeBlockTokenType, text: String) {
        self.kind = kind
        self.text = text
    }

    private func colorSlot(_ name: String) -> Color? {
        resolveFsdsLayeredTokens(CodeBlockTokens.scopes, fsdsTheme, layers: ["root"])[name]??.color
    }

    private var tokenColor: Color? {
        switch kind.rawValue {
        case "comment": return colorSlot("code-block.token.color.comment")
        case "definition": return colorSlot("code-block.token.color.definition")
        case "keyword": return colorSlot("code-block.token.color.keyword")
        case "plain": return colorSlot("code-block.token.color.plain")
        case "property": return colorSlot("code-block.token.color.property")
        case "punctuation": return colorSlot("code-block.token.color.punctuation")
        case "static": return colorSlot("code-block.token.color.static")
        case "string": return colorSlot("code-block.token.color.string")
        case "tag": return colorSlot("code-block.token.color.tag")
        default: return nil
        }
    }

    public var body: some View {
        SwiftUI.Text(verbatim: text).foregroundColor(tokenColor ?? .primary)
    }
}

public struct CodeBlockLine<Content: View>: View {
    public let number: Int
    public let showLineNumbers: Bool
    private let content: Content
    @Environment(\.fsdsTheme) private var fsdsTheme

    public init(number: Int, showLineNumbers: Bool = false, @ViewBuilder content: () -> Content) {
        self.number = number
        self.showLineNumbers = showLineNumbers
        self.content = content()
    }

    private var layered: [String: FsdsTokenValue?] {
        resolveFsdsLayeredTokens(CodeBlockTokens.scopes, fsdsTheme, layers: ["root"])
    }

    public var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: layered["code-block.gutter.size.gap"]??.px ?? 0) {
            if showLineNumbers {
                SwiftUI.Text(String(number))
                    .foregroundColor(layered["code-block.gutter.color.number"]??.color ?? .secondary)
                    .frame(minWidth: 28, alignment: .trailing)
                    .accessibilityHidden(true)
            }
            content
        }
    }
}

private struct FsdsSourceLine {
    var tokens: [CodeBlockToken]
}

@MainActor
private func fsdsSplitSource(_ code: String, tokens: [CodeBlockToken]?, highlight: Bool) -> (lines: [FsdsSourceLine], highlighted: Bool) {
    let valid = highlight && tokens != nil && tokens!.map(\.text).joined() == code
    let stream = valid ? tokens! : [CodeBlockToken(kind: .plain, text: code)]
    var lines: [FsdsSourceLine] = []
    var current: [CodeBlockToken] = []
    var skipLF = false
    for token in stream {
        for character in token.text {
            if skipLF {
                skipLF = false
                if character == "\n" { continue }
            }
            if character == "\r" || character == "\r\n" || character == "\n" {
                lines.append(FsdsSourceLine(tokens: current))
                current = []
                skipLF = character == "\r"
                continue
            }
            if let last = current.indices.last, current[last].kind == token.kind {
                current[last].text.append(character)
            } else {
                current.append(CodeBlockToken(kind: token.kind, text: String(character)))
            }
        }
    }
    lines.append(FsdsSourceLine(tokens: current))
    return (lines, valid)
}

public struct CodeBlock: View {
    public let code: String
    public let tokens: [CodeBlockToken]?
    public let highlight: Bool
    public let showLineNumbers: Bool
    private let customContent: AnyView?
    @Environment(\.fsdsTheme) private var fsdsTheme

    public init(code: String = "", tokens: [CodeBlockToken]? = nil, highlight: Bool = true, showLineNumbers: Bool = false) {
        self.code = code
        self.tokens = tokens
        self.highlight = highlight
        self.showLineNumbers = showLineNumbers
        self.customContent = nil
    }

    public init<Content: View>(@ViewBuilder content: () -> Content) {
        self.code = ""
        self.tokens = nil
        self.highlight = true
        self.showLineNumbers = false
        self.customContent = AnyView(content())
    }

    private var layered: [String: FsdsTokenValue?] {
        resolveFsdsLayeredTokens(CodeBlockTokens.scopes, fsdsTheme, layers: ["root"])
    }

    public var body: some View {
        let source = fsdsSplitSource(code, tokens: tokens, highlight: highlight)
        Group {
            if let customContent {
                customContent
            } else if showLineNumbers || source.highlighted {
                VStack(alignment: .leading, spacing: 0) {
                    ForEach(source.lines.indices, id: \.self) { index in
                        CodeBlockLine(number: index + 1, showLineNumbers: showLineNumbers) {
                            HStack(spacing: 0) {
                                ForEach(source.lines[index].tokens.indices, id: \.self) { tokenIndex in
                                    let token = source.lines[index].tokens[tokenIndex]
                                    if source.highlighted {
                                        CodeBlockToken(kind: token.kind, text: token.text)
                                    } else {
                                        SwiftUI.Text(verbatim: token.text)
                                    }
                                }
                            }
                        }
                    }
                }
                .accessibilityElement(children: .ignore)
                .accessibilityLabel(code)
            } else {
                SwiftUI.Text(verbatim: code)
            }
        }
        .font(.system(.body, design: .monospaced))
        .padding(.vertical, layered["box-model.padding-block-start"]??.px ?? 0)
        .padding(.horizontal, layered["box-model.padding-inline-start"]??.px ?? 0)
        .background(layered["code-block.color.background.default"]??.color ?? .clear)
        .clipShape(RoundedRectangle(cornerRadius: layered["code-block.size.radius.default"]??.px ?? 0))
        .foregroundColor(layered["code-block.color.foreground.primary"]??.color ?? .primary)
    }
}
// @generated:end
