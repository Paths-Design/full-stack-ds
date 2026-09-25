// @generated:start imports
import { Component, Input, computed, DestroyRef, inject, ChangeDetectionStrategy, AfterContentInit, ElementRef } from "@angular/core";
import { NgClass, NgIf, NgFor } from "@angular/common";
import { prepareHighlightSource } from "../../primitives/highlight/tokenize.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type CodeBlockLanguage = "bash" | "css" | "html" | "javascript" | "json" | "jsx" | "markdown" | "plaintext" | "svelte" | "tsx" | "typescript" | "vue";
export type CodeBlockTokenType = "comment" | "definition" | "keyword" | "plain" | "property" | "punctuation" | "static" | "string" | "tag";
export type CodeBlockToken = { kind: CodeBlockTokenType; text: string };
// @generated:end

// @custom:start types

// @custom:end

// @generated:start component
@Component({
  selector: "fsds-code-block-line",
  standalone: true,
  template: `<span class="code-block__line"><span class="code-block__gutter" [attr.data-line]="number" aria-hidden="true"></span><ng-content />{{ ending }}</span>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CodeBlockLineComponent {
  @Input({ required: true }) number!: number;
  @Input() ending = "";
}

@Component({
  selector: "fsds-code-block-token",
  standalone: true,
  template: `<span class="code-block__token" [attr.data-token]="kind"><ng-content /></span>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CodeBlockTokenComponent {
  @Input({ required: true }) kind!: CodeBlockTokenType;
}

@Component({
  selector: "fsds-code-block",
  standalone: true,
  imports: [NgClass, NgIf, NgFor, CodeBlockLineComponent, CodeBlockTokenComponent],
  host: { "data-fsds-component": "code-block" },
  template: `<pre [ngClass]="classes()" [attr.data-language]="language" [attr.data-line-numbers]="(showLineNumbers ?? false)" data-fsds-box=""><code [ngClass]="'code-block__code'" spellcheck="false" [attr.data-language]="language"><span data-fsds-projection=""><ng-content /></span><ng-container *ngIf="!hasContent"><span [ngClass]="'code-block__source'"><fsds-code-block-line *ngFor="let line of highlightTokens.lines" [number]="line.number" [ending]="line.ending"><ng-container *ngFor="let token of line.tokens"><fsds-code-block-token *ngIf="line.highlighted" [kind]="token.kind">{{ token.text }}</fsds-code-block-token><ng-container *ngIf="!line.highlighted">{{ token.text }}</ng-container></ng-container></fsds-code-block-line></span></ng-container></code></pre>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CodeBlockComponent {
  @Input() code!: string;
  @Input() language!: CodeBlockLanguage;
  @Input() highlight?: boolean = true;
  @Input() tokens?: CodeBlockToken[];
  @Input() showLineNumbers?: boolean = false;
  @Input() class?: string;

  classes(): string {
    return [
      "code-block",
      this.class,
    ].filter(Boolean).join(" ");
  }

  get highlightTokens() {
    return prepareHighlightSource(this.code, this.language, { tokens: this.tokens, highlight: (this.highlight ?? true) });
  }

  private _el = inject(ElementRef<HTMLElement>);
  protected get hasContent(): boolean {
    const host = this._el.nativeElement as HTMLElement;
    const projection = host.querySelector("[data-fsds-projection]");
    const nodes: Node[] = projection ? Array.from(projection.childNodes) : [];
    return nodes.some((node) =>
      node.nodeType === Node.ELEMENT_NODE ||
      (node.nodeType === Node.TEXT_NODE && node.textContent?.trim() !== ""),
    );
  }
}
// @generated:end

// @custom:start trailing

// @custom:end
