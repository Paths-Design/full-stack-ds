// @generated:start imports
import { Component, Input, ChangeDetectionStrategy } from "@angular/core";
import { NgClass } from "@angular/common";
import { StackComponent } from "../../primitives/index.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type PostcardAuthor = { name: string; handle: string; avatar: string };
export type PostcardStats = { likes: number; replies: number; reposts: number };
export type PostcardEmbed = { type: 'image' | 'video' | 'audio'; url: string; aspectRatio: { width: number; height: number } };
// @generated:end

// @custom:start types

// @custom:end

// @generated:start component
@Component({
  selector: "fsds-postcard",
  standalone: true,
  imports: [NgClass],
  host: { "data-fsds-component": "postcard" },
  template: `<article [ngClass]="classes()" data-fsds-box="">
  <div [ngClass]="'postcard__header'">
    <div [ngClass]="'postcard__userInfo'">
      <span [ngClass]="'postcard__displayName'">
        {{ author.name }}
      </span>
      <span [ngClass]="'postcard__handle'">
        {{ author.handle }}
      </span>
    </div>
    <time [ngClass]="'postcard__timestamp'" [attr.datetime]="timestamp">
      {{ timestamp }}
    </time>
  </div>
  <div [ngClass]="'postcard__content'">
    <ng-content />
  </div>
  <div [ngClass]="'postcard__footer'">
    <div [ngClass]="'postcard__stats'">
      <span [ngClass]="'postcard__stat'">
        {{ stats.likes }}
      </span>
    </div>
  </div>
</article>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostcardComponent {
  @Input() postId!: string;
  @Input() author!: PostcardAuthor;
  @Input() timestamp!: string;
  @Input() stats!: PostcardStats;
  @Input() embed?: PostcardEmbed;
  @Input() class?: string;
  @Input() type?: string;

  classes(): string {
    return [
      "postcard",
      this.type ? `postcard--${this.type}` : null,
      this.class,
    ].filter(Boolean).join(" ");
  }
}

@Component({
  selector: "fsds-postcard-header",
  standalone: true,
  imports: [NgClass, StackComponent],
  template: `<fsds-stack [ngClass]="classes()"><ng-content /></fsds-stack>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostcardHeaderComponent {
  @Input() class?: string;
  @Input() dataTestid?: string;

  classes(): string {
    return ["postcard__header", this.class].filter(Boolean).join(" ");
  }
}

@Component({
  selector: "fsds-postcard-content",
  standalone: true,
  imports: [NgClass, StackComponent],
  template: `<fsds-stack [ngClass]="classes()"><ng-content /></fsds-stack>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostcardContentComponent {
  @Input() class?: string;
  @Input() dataTestid?: string;

  classes(): string {
    return ["postcard__content", this.class].filter(Boolean).join(" ");
  }
}

@Component({
  selector: "fsds-postcard-footer",
  standalone: true,
  imports: [NgClass, StackComponent],
  template: `<fsds-stack variant="horizontal" [ngClass]="classes()"><ng-content /></fsds-stack>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostcardFooterComponent {
  @Input() class?: string;
  @Input() dataTestid?: string;

  classes(): string {
    return ["postcard__footer", this.class].filter(Boolean).join(" ");
  }
}
// @generated:end

// @custom:start trailing

// @custom:end
