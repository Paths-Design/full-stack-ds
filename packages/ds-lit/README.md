# @full-stack-ds/lit

Full Stack DS components for lit.

Install the framework peer dependencies declared in package.json and @full-stack-ds/tokens. Component props and public data types are exported from the package root.

```ts
import '@full-stack-ds/lit';
import '@full-stack-ds/tokens/tokens.css';

document.querySelector('#app')!.innerHTML = '<fsds-button>Continue</fsds-button>';
```

Lit components register their custom elements when imported and carry component styles inside shadow roots. Global token CSS inherits through those roots.

Component-specific semantics, composition examples, and supported behavior are documented in the [repository](https://github.com/Paths-Design/full-stack-ds). A package build alone does not establish accessibility or native device compatibility for every component.

## Table composition

Native table sections cannot enter a shadow table through slots. Assign a
`renderContent` callback and use the exported native template helpers. They
preserve table semantics and attach the component's part styles.

```ts
import { TableElement, tableCaption, tableHead, tableBody, tableRow, tableHeaderCell, tableCell } from '@full-stack-ds/lit';

const table = new TableElement();
table.ariaLabel = 'Orders';
table.renderContent = () => [
  tableCaption('Orders'),
  tableHead(tableRow(tableHeaderCell('Customer', { scope: 'col' }))),
  tableBody(tableRow(tableCell('Ada'))),
];
document.querySelector('#app')!.append(table);
```

Helpers accept Lit content, including templates, arrays, directives and DOM
nodes. Attributes include `class`, `id`, `style`, `data-testid`, `lang`, `dir`
and `title`. Cells accept numeric `colSpan`/`rowSpan` and a `headers` string
of header IDs. Headers also accept `scope`, `abbr` and `ariaSort`;
`ariaSort` renders the native `aria-sort` attribute with `none`, `ascending`,
`descending` or `other`. Consumers own sort state and supply unique header IDs.
`tableFooter` supplies a native footer section. Replace the callback to update
content, or use a reactive Lit parent's `.renderContent` property binding.
Keyed row updates can use Lit's `repeat` directive to retain native element
identity. Consumers own focus policy when reordering or removing interactive
rows. These helpers do not add
sorting, selection or pagination behavior.

`responsive` defaults to `true`: wide content scrolls horizontally, and the
content viewport is in the tab order for native arrow-key scrolling. Set it
to `false` to allow visible overflow and remove that viewport tab stop.
`contentLabel` names the surrounding region and defaults to the localized
“Table content” message. `ariaLabel` separately names the native table.

## License

MIT, copyright DesignPaths, LLC. The bundled THIRD_PARTY_NOTICES preserves the Lucide and Feather notices applicable to adapted icon geometry.
