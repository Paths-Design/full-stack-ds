// @generated:start imports
import { Component, Input, computed, DestroyRef, inject, ChangeDetectionStrategy, AfterContentInit, ElementRef } from "@angular/core";
import { NgClass, NgIf, NgFor } from "@angular/common";
import { tokenizeCode } from "../../primitives/highlight/tokenize.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type CodeBlockLanguage = "bash" | "css" | "html" | "javascript" | "json" | "jsx" | "markdown" | "plaintext" | "svelte" | "tsx" | "typescript" | "vue";
// @generated:end

// @custom:start types

// @custom:end

// @generated:start component
@Component({
  selector: "fsds-code-block",
  standalone: true,
  imports: [NgClass, NgIf, NgFor],
  host: { "data-fsds-component": "code-block" },
  template: `<pre [ngClass]="classes()" [attr.data-language]="language" data-fsds-box=""><code [ngClass]="'code-block__code'" spellcheck="false" [attr.data-language]="language"><ng-content /><ng-container *ngIf="hasContent"><span [ngClass]="'code-block__source'"><ng-container *ngIf="(highlight ?? true)"><span *ngFor="let token of highlightTokens" [ngClass]="'code-block__token'" [attr.data-token]="token.kind">{{ token.text }}</span></ng-container><ng-container *ngIf="!((highlight ?? true))">{{ code }}</ng-container></span></ng-container></code></pre>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CodeBlockComponent implements AfterContentInit {
  @Input() code!: string;
  @Input() language!: CodeBlockLanguage;
  @Input() highlight?: boolean = true;
  @Input() class?: string;

  classes(): string {
    return [
      "code-block",
      this.class,
    ].filter(Boolean).join(" ");
  }

  get highlightTokens(): Array<{ kind: string; text: string }> {
    return tokenizeCode(this.code, this.language);
  }

  // Tracks whether any content has been projected — used by *ngIf="hasContent".
  protected hasContent = false;
  private _el = inject(ElementRef<HTMLElement>);

  ngAfterContentInit(): void {
    // Check for any non-whitespace child nodes projected into this component.
    const nodes = Array.from((this._el.nativeElement as HTMLElement).childNodes);
    this.hasContent = nodes.some((n) =>
      n.nodeType === Node.ELEMENT_NODE ||
      (n.nodeType === Node.TEXT_NODE && n.textContent?.trim() !== ""),
    );
  }
}
// @generated:end

// @custom:start trailing

// @custom:end
