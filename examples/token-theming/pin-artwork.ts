/** Original editorial boards made for this fixture. No reference-page media.
 *  `headline` drives each kind's display text so boards sharing a kind stay
 *  visually distinct inside a feed or related rail. */
export const pins = [
  { title: 'Fieldwork — an independent design studio portfolio', maker: 'Fieldwork Studio', kind: 'website', paper: '#ecebe6', ink: '#252524', accent: '#ff603c', ratio: 'portrait', headline: ['Fieldwork —', 'open by design.'] },
  { title: 'Designing systems that leave room for change', maker: 'Form & Function', kind: 'diagram', paper: '#24374e', ink: '#f1f0e5', accent: '#a7cbd3', ratio: 'square', headline: ['Designing', 'for change →'] },
  { title: 'Material futures: an editorial identity', maker: 'Paper House', kind: 'editorial', paper: '#edece6', ink: '#242424', accent: '#3c62db', ratio: 'portrait', headline: ['Material', 'futures.'] },
  { title: 'A toolkit for thoughtful teams', maker: 'Studio North', kind: 'cards', paper: '#eeece5', ink: '#242422', accent: '#e86230', ratio: 'photo', headline: ['A toolkit for', 'thoughtful teams'] },
  { title: 'Shared spaces, shared stories', maker: 'Open Practice', kind: 'poster', paper: '#eb5936', ink: '#242424', accent: '#f2d6ac', ratio: 'portrait', headline: ['Made', 'together.'] },
  { title: 'The quiet archive — an index of everyday objects', maker: 'The Quiet Index', kind: 'archive', paper: '#161718', ink: '#f4f1e8', accent: '#c6c1b6', ratio: 'square', headline: ['An index of', 'everyday objects'] },
  { title: 'Interfaces for a more considered internet', maker: 'Window Seat', kind: 'website', paper: '#efefea', ink: '#252a31', accent: '#868caf', ratio: 'photo', headline: ['Interfaces for', 'considered use.'] },
  { title: 'Open editions / 2026', maker: 'Type Assembly', kind: 'type', paper: '#e9f34c', ink: '#161814', accent: '#f99aaf', ratio: 'portrait', headline: ['Open', 'editions.'] },
  { title: 'Ways of seeing: publication design', maker: 'Common Ground', kind: 'editorial', paper: '#ebebe8', ink: '#303133', accent: '#c2c4ba', ratio: 'portrait', headline: ['Ways of', 'seeing.'] },
  { title: 'An identity built around the circle', maker: 'Circle Office', kind: 'diagram', paper: '#f1eee7', ink: '#252a26', accent: '#b9bf9d', ratio: 'square', headline: ['An identity', 'in circles.'] },
  { title: 'Making space for the unexpected', maker: 'Off Hours', kind: 'type', paper: '#f73692', ink: '#1a1722', accent: '#e4e5c7', ratio: 'photo', headline: ['Making', 'space.'] },
  { title: 'A small guide to good questions', maker: 'Working Notes', kind: 'cards', paper: '#d4dedc', ink: '#183531', accent: '#b1c881', ratio: 'portrait', headline: ['A small guide', 'to good questions'] },
  { title: 'Collected forms — art direction and experiments', maker: 'Sora', kind: 'archive', paper: '#f0e9db', ink: '#252622', accent: '#aab294', ratio: 'square', headline: ['Collected forms', 'and experiments'] },
  { title: 'Between objects and ideas', maker: 'Field Recordings', kind: 'poster', paper: '#3a59d4', ink: '#f0eadb', accent: '#acbed6', ratio: 'portrait', headline: ['Room', 'to move.'] },
  { title: 'Less, but with intention', maker: 'Everyday Office', kind: 'editorial', paper: '#e7e5de', ink: '#23231f', accent: '#b9b99d', ratio: 'photo', headline: ['Less,', 'but better.'] },
  { title: 'How we work together', maker: 'Practice Space', kind: 'diagram', paper: '#1c2422', ink: '#ece9df', accent: '#b6c686', ratio: 'portrait', headline: ['Working', 'as one system.'] },
  { title: 'Dispatches from the studio', maker: 'June Collective', kind: 'website', paper: '#eb6033', ink: '#20201b', accent: '#edcc92', ratio: 'square', headline: ['Dispatches', 'from the studio.'] },
  { title: 'A modular identity for a changing world', maker: 'North Assembly', kind: 'cards', paper: '#eaeae5', ink: '#252c36', accent: '#7993bd', ratio: 'photo', headline: ['A modular', 'identity system'] },
] as const;

const escape = (s:string) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;');
const text = (x:number,y:number,s:string,size=24,extra='') =>
  `<text x="${x}" y="${y}" font-family="Arial, sans-serif" font-size="${size}" ${extra}>${escape(s)}</text>`;
const rules = (x:number,y:number,w:number,count:number) =>
  Array.from({length:count},(_,i)=>`<rect x="${x}" y="${y+i*13}" width="${w*(i===count-1?.64:1)}" height="3" opacity=".25"/>`).join('');
const rect = (x:number,y:number,w:number,h:number,fill:string,extra='') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${extra}/>`;

export function pinArtwork(index:number):string {
  const pin=pins[index], {paper,ink,accent,kind,headline}=pin;
  const height=kind==='website'?1500:kind==='poster'||kind==='editorial'||kind==='type'?900:800;
  let drawing='';
  if(kind==='website') {
    drawing=text(32,48,pin.maker,22,'font-weight="700"')+text(403,48,'Work   About   Contact',12);
    drawing+=text(32,144,headline[0],54)+text(32,204,headline[1],54)+rules(34,244,265,4)+rect(32,330,536,320,ink);
    drawing+=`<g fill="${accent}">${text(62,404,'F / W',64)}${text(62,610,'A practice in progress.',22)}</g>`;
    drawing+=`<circle cx="420" cy="462" r="105" fill="${accent}"/><circle cx="450" cy="438" r="70" fill="${paper}"/>`;
    drawing+=text(32,710,'Selected work',28);
    for(let i=0;i<4;i++) {
      const x=32+(i%2)*278,y=744+Math.floor(i/2)*230;
      drawing+=rect(x,y,258,166,i%2?accent:'#d5d4cd')+`<circle cx="${x+129}" cy="${y+83}" r="49" fill="${ink}" opacity=".${i+4}"/>`+text(x,y+194,['Objects & ideas','Open editions','Common ground','New perspectives'][i],17);
    }
    drawing+=rect(0,1240,600,260,ink)+`<g fill="${paper}">${text(32,1308,'Good work starts',44)}${text(32,1362,'with a conversation.',44)}${text(32,1456,'Say hello →',23)}</g>`;
  } else if(kind==='diagram') {
    drawing=text(38,62,'WORKING MODELS / 01',15)+text(38,140,headline[0],56)+text(38,202,headline[1],56)+rules(40,244,320,4);
    drawing+=`<g stroke="${accent}" fill="none" stroke-width="2">`;
    for(let i=0;i<7;i++) drawing+=`<ellipse cx="300" cy="${450+i*24}" rx="${180-i*12}" ry="70"/>`;
    drawing+='</g>'+text(40,742,'A field guide to connected thinking',20);
  } else if(kind==='editorial') {
    drawing=text(30,62,'FIELD NOTES',38,'font-weight="700"')+text(451,56,'No. 0'+(index+1),17)+rect(30,83,540,2,ink);
    drawing+=text(30,152,headline[0],70)+text(30,224,headline[1],70)+text(32,272,'An ongoing study of form and possibility.',17);
    drawing+=rect(30,316,310,360,accent)+`<g fill="none" stroke="${ink}" stroke-width="2">`;
    for(let i=0;i<8;i++) drawing+=`<path d="M${80+i*17} 602V${380+i*9}l96 -28v220Z"/>`;
    drawing+='</g>'+rules(374,328,194,12)+text(374,545,'Structure.',26)+text(374,580,'Function.',26)+text(374,615,'Feeling.',26)+rules(30,720,245,9)+rules(318,720,250,9)+text(30,877,'Open research / Independent publishing',15);
  } else if(kind==='cards') {
    const labels=['Start here','Ask better','Make room','Find focus','Look again','Move forward'];
    drawing=text(32,65,(headline[0]+' '+headline[1]).toUpperCase(),19)+rules(32,94,295,3);
    for(let i=0;i<6;i++) {
      const x=26+(i%2)*280,y=168+Math.floor(i/2)*190;
      drawing+=rect(x,y,264,174,i===0?accent:i%3===0?ink:'#faf8ef','rx="4"');
      drawing+=`<g fill="${i%3===0&&i!==0?paper:ink}">${text(x+18,y+32,labels[(i+index)%6],23)}<circle cx="${x+132}" cy="${y+99}" r="40" fill="none" stroke="currentColor" stroke-width="2"/>${rules(x+20,y+150,132,1)}</g>`;
    }
    drawing+=text(32,775,'Small practices. Lasting possibilities.',18);
  } else if(kind==='archive') {
    drawing=text(32,60,(headline[0]+' '+headline[1]).toUpperCase(),24)+text(464,58,'0'+index+'—018',15);
    for(let i=0;i<9;i++) {
      const x=26+(i%3)*190,y=112+Math.floor(i/3)*210;
      drawing+=rect(x,y,172,178,accent,'rx="2"')+`<g transform="translate(${x+86},${y+80})" fill="${ink}">${i%3===0?'<ellipse rx="48" ry="59"/><ellipse cy="-17" rx="25" ry="33" fill="'+paper+'"/>':i%3===1?'<path d="M-50 49V-35l100-20V49Z"/><path d="M-32-15h64v5h-64" stroke="'+paper+'" stroke-width="4"/>':'<path d="M-48 45 0-55 48 45Z"/><circle cy="15" r="18" fill="'+paper+'"/>'}</g>`+text(x,y+200,'Study 0'+(i+1),12);
    }
    drawing+=text(32,790,'Collected forms, everyday curiosities.',17);
  } else if(kind==='type') {
    drawing=text(26,116,index===7?'Open':'Make',112,'font-weight="700"')+text(26,224,index===7?'editions.':'room.',112,'font-weight="700"');
    drawing+=rect(26,268,548,2,ink)+text(30,326,'IDEAS ARE BETTER IN COMPANY.',19);
    drawing+=text(18,655,index===7?'26':'Aa',330,'font-weight="700" letter-spacing="-24"');
    drawing+=rect(28,701,544,62,accent)+text(45,741,'TYPE / CULTURE / POSSIBILITY',18);
  } else {
    drawing=text(32,60,'SHARED SPACES / OPEN STUDIO',18);
    drawing+=`<g stroke="${ink}" stroke-width="3" fill="none">`;
    for(let i=0;i<12;i++) drawing+=`<circle cx="${170+(i%3)*130}" cy="${228+Math.floor(i/3)*112}" r="80"/>`;
    drawing+='</g>'+text(30,750,headline[0],84,'font-weight="700"')+text(30,833,headline[1], 70,'font-weight="700"');
  }
  return 'data:image/svg+xml,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="${height}" viewBox="0 0 600 ${height}"><rect width="600" height="${height}" fill="${paper}"/><g fill="${ink}">${drawing}</g></svg>`);
}

