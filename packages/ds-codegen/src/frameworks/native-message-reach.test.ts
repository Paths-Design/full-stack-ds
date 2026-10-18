import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { allCorpusComponentNames, loadCorpusContract } from "./corpus-fixtures.js";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const NATIVE_ROOTS = {
  swiftui: "packages/ds-swiftui/Sources/DsSwiftUI/Components",
  compose: "packages/ds-jetpack-compose/library/src/main/kotlin/com/fullstackds/components",
} as const;

/**
 * Messages a native target emits a component for but never renders: the
 * part is not realized natively (a dismiss or close button, month navigation,
 * a search field) or the element renders without the contract's accessible
 * name. Each is native-realization debt owned by the native accessibility
 * semantics slice. The ledger only shrinks: an entry whose key starts
 * resolving must be removed.
 */
const UNRENDERED = [
  "compose AlertNotice.dismiss",
  "compose Breadcrumbs.navigationLabel",
  "compose Command.dialogLabel",
  "compose Command.emptyResults",
  "compose Command.searchLabel",
  "compose Dialog.close",
  "compose OTP.fieldLabel",
  "compose OTP.groupLabel",
  "compose Select.searchLabel",
  "compose Select.triggerLabel",
  "compose Sheet.close",
  "compose Toast.dismiss",
  "compose Toast.regionLabel",
  "compose Walkthrough.skip",
  "compose Walkthrough.skipTour",
  "swiftui Alert.dismiss",
  "swiftui AlertNotice.dismiss",
  "swiftui Breadcrumbs.navigationLabel",
  "swiftui Calendar.caption",
  "swiftui Calendar.gridLabel",
  "swiftui Calendar.nextMonth",
  "swiftui Calendar.previousMonth",
  "swiftui Carousel.roleDescription",
  "swiftui Carousel.slidePosition",
  "swiftui Carousel.slideRoleDescription",
  "swiftui Command.dialogLabel",
  "swiftui Command.emptyResults",
  "swiftui Command.searchLabel",
  "swiftui Dialog.close",
  "swiftui OTP.fieldLabel",
  "swiftui OTP.groupLabel",
  "swiftui Select.searchLabel",
  "swiftui Select.triggerLabel",
  "swiftui Sheet.close",
  "swiftui Toast.dismiss",
  "swiftui Toast.regionLabel",
  "swiftui Walkthrough.tourLabel",
];

function committedSource(dir: string): string | null {
  if (!fs.existsSync(dir)) return null;
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => fs.readFileSync(path.join(dir, entry.name), "utf8"))
    .join("\n");
}

describe("native message reach", () => {
  it("every message of an emitted native component resolves through its catalog, or is ledgered as unrendered", () => {
    const unrendered: string[] = [];
    for (const name of allCorpusComponentNames()) {
      const keys = Object.keys(loadCorpusContract(name).messages ?? {});
      for (const [target, root] of Object.entries(NATIVE_ROOTS)) {
        const source = committedSource(path.join(REPO_ROOT, root, name));
        if (source === null) continue;
        for (const key of keys) {
          if (!source.includes(`"${name}.${key}"`)) unrendered.push(`${target} ${name}.${key}`);
        }
      }
    }
    expect(unrendered.sort()).toEqual(UNRENDERED);
  });

  it("no native source authors a message default outside a catalog lookup", () => {
    const authored: string[] = [];
    for (const name of allCorpusComponentNames()) {
      const messages = Object.values(loadCorpusContract(name).messages ?? {});
      for (const [target, root] of Object.entries(NATIVE_ROOTS)) {
        const source = committedSource(path.join(REPO_ROOT, root, name));
        if (source === null) continue;
        for (const message of messages) {
          for (const line of source.split("\n")) {
            if (line.includes(`"${message.defaultMessage}"`) && !line.includes(".string(")) {
              authored.push(`${target} ${name}: ${line.trim()}`);
            }
          }
        }
      }
    }
    expect(authored).toEqual([]);
  });

  it("a resolved key is a catalog lookup carrying the contract default", () => {
    const swift = committedSource(path.join(REPO_ROOT, NATIVE_ROOTS.swiftui, "Select"))!;
    const kotlin = committedSource(path.join(REPO_ROOT, NATIVE_ROOTS.compose, "Select"))!;
    expect(swift).toContain('placeholderProp ?? fsdsMessages.string("Select.placeholder", default: "Select an option")');
    expect(kotlin).toContain('placeholder: String = LocalFsdsMessages.current.string("Select.placeholder", "Select an option"),');
  });
});
