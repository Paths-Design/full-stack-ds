import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Avatar, Button, Card, CardMedia, CardContent, Image, Input, Text, Icon, Popover, Badge } from '../../../packages/ds-react/src/components';
import { Stack } from '../../../packages/ds-react/src/primitives';
import { pinArtwork, pins } from './pin-artwork';
import './pinterest.css';

// These page-owned glyphs fill gaps in the bounded icon catalog.
function ChromeGlyph({name}:{name:'bell'|'chat'|'megaphone'|'help'}) {
  return <svg className="pin-chrome-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name==='bell'?<><path d="M5 17h14l-2-3V9a5 5 0 0 0-10 0v5l-2 3Z"/><path d="M10 20h4M12 2v2"/></>:name==='chat'?<><path d="M20 17v4l-4-2a9 9 0 1 1 4-2Z"/><path d="M7 10h.01M12 10h.01M17 10h.01"/></>:name==='megaphone'?<><path d="m4 9 12-4v14L4 15V9ZM16 9h4v6h-4M7 16v5h4v-4"/></>:<><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1 .7-1.5 1-1.5 3M12 17h.01"/></>}
  </svg>;
}

function PinMark() {
  return <svg className="pin-brand-symbol" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="15" fill="currentColor"/><path d="m11 27 4-17c1-4 7-3 6 2l-1 5c-1 4-7 3-6-1M9 20C4 14 9 5 16 6c10 0 12 13 5 17" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

// Measure real cards, then place each in the shortest column. DOM and tab order
// remain source order; the bounded collection has no virtualization or fetcher.
function PinFeed({indices,renderPin}:{indices:number[];renderPin:(index:number)=>ReactNode}) {
  const ref=useRef<HTMLDivElement>(null);
  const identity=indices.join(',');
  useLayoutEffect(()=>{
    const feed=ref.current!;
    let frame=0;
    const layout=()=>{
      const width=feed.clientWidth;
      const gap=16;
      const count=width<300?1:width<700?2:Math.max(2,Math.floor((width+gap)/236));
      const cardWidth=(width-gap*(count-1))/count;
      const heights=Array<number>(count).fill(0);
      for(const card of Array.from(feed.children) as HTMLElement[]) {
        card.style.width=cardWidth+'px';
        const column=heights.indexOf(Math.min(...heights));
        card.style.left=(column*(cardWidth+gap))+'px';
        card.style.top=heights[column]+'px';
        heights[column]+=card.getBoundingClientRect().height+gap;
      }
      feed.style.height=Math.max(0,Math.max(...heights)-gap)+'px';
    };
    const observer=new ResizeObserver(()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(layout);});
    observer.observe(feed);
    for(const child of Array.from(feed.children)) observer.observe(child);
    layout();
    return ()=>{observer.disconnect();cancelAnimationFrame(frame);};
  },[identity]);
  return <div className="pin-feed pin-masonry" ref={ref}>{indices.map(renderPin)}</div>;
}

const navigation=[
  {title:'Shortcuts',items:['Business Hub','Home feed','Add shortcut']},
  {title:'Create content',items:['Organic','Create Pin','Create Board','Create collage','Paid','Create Pin for ad','Create Pin for Idea ad','Create Pin for Collage ad']},
  {title:'Manage campaigns',items:['Create campaign','Ad account overview','Campaign manager','Custom ad reports','Ad recommendations','Ad account history','Media Planner','Bulk editor']},
  {title:'Analyze performance',items:['Analytics overview','Audience insights','Conversion insights','Pinboard Trends','Experiments']},
  {title:'Manage business',items:['Business Manager','Catalogs and product groups','Conversions','Audiences','Locations','Billing']},
];
const topics=[['All',''],['Design systems','systems'],['Typography','type'],['Editorial design','editorial'],['Visual identity','identity'],['Studio inspiration','studio'],['Objects & ideas','objects'],['Working together','together']] as const;

function selectedFromUrl() {
  const value=new URLSearchParams(location.search).get('pin');
  if(value===null || !/^\d+$/.test(value)) return null;
  const index=Number(value);
  return index<pins.length?index:null;
}

export function Pinterest() {
  const [selected,setSelected]=useState<number|null>(selectedFromUrl);
  const [query,setQuery]=useState('');
  const [overlay,setOverlay]=useState<'navigation'|'search'|'notifications'|'account'|null>(null);
  const [audienceOpen,setAudienceOpen]=useState(false);
  const [topic,setTopic]=useState('All');
  const [navHint,setNavHint]=useState('Discover tools to create, grow and manage your business.');
  const trigger=useRef<string|null>(null);
  const chrome=useRef<HTMLElement>(null);
  const audience=useRef<HTMLDialogElement>(null);
  const restoreTrigger=()=>{if(trigger.current)document.querySelector<HTMLElement>(trigger.current)?.focus();};
  const dismiss=()=>{setOverlay(null);requestAnimationFrame(restoreTrigger);};
  const toggleOverlay=(next:typeof overlay,selector:string)=>{
    trigger.current=selector;setOverlay(current=>current===next?null:next);
  };
  useEffect(()=>{
    if(!overlay)return;
    if(overlay==='search')document.querySelector<HTMLInputElement>('.pin-search-input')?.focus();
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();setOverlay(null);requestAnimationFrame(restoreTrigger);}};
    const outside=(event:PointerEvent)=>{if(!chrome.current?.contains(event.target as Node))setOverlay(null);};
    document.addEventListener('keydown',escape);document.addEventListener('pointerdown',outside);
    return ()=>{document.removeEventListener('keydown',escape);document.removeEventListener('pointerdown',outside);};
  },[overlay]);
  useEffect(()=>{if(audienceOpen)audience.current?.showModal();else audience.current?.close();},[audienceOpen]);
  const [saved,setSaved]=useState<number[]>([]);
  const [liked,setLiked]=useState<number[]>([]);
  const [hidden,setHidden]=useState<number[]>([]);
  const [onlySaved,setOnlySaved]=useState(false);
  const [comments,setComments]=useState<Record<number,string[]>>({});
  const [draft,setDraft]=useState('');
  const [notice,setNotice]=useState('');
  const [boards,setBoards]=useState<Record<number,string>>({});
  const board=selected===null?'Design inspiration':boards[selected]??'Design inspiration';
  const [boardOpen,setBoardOpen]=useState(false);
  const lastOpened=useRef<number|null>(null);
  const feedScroll=useRef(0);
  const detailHeading=useRef<HTMLHeadingElement>(null);
  useEffect(()=>{
    const restore=()=>setSelected(selectedFromUrl());
    window.addEventListener('popstate',restore);
    return ()=>window.removeEventListener('popstate',restore);
  },[]);
  useEffect(()=>{
    setDraft(''); setNotice('');
    if(selected!==null) {
      window.scrollTo(0,0);
      detailHeading.current?.focus({preventScroll:true});
    } else if(lastOpened.current!==null) {
      window.scrollTo(0,feedScroll.current);
      document.getElementById('open-pin-'+lastOpened.current)?.focus({preventScroll:true});
    }
  },[selected]);
  const navigate=(index:number|null)=>{
    if(selected===null&&index!==null) { feedScroll.current=window.scrollY; lastOpened.current=index; }
    const url=new URL(location.href);
    if(index===null) url.searchParams.delete('pin'); else url.searchParams.set('pin',String(index));
    history.pushState({},'',url);
    setSelected(index);
  };
  const toggleSave=(index:number)=>setSaved(current=>current.includes(index)?current.filter(i=>i!==index):[...current,index]);
  const shown=pins.map((pin,index)=>({...pin,index})).filter(pin=>
    !hidden.includes(pin.index)&&(!onlySaved||saved.includes(pin.index))&&
    (pin.title+' '+pin.maker).toLowerCase().includes(query.toLowerCase()));

  const renderPin=(index:number)=>{
    const pin=pins[index];
    return <div className="pin-placement" key={index}>
      <Card className="pin" data-testid={'pin-'+index}>
        <CardMedia>
          <a id={'open-pin-'+index} className="pin-open" href={'?page=pinterest&pin='+index} aria-label={'Open '+pin.title}
            onClick={event=>{if(!event.metaKey&&!event.ctrlKey&&!event.shiftKey&&!event.altKey){event.preventDefault();navigate(index);}}}>
            <Image size="full" src={pinArtwork(index)} alt={pin.title} aspectRatio={pin.ratio} objectFit="cover" objectPosition="50% 0%"/>
          </a>
        </CardMedia>
        <CardContent>
          <div className="pin-caption">
            <div className="pin-caption-copy"><Text truncate weight="semibold" title={pin.title}>{pin.title}</Text><Text className="muted small" truncate>{pin.maker}</Text></div>
            <Popover placement="bottom">
              <Popover.Trigger asChild><Button className="quiet icon-button" ariaLabel={'More options for '+pin.title}><Icon name="more-horizontal"/></Button></Popover.Trigger>
              <Popover.Content className="pin-menu"><Text weight="bold">This idea</Text><Button className="quiet" onClick={()=>{setHidden(items=>[...items,index]);}}>Hide this Pin</Button></Popover.Content>
            </Popover>
          </div>
        </CardContent>
      </Card>
      <div className="pin-action"><Button className="save-button" ariaLabel={(saved.includes(index)?'Unsave ':'Save ')+pin.title} ariaPressed={saved.includes(index)} onClick={()=>toggleSave(index)}>{saved.includes(index)?'Saved':'Save'}</Button></div>
    </div>;
  };
  const pin=selected===null?null:pins[selected];
  const home=(savedOnly=false)=>{navigate(null);setOnlySaved(savedOnly);setQuery('');setTopic('All');setOverlay(null);};
  const searchCards=(label:string,indices:number[])=><section className="pin-suggestion-group">
    <h2>{label}</h2>
    <div className="pin-suggestion-grid">{indices.map(index=><Button key={index} className="quiet pin-suggestion" onClick={()=>{setQuery(pins[index].title);setOnlySaved(false);setTopic('All');navigate(null);dismiss();}}>
      <span className="pin-suggestion-content"><Image src={pinArtwork(index)} alt="" width={80} height={80} objectFit="cover" radius="md"/><span>{pins[index].title.split(' — ')[0]}</span></span>
    </Button>)}</div>
  </section>;
  return <main className="retoken pinterest">
    {overlay&&<div className={'pin-scrim pin-scrim--'+overlay} onClick={dismiss} aria-hidden="true"/>}
    <header className={'pin-header'+(overlay==='search'?' pin-header--search':'')} ref={chrome}>
      <nav className="pin-primary" aria-label="Primary navigation">
        <Button className="quiet pin-brand" ariaLabel="Global navigation" aria-expanded={overlay==='navigation'} aria-controls="pin-global-navigation" onClick={()=>toggleOverlay('navigation','.pin-brand')}><span className="pin-brand-content"><PinMark/><Text weight="bold">Pinboard</Text><Icon name="menu"/></span></Button>
        <div className="pin-header-space"/>
        <Button className="quiet pin-business-account" ariaLabel="Business account" aria-expanded={overlay==='account'} aria-controls="pin-account-options" onClick={()=>toggleOverlay('account','.pin-business-account')}><span className="pin-business-content"><Avatar name="Darian Rosebrook" initials="DR" size="large" className="pin-profile"/><span className="pin-account-name">Darian Rosebrook</span><Icon name="chevron-down"/></span></Button>
        {overlay==='search'?<div className="pin-search-field">
          <Input className="pin-search-input" ariaLabel="Search collection" placeholder="Search" value={query} onChange={value=>{setQuery(value);setOnlySaved(false);setTopic('All');if(selected!==null)navigate(null);}} onKeyDown={event=>{if(event.key==='Enter')dismiss();}}/>
          <Button className="quiet icon-button" ariaLabel="Close search" onClick={dismiss}><Icon name="x"/></Button>
          <div id="pin-search-suggestions" className="pin-search-suggestions pin-overlay" role="region" aria-label="Search suggestions">{searchCards('Recent searches',[0,1,2,3,4,5])}{searchCards('Ideas for you',[6,7,8,9,10,11])}{searchCards('Popular on Pinboard',[12,13,14,15])}</div>
        </div>:<Button className="quiet pin-header-icon pin-search-trigger" ariaLabel="Search ideas" aria-expanded="false" onClick={()=>toggleOverlay('search','.pin-search-trigger')}><Icon name="search"/></Button>}
        <Button className="quiet pin-header-icon pin-notification-trigger" ariaLabel="Notifications, 2 unread" aria-expanded={overlay==='notifications'} aria-controls="pin-notifications" onClick={()=>toggleOverlay('notifications','.pin-notification-trigger')}><ChromeGlyph name="bell"/><Badge className="pin-count">2</Badge></Button>
        <Button className="quiet pin-header-icon" ariaLabel="Engagement" onClick={()=>{setOverlay(null);setAudienceOpen(true);}}><ChromeGlyph name="chat"/></Button>
        <Button className="quiet pin-header-icon pin-business-tools" ariaLabel="Business tools" aria-expanded={overlay==='navigation'} onClick={()=>toggleOverlay('navigation','.pin-business-tools')}><ChromeGlyph name="megaphone"/></Button>
        <Button className="quiet pin-header-icon pin-avatar-trigger" ariaLabel="Account options" aria-expanded={overlay==='account'} aria-controls="pin-account-options" onClick={()=>toggleOverlay('account','.pin-avatar-trigger')}><Avatar name="Darian Rosebrook" initials="DR" size="large" className="pin-profile"/></Button>
        <Button className="quiet pin-header-icon pin-account-chevron" ariaLabel="More account options" aria-expanded={overlay==='account'} onClick={()=>toggleOverlay('account','.pin-account-chevron')}><Icon name="chevron-down"/></Button>
      </nav>
      {overlay==='navigation'&&<section className="pin-global-navigation pin-overlay" id="pin-global-navigation" aria-label="Global navigation tools">
        <div className="pin-nav-columns">{navigation.map(group=><section key={group.title}><h2>{group.title}</h2>{group.items.map(item=>item==='Organic'||item==='Paid'?<h3 key={item}>{item}</h3>:<Button key={item} className="quiet pin-nav-link" onClick={()=>{if(item==='Home feed')home();else setNavHint(item+': A place to bring your ideas and your audience together.');}} onFocus={()=>setNavHint(item+': A place to bring your ideas and your audience together.')} onMouseEnter={()=>setNavHint(item+': A place to bring your ideas and your audience together.')}><span>{item}</span>{item==='Conversion insights'&&<Badge className="pin-new-tag">Beta</Badge>}{item==='Experiments'&&<Badge className="pin-new-tag">New</Badge>}</Button>)}</section>)}</div>
        <div className="pin-nav-hint"><Icon name="info"/><span>{navHint}</span></div>
      </section>}
      {overlay==='notifications'&&<section className="pin-notifications pin-overlay pin-floating-panel" id="pin-notifications" aria-label="Notifications"><h2>Updates</h2><p className="pin-panel-muted">Fresh inspiration for your next big idea.</p>{[8,12].map((index,i)=><Button key={index} className="quiet pin-update" onClick={()=>{navigate(index);dismiss();}}><Image src={pinArtwork(index)} alt="" width={64} height={80} objectFit="cover"/><span><strong>{i===0?'A little inspiration for you':'Ideas you might love'}</strong><br/>{pins[index].title}<small>{i===0?'2 hours ago':'Yesterday'}</small></span><i aria-label="Unread"/></Button>)}</section>}
      {overlay==='account'&&<section className="pin-account-menu pin-overlay pin-floating-panel" id="pin-account-options" aria-label="Account options"><p>Currently in</p><div className="pin-current-account"><Avatar name="Darian Rosebrook" initials="DR" size="large" className="pin-profile"/><div><strong>Darian Rosebrook</strong><small>Business</small></div><Icon name="check"/></div><p>Your collection</p><Button className="quiet pin-account-link" onClick={()=>home()}>Home feed</Button><Button className="quiet pin-account-link" onClick={()=>home(true)}>Saved ({saved.length})</Button><p>More options</p><Button className="quiet pin-account-link" onClick={()=>{setOverlay(null);setAudienceOpen(true);}}>Engagement</Button><Button className="quiet pin-account-link" onClick={()=>{location.search='?page=spotify';}}>Switch to music page<Icon name="external-link"/></Button></section>}
    </header>
    <dialog className="pin-audience-dialog" ref={audience} onCancel={()=>setAudienceOpen(false)} onClose={()=>setAudienceOpen(false)} onClick={event=>{if(event.target===event.currentTarget){const box=event.currentTarget.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)setAudienceOpen(false);}}} aria-labelledby="pin-audience-title" aria-describedby="pin-audience-description">
      <div className="pin-audience-body"><svg viewBox="0 0 260 180" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 140c24 30 36-53 29-34-17 37 20 69 26 25 6-46 23 41 34 23l27-32M101 141l44-90 83-24 10 13-84 73-45 36Z"/><path d="m117 125 14 10 23-22M144 51c-24 9-37 25-40 49l-5 30c-3 15 13 18 21 5M156 74c-9-4-25 5-27 20l-4 18M155 114c12 8 18 20 30 12l64-45M137 128c-8 19 5 26 12 9 0 22 15 17 16 1 7 15 17 8 18-4M228 27l-7-12-13 10"/></svg><div><h2 id="pin-audience-title">Build your audience</h2><p id="pin-audience-description">React and respond to comments on your Pins. Help build your audience and bring people back to your ideas.</p></div></div><footer><Button className="quiet" onClick={()=>setAudienceOpen(false)}>Got it</Button></footer>
    </dialog>
    {pin&&selected!==null ? <div className="pin-detail-layout">
      <Card className="pin-detail-card">
        <div className="pin-detail-panel">
          <div className="pin-detail-art">
            <Image size="full" src={pinArtwork(selected)} alt={pin.title}/>
            <div className="pin-back"><Button className="round-action" ariaLabel="Back to feed" onClick={()=>navigate(null)}><Icon name="arrow-left"/></Button></div>
          </div>
          <section className="pin-information" aria-label="Pin details">
            <div className="pin-toolbar">
              <Button className="quiet" ariaPressed={liked.includes(selected)} ariaLabel={'Like '+pin.title} onClick={()=>setLiked(items=>items.includes(selected)?items.filter(i=>i!==selected):[...items,selected])}>{liked.includes(selected)?'Liked':'Like'} {liked.includes(selected)?1:0}</Button>
              <Button className="quiet icon-button" ariaLabel="Copy Pin link" onClick={async()=>{try{await navigator.clipboard.writeText(location.href);setNotice('Pin link copied');}catch{setNotice('Copy this page address from your browser to share this Pin.');}}}><Icon name="external-link"/></Button>
              <div className="pin-board"><Popover open={boardOpen} onOpenChange={setBoardOpen} placement="bottom"><Popover.Trigger asChild><Button className="quiet" ariaLabel="Choose board">{board}<Icon name="chevron-down"/></Button></Popover.Trigger><Popover.Content className="pin-menu">{['Design inspiration','Read later','Studio references'].map(name=><Button key={name} className="quiet" ariaPressed={board===name} onClick={()=>{setBoards(current=>({...current,[selected]:name}));setBoardOpen(false);}}>{name}</Button>)}</Popover.Content></Popover></div>
              <Button className="save-button" ariaLabel={(saved.includes(selected)?'Unsave ':'Save ')+pin.title} ariaPressed={saved.includes(selected)} onClick={()=>toggleSave(selected)}>{saved.includes(selected)?'Saved':'Save'}</Button>
            </div>
            <Stack className="pin-author" variant="horizontal"><Avatar size="medium" name={pin.maker} initials={pin.maker.split(' ').map(word=>word[0]).slice(0,2).join('')}/><Text>{pin.maker}</Text></Stack>
            <h1 ref={detailHeading} tabIndex={-1} className="pin-detail-heading"><Text as="span" weight="bold" className="section-title">{pin.title}</Text></h1>
            <Card className="pin-context"><CardContent><Text weight="semibold">From the studio</Text><Text className="muted">An original study in typography, composition and visual systems. Saved as a reference for your next project.</Text></CardContent></Card>
            <Text weight="bold">Description</Text><Text className="muted">A closer look at {pin.maker}'s approach to form, rhythm and hierarchy. Part of our independent design collection.</Text>
            {saved.includes(selected)&&<Text className="small">Saved to {board}</Text>}
            <div className="pin-comments">
              <Text weight="bold">Comments ({(comments[selected]??[]).length})</Text>
              {(comments[selected]??[]).length===0?<Text className="muted">What catches your eye?</Text>:(comments[selected]??[]).map((comment,index)=><Card className="pin-context" key={index}><CardContent><Text weight="semibold">You</Text><Text>{comment}</Text></CardContent></Card>)}
            </div>
            <form className="pin-comment-form" onSubmit={event=>{event.preventDefault();const value=draft.trim();if(!value)return;setComments(current=>({...current,[selected]:[...(current[selected]??[]),value]}));setDraft('');}}>
              <Input ariaLabel="Add a comment" placeholder="Add a comment to start the conversation" value={draft} onChange={setDraft}/>
              <Button className="quiet icon-button" ariaLabel="Post comment" type="submit" disabled={!draft.trim()}><Icon name="arrow-up"/></Button>
            </form>
            {notice&&<Text role="status" className="small">{notice}</Text>}
          </section>
        </div>
      </Card>
      <aside aria-label="Related Pins" className="related-pins"><Text as="h2" className="related-heading" weight="bold">More like this</Text><PinFeed indices={pins.map((_,index)=>index).filter(index=>index!==selected&&!hidden.includes(index))} renderPin={renderPin}/></aside>
    </div> : <>
      <nav className="pin-topics" aria-label="Feed topics">{topics.map(([label,term])=><Button key={label} className={'quiet pin-topic'+(topic===label&&!onlySaved?' pin-topic--active':'')} ariaLabel={label==='All'?'Home':label} ariaPressed={topic===label&&!onlySaved} onClick={()=>{setTopic(label);setQuery(term);setOnlySaved(false);}}>{label}</Button>)}<Button className={'quiet pin-topic'+(onlySaved?' pin-topic--active':'')} ariaPressed={onlySaved} onClick={()=>home(true)}>Saved ({saved.length})</Button></nav>
      {(onlySaved||query)&&<h1 className="feed-heading"><Text as="span" weight="semibold">{onlySaved?'Your saved ideas':'Search results'}</Text></h1>}
      <PinFeed indices={shown.map(pin=>pin.index)} renderPin={renderPin}/>
      {shown.length===0&&<Text className="empty-state" role="status">No ideas found</Text>}
    </>}
    <Button className="pin-help" ariaLabel="Help and audience tips" onClick={()=>{setOverlay(null);setAudienceOpen(true);}}><ChromeGlyph name="help"/></Button>
  </main>;
}
