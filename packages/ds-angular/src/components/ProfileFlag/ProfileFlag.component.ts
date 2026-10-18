// @generated:start imports
import { Component, Input, ChangeDetectionStrategy } from "@angular/core";
import { NgClass } from "@angular/common";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type ProfileFlagData = { id: string; username: string; full_name: string; first_name: string | null; last_name: string | null; avatar_url: string | null; bio: string; occupation: string | null; account_status: string; created_at: string; updated_at: string | null };
// @generated:end

// @custom:start types

// @custom:end

// @generated:start component
@Component({
  selector: "fsds-profile-flag",
  standalone: true,
  imports: [NgClass],
  host: { "data-fsds-component": "profile-flag" },
  template: `<div [ngClass]="classes()" data-fsds-box="">
  <ng-content />
</div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileFlagComponent {
  @Input() profile?: ProfileFlagData;
  @Input() class?: string;

  classes(): string {
    return [
      "profile-flag",
      this.class,
    ].filter(Boolean).join(" ");
  }
}
// @generated:end

// @custom:start trailing

// @custom:end
