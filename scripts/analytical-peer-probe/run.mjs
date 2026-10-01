import { fixture } from './fixture.mjs';
import { producePeerText } from '../../packages/ds-codegen/dist/analytical/peer-text-probe.js';

const variant = process.argv[2] ?? 'baseline';
const layout = process.argv[3] ?? 'lines';
console.log(JSON.stringify(producePeerText(fixture(variant).selected, layout), null, 2));
