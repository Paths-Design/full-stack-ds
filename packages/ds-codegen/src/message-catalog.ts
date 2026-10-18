/**
 * Corpus-wide message catalog: every contract's `messages` block flattened to
 * `<Component>.<key>` entries. This is the translator-facing inventory — the
 * same keys every runtime family resolves — rendered per platform as a
 * reference catalog (SwiftUI: `FsdsComponents.xcstrings`).
 */
import fs from "node:fs";
import type { ComponentContract } from "./contract.js";
import { listComponentContracts } from "./contracts-fs.js";
import { buildMessages, type MessageIR } from "./messages.js";

/** Every message in the corpus, sorted by catalog key. */
export function collectCorpusMessages(contractsRoot: string): MessageIR[] {
  return listComponentContracts(contractsRoot)
    .flatMap((entry) => buildMessages(JSON.parse(fs.readFileSync(entry.absPath, "utf8")) as ComponentContract))
    .sort((a, b) => (a.catalogKey < b.catalogKey ? -1 : a.catalogKey > b.catalogKey ? 1 : 0));
}

/**
 * An Xcode String Catalog (source language `en`) naming every key with its
 * contract default and translator description. A host app adds a copy to its
 * own target and translates it; the generated views read the resulting
 * `FsdsComponents` table from the app bundle. Placeholders keep the contract
 * `{name}` syntax so a translation is portable across every target.
 */
export function generateXcstrings(messages: MessageIR[]): string {
  const strings: Record<string, unknown> = {};
  for (const message of messages) {
    const params = message.params.length > 0 ? ` Placeholders: ${message.params.map((p) => `{${p}}`).join(", ")}.` : "";
    strings[message.catalogKey] = {
      comment: `${message.description}${params}`,
      extractionState: "manual",
      localizations: {
        en: { stringUnit: { state: "translated", value: message.defaultMessage } },
      },
    };
  }
  return JSON.stringify({ sourceLanguage: "en", strings, version: "1.0" }, null, 2) + "\n";
}
