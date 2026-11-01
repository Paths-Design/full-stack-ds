/**
 * GPUI admitted style vocabulary.
 *
 * These are the declaration properties and scalar forms the GPUI style
 * substrate can resolve. The bounded planners (`factory.ts`) reject anything
 * outside this vocabulary; the generic anatomy projection (`anatomy.ts`) names
 * it as an omission instead. The support-boundary ledger classifies whole
 * property FAMILIES against this vocabulary; value-level adjudication stays
 * here because a family can be admitted while a particular authored value is
 * not representable.
 */
import type { NativeStyleDeclarationIR } from '../../native-style-rules.js';

export const supported = new Set(['background-color','color','border-color','border-width','border-style','border-top-width','border-right-width','border-bottom-width','border-left-width','border-top-color','border-right-color','border-bottom-color','border-left-color','border-top-style','border-right-style','border-bottom-style','border-left-style','border-top','border-radius','width','height','min-width','min-height','max-width','max-height','padding','padding-block','padding-inline','padding-top','padding-right','padding-bottom','padding-left','padding-block-start','padding-block-end','padding-inline-start','padding-inline-end','margin','margin-top','margin-right','margin-bottom','margin-left','gap','row-gap','column-gap','font-size','font-weight','font-family','line-height','opacity','display','position','top','right','bottom','left','align-items','align-self','justify-content','flex-direction','flex-grow','flex-shrink','overflow','text-align','white-space','text-overflow','translate','transform','outline-width','outline-color','outline-style','outline-offset','box-sizing']);
export const dimension = /^-?(?:0(?:\.0+)?|(?:\d+(?:\.\d+)?|\.\d+)(?:px|rem|em|%))$/;
export const absoluteDimension = (value: string): boolean => dimension.test(value) && !value.endsWith('%') && Number.isFinite(parseFloat(value));
export function validScalar(decl: NativeStyleDeclarationIR, pseudo: boolean): boolean {
  const p = decl.property, value = decl.value.trim();
  if (p.endsWith('color') || p === 'background-color') {
    if (/^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value) || ['transparent','white','black'].includes(value)) return true;
    const rgb = /^(rgb|rgba)\(([^)]+)\)$/.exec(value);
    if (!rgb) return false;
    const values = rgb[2]!.split(',').map(part=>part.trim());
    return values.length === (rgb[1] === 'rgba' ? 4 : 3) && values.every((part,index)=>/^\d+(?:\.\d+)?$/.test(part) && Number.isFinite(Number(part)) && Number(part) <= (index === 3 ? 1 : 255));
  }
  if (['width','height','min-width','min-height','max-width','max-height','top','right','bottom','left'].includes(p)) return value === 'auto' || p === 'width' && value === 'fit-content' || dimension.test(value);
  if (p === 'border-width') { const values=value.split(/\s+/); return values.length >= 1 && values.length <= 4 && values.every(part=>absoluteDimension(part) && !part.startsWith('-')); }
  if (/^(padding|margin|gap|row-gap|column-gap|translate)(-|$)/.test(p)) { const values=value.split(/\s+/); const limit=p==='translate'||['padding-inline','padding-block'].includes(p)?2:['padding','margin'].includes(p)?4:1;return values.length<=limit&&values.every(part => dimension.test(part) || p.startsWith('margin') && part === 'auto'); }
  if (/^border-(top|right|bottom|left)-width$/.test(p)) return absoluteDimension(value) && !value.startsWith('-');
  if (['outline-width','outline-offset','font-size'].includes(p)) return absoluteDimension(value) && (p === 'outline-offset' || !value.startsWith('-'));
  if (p === 'border-radius') return value === '50%' || absoluteDimension(value) && !value.startsWith('-');
  if (p === 'transform') {
    const functions=Array.from(value.matchAll(/([A-Za-z]+)\(([^)]+)\)/g));
    if (!functions.length || functions.map(match=>match[0]).join('').replace(/\s/g,'') !== value.replace(/\s/g,'')) return false;
    return functions.every(match=>match[1]==='rotate' ? pseudo && /^-?\d+(?:\.\d+)?deg$/.test(match[2]!) : ['translate','translateX','translateY'].includes(match[1]!) && match[2]!.split(',').length === (match[1]==='translate'?2:1) && match[2]!.split(',').every(part=>dimension.test(part.trim()) && !/\dem$/.test(part.trim())));
  }
  if (p === 'font-weight') return ['normal','bold'].includes(value) || /^\d+(?:\.\d+)?$/.test(value) && Number(value) >= 1 && Number(value) <= 1000;
  if (['flex-grow','flex-shrink','opacity'].includes(p)) return /^\d+(?:\.\d+)?$/.test(value) && (p !== 'opacity' || Number(value) <= 1);
  if (p === 'line-height') return (/^\d+(?:\.\d+)?$/.test(value) || dimension.test(value)) && !value.startsWith('-');
  const enums: Record<string,string[]> = {display:['flex','inline-flex','block','inline-block','none'],position:['relative','absolute'], 'align-items':['start','end','flex-start','flex-end','center','baseline','stretch'],'align-self':['start','end','flex-start','flex-end','center','stretch'], 'justify-content':['start','end','flex-start','flex-end','center','space-between','space-around'], 'flex-direction':['row','column','row-reverse','column-reverse'],overflow:['hidden','visible','scroll'],'text-align':['left','right','start','end','center'],'white-space':['normal','nowrap'],'text-overflow':['ellipsis'],'border-style':['solid','none'],'outline-style':['solid','none'],'box-sizing':['border-box']};
  if (p.endsWith('-style')) return ['solid','none'].includes(value);
  if (p === 'border-top') return value === 'none';
  return !enums[p] || enums[p]!.includes(value);
}
