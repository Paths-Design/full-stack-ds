/** Original SVG studies: deterministic, local, and independent of third-party media. */
export const studies = [
  { title: 'Slow mornings', maker: 'Studio North', color: '#d7af76', ink: '#384b3c', kind: 'arches', ratio: 'portrait' },
  { title: 'Blue hour', maker: 'The Quiet Index', color: '#385b7c', ink: '#c9cde0', kind: 'hills', ratio: 'square' },
  { title: 'Rooms for reading', maker: 'Forma Studio', color: '#d7cabb', ink: '#ad5a42', kind: 'arches', ratio: 'portrait' },
  { title: 'Wild stems', maker: 'Mina Park', color: '#b1bdae', ink: '#f0d27d', kind: 'stems', ratio: 'photo' },
  { title: 'Along the coast', maker: 'Field Recordings', color: '#cbdcdd', ink: '#365d71', kind: 'hills', ratio: 'portrait' },
  { title: 'A little sunshine', maker: 'June Collective', color: '#e6bb51', ink: '#ab583f', kind: 'stems', ratio: 'square' },
  { title: 'After the rain', maker: 'Window Seat', color: '#758779', ink: '#d7c6a6', kind: 'hills', ratio: 'photo' },
  { title: 'Everyday objects', maker: 'Paper House', color: '#c98f78', ink: '#603e3e', kind: 'arches', ratio: 'portrait' },
  { title: 'Green spaces', maker: 'Small Garden', color: '#344f44', ink: '#d7bc83', kind: 'stems', ratio: 'portrait' },
  { title: 'Out of office', maker: 'Open Road', color: '#d6a98d', ink: '#5c7180', kind: 'hills', ratio: 'square' },
  { title: 'Soft geometry', maker: 'Form & Function', color: '#c1b5d0', ink: '#75547b', kind: 'arches', ratio: 'photo' },
  { title: 'Weekend rituals', maker: 'Sora', color: '#eedab5', ink: '#507a69', kind: 'stems', ratio: 'portrait' },
] as const;

export function artwork(index: number): string {
  const {color, ink, kind} = studies[index % studies.length];
  const drawing = kind === 'hills'
    ? `<circle cx="420" cy="200" r="82" fill="#f6e4ba"/><path d="M0 500Q180 170 370 420T600 320V800H0" fill="${ink}"/><path d="M0 600Q230 340 440 630T600 460V800H0" fill="#202d36" opacity=".65"/><path d="M0 720Q260 550 600 730" fill="none" stroke="#fff" opacity=".25" stroke-width="3"/>`
    : kind === 'arches'
      ? `<path d="M85 700V285a215 215 0 0 1 430 0v415" fill="${ink}"/><path d="M150 700V300a150 150 0 0 1 300 0v400" fill="${color}"/><path d="M215 700V315a85 85 0 0 1 170 0v385" fill="${ink}"/><ellipse cx="300" cy="708" rx="238" ry="30" fill="#26221e" opacity=".2"/><path d="M350 480h120l-18 205h-85z" fill="#f1dfbb"/><ellipse cx="410" cy="480" rx="60" ry="18" fill="#776957"/>`
      : `<path d="M300 680Q290 350 240 130M305 570Q430 370 470 190M295 490Q150 380 115 235" stroke="#344b37" stroke-width="12" fill="none"/><g fill="${ink}"><ellipse cx="200" cy="200" rx="75" ry="125" transform="rotate(-30 200 200)"/><ellipse cx="430" cy="275" rx="72" ry="110" transform="rotate(35 430 275)"/><ellipse cx="155" cy="370" rx="60" ry="95" transform="rotate(-45 155 370)"/></g><path d="M195 580h210l-30 190H225z" fill="#ebe0c9"/><ellipse cx="300" cy="580" rx="105" ry="25" fill="#9a947c"/>`;
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800"><rect width="600" height="800" fill="${color}"/>${drawing}</svg>`)}`;
}
