import type { ComponentIR, HighlightTransformIR } from "../../../ir.js";
import { highlightTokenTypes } from "../../../highlight/token-types.js";

/** SwiftUI realization of the framework-neutral supplied-source transform. */
export function emitSwiftHighlightComponent(
  ir: ComponentIR,
  transform: HighlightTransformIR,
  tokenScopes: string,
): string {
  const name = ir.name;
  const { tokenName, kindName: tokenType } = highlightTokenTypes(ir, transform);
  const lineName = `${name}${transform.linePart!.charAt(0).toUpperCase()}${transform.linePart!.slice(1)}`;
  const prefix = ir.cssPrefix;
  const tokenColor = (kind: string) => `${prefix}.${transform.tokenPart}.color.${kind}`;
  const palette = ir.definedTypes[tokenType];
  if (palette?.kind !== "union" || !palette.values) throw new Error(`${name}: highlight token kinds require a union`);
  const cases = palette.values.map((kind) => `        case ${JSON.stringify(kind)}: return colorSlot(${JSON.stringify(tokenColor(kind))})`).join("\n");

  return String.raw`// @generated:start component
${tokenScopes}

public struct ${tokenName}: View {
    public let kind: ${tokenType}
    public var text: String
    @Environment(\.fsdsTheme) private var fsdsTheme

    public init(kind: ${tokenType}, text: String) {
        self.kind = kind
        self.text = text
    }

    private func colorSlot(_ name: String) -> Color? {
        resolveFsdsLayeredTokens(${name}Tokens.scopes, fsdsTheme, layers: ["root"])[name]??.color
    }

    private var tokenColor: Color? {
        switch kind.rawValue {
${cases}
        default: return nil
        }
    }

    public var body: some View {
        SwiftUI.Text(verbatim: text).foregroundColor(tokenColor ?? .primary)
    }
}

public struct ${lineName}<Content: View>: View {
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
        resolveFsdsLayeredTokens(${name}Tokens.scopes, fsdsTheme, layers: ["root"])
    }

    private func colorSlot(_ name: String) -> Color? { layered[name]??.color }
    private func pxSlot(_ name: String) -> CGFloat? { layered[name]??.px }

    public var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: pxSlot("${prefix}.${transform.gutterPart}.size.gap") ?? 0) {
            if showLineNumbers {
                SwiftUI.Text(String(number))
                    .foregroundColor(colorSlot("${prefix}.${transform.gutterPart}.color.number") ?? .secondary)
                    .frame(minWidth: 28, alignment: .trailing)
                    .accessibilityHidden(true)
            }
            content
        }
    }
}

struct FsdsSourceLine {
    var tokens: [${tokenName}]
}

@MainActor
func fsdsSplitSource(_ code: String, tokens: [${tokenName}]?, highlight: Bool) -> (lines: [FsdsSourceLine], highlighted: Bool) {
    let valid = highlight && tokens != nil && tokens!.map(\.text).joined() == code
    let stream = valid ? tokens! : [${tokenName}(kind: .plain, text: code)]
    var lines: [FsdsSourceLine] = []
    var current: [${tokenName}] = []
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
                current.append(${tokenName}(kind: token.kind, text: String(character)))
            }
        }
    }
    lines.append(FsdsSourceLine(tokens: current))
    return (lines, valid)
}

public struct ${name}: View {
    public let ${transform.sourceProp}: String
    public let ${transform.tokensProp}: [${tokenName}]?
    public let ${transform.gateProp}: Bool
    public let ${transform.lineNumbersProp}: Bool
    private let customContent: AnyView?
    @Environment(\.fsdsTheme) private var fsdsTheme

    public init(${transform.sourceProp}: String = "", ${transform.tokensProp}: [${tokenName}]? = nil, ${transform.gateProp}: Bool = true, ${transform.lineNumbersProp}: Bool = false) {
        self.${transform.sourceProp} = ${transform.sourceProp}
        self.${transform.tokensProp} = ${transform.tokensProp}
        self.${transform.gateProp} = ${transform.gateProp}
        self.${transform.lineNumbersProp} = ${transform.lineNumbersProp}
        self.customContent = nil
    }

    public init<Content: View>(@ViewBuilder content: () -> Content) {
        self.${transform.sourceProp} = ""
        self.${transform.tokensProp} = nil
        self.${transform.gateProp} = true
        self.${transform.lineNumbersProp} = false
        self.customContent = AnyView(content())
    }

    private var layered: [String: FsdsTokenValue?] {
        resolveFsdsLayeredTokens(${name}Tokens.scopes, fsdsTheme, layers: ["root"])
    }

    private func colorSlot(_ name: String) -> Color? { layered[name]??.color }
    private func pxSlot(_ name: String) -> CGFloat? { layered[name]??.px }

    public var body: some View {
        let source = fsdsSplitSource(${transform.sourceProp}, tokens: ${transform.tokensProp}, highlight: ${transform.gateProp})
        Group {
            if let customContent {
                customContent
            } else if ${transform.lineNumbersProp} || source.highlighted {
                VStack(alignment: .leading, spacing: 0) {
                    ForEach(source.lines.indices, id: \.self) { index in
                        ${lineName}(number: index + 1, showLineNumbers: ${transform.lineNumbersProp}) {
                            HStack(spacing: 0) {
                                ForEach(source.lines[index].tokens.indices, id: \.self) { tokenIndex in
                                    let token = source.lines[index].tokens[tokenIndex]
                                    if source.highlighted {
                                        ${tokenName}(kind: token.kind, text: token.text)
                                    } else {
                                        SwiftUI.Text(verbatim: token.text)
                                    }
                                }
                            }
                        }
                    }
                }
                .accessibilityElement(children: .ignore)
                .accessibilityLabel(${transform.sourceProp})
            } else {
                SwiftUI.Text(verbatim: ${transform.sourceProp})
            }
        }
        .font(.system(.body, design: .monospaced))
        .padding(.vertical, pxSlot("box-model.padding-block-start") ?? 0)
        .padding(.horizontal, pxSlot("box-model.padding-inline-start") ?? 0)
        .background(colorSlot("${prefix}.color.background.default") ?? .clear)
        .clipShape(RoundedRectangle(cornerRadius: pxSlot("${prefix}.size.radius.default") ?? 0))
        .foregroundColor(colorSlot("${prefix}.color.foreground.primary") ?? .primary)
    }
}
// @generated:end`;
}
