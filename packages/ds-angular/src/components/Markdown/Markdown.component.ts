// @generated:start imports
import { Component, Input, ChangeDetectionStrategy } from "@angular/core";
import { NgClass, NgIf, NgFor, NgSwitch, NgSwitchCase } from "@angular/common";
import { parseMarkdown, type MarkdownBlock, type MarkdownMark } from "../../primitives/markdown/markdown.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types

// @generated:end

// @custom:start types

// @custom:end

// @generated:start component

@Component({
  selector: "fsds-markdown-mark",
  standalone: true,
  imports: [NgSwitch, NgSwitchCase, NgIf, NgFor],
  host: { "data-fsds-transform": "markdown-mark" },
  template: `<ng-container [ngSwitch]="mark.kind">
    <ng-container *ngSwitchCase="'text'">{{ markText }}</ng-container>
    <code *ngSwitchCase="'code'" class="markdown__code" data-mark-kind="code">{{ markText }}</code>
    <em *ngSwitchCase="'emphasis'" class="markdown__emphasis" data-mark-kind="emphasis"><fsds-markdown-mark *ngFor="let child of markChildren" [mark]="child"></fsds-markdown-mark></em>
    <strong *ngSwitchCase="'strong'" class="markdown__strong" data-mark-kind="strong"><fsds-markdown-mark *ngFor="let child of markChildren" [mark]="child"></fsds-markdown-mark></strong>
    <ng-container *ngSwitchCase="'link'">
      <a *ngIf="markHref !== null" class="markdown__link" data-mark-kind="link" [attr.href]="markHref"><fsds-markdown-mark *ngFor="let child of markChildren" [mark]="child"></fsds-markdown-mark></a>
      <ng-container *ngIf="markHref === null"><fsds-markdown-mark *ngFor="let child of markChildren" [mark]="child"></fsds-markdown-mark></ng-container>
    </ng-container>
  </ng-container>`,
})
export class MarkdownMarkRendererComponent {
  @Input() mark!: MarkdownMark;
  // ngSwitch does not narrow unions in templates (strict ngc); typed
  // getters carry the payload once, centrally.
  get markText(): string {
    return (this.mark as { text?: string }).text ?? "";
  }
  get markChildren(): MarkdownMark[] {
    return (this.mark as { children?: MarkdownMark[] }).children ?? [];
  }
  get markHref(): string | null {
    return (this.mark as { href?: string | null }).href ?? null;
  }
}

@Component({
  selector: "fsds-markdown-block",
  standalone: true,
  imports: [NgSwitch, NgSwitchCase, NgIf, NgFor, MarkdownMarkRendererComponent],
  host: { "data-fsds-transform": "markdown-block" },
  template: `<ng-container [ngSwitch]="block.kind">
    <h2 *ngSwitchCase="'heading'" class="markdown__heading" data-block-kind="heading" [attr.data-level]="blockLevel"><fsds-markdown-mark *ngFor="let mark of blockChildren" [mark]="mark"></fsds-markdown-mark></h2>
    <p *ngSwitchCase="'paragraph'" class="markdown__paragraph" data-block-kind="paragraph"><fsds-markdown-mark *ngFor="let mark of blockChildren" [mark]="mark"></fsds-markdown-mark></p>
    <ng-container *ngSwitchCase="'list'">
      <ol *ngIf="blockOrdered" class="markdown__orderedList" data-block-kind="orderedList"><fsds-markdown-block *ngFor="let item of blockItems" [block]="item"></fsds-markdown-block></ol>
      <ul *ngIf="!blockOrdered" class="markdown__unorderedList" data-block-kind="unorderedList"><fsds-markdown-block *ngFor="let item of blockItems" [block]="item"></fsds-markdown-block></ul>
    </ng-container>
    <li *ngSwitchCase="'listItem'" class="markdown__listItem" data-block-kind="listItem"><fsds-markdown-mark *ngFor="let mark of blockChildren" [mark]="mark"></fsds-markdown-mark></li>
    <pre *ngSwitchCase="'codeBlock'" class="markdown__codeBlock" data-block-kind="codeBlock" [attr.data-language]="blockLanguage">{{ blockText }}</pre>
    <blockquote *ngSwitchCase="'blockquote'" class="markdown__blockquote" data-block-kind="blockquote"><fsds-markdown-mark *ngFor="let mark of blockChildren" [mark]="mark"></fsds-markdown-mark></blockquote>
  </ng-container>`,
})
export class MarkdownBlockRendererComponent {
  @Input() block!: MarkdownBlock;
  // Same ngc-narrowing reason as the mark renderer's getters.
  get blockText(): string {
    return (this.block as { text?: string }).text ?? "";
  }
  get blockChildren(): MarkdownMark[] {
    return (this.block as { children?: MarkdownMark[] }).children ?? [];
  }
  get blockItems(): MarkdownBlock[] {
    return (this.block as { items?: MarkdownBlock[] }).items ?? [];
  }
  get blockLanguage(): string {
    return (this.block as { language?: string }).language ?? "";
  }
  get blockLevel(): number {
    return (this.block as { level?: number }).level ?? 1;
  }
  get blockOrdered(): boolean {
    return (this.block as { ordered?: boolean }).ordered === true;
  }
}
@Component({
  selector: "fsds-markdown",
  standalone: true,
  imports: [NgClass, NgFor, MarkdownBlockRendererComponent],
  host: { "data-fsds-component": "markdown" },
  template: `<div [ngClass]="classes()" data-fsds-box="">
  <fsds-markdown-block *ngFor="let block of markdownBlocks" [block]="block"></fsds-markdown-block>
</div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarkdownComponent {
  @Input() content!: string;
  @Input() class?: string;

  get markdownBlocks(): MarkdownBlock[] {
    return parseMarkdown(this.content ?? "");
  }

  classes(): string {
    return [
      "markdown",
      this.class,
    ].filter(Boolean).join(" ");
  }
}
// @generated:end

// @custom:start trailing

// @custom:end
