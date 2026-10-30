import { useEffect, useRef, useState } from 'react';
import { Avatar, Button, Card, CardMedia, CardContent, Image, Input, Text, Icon, Progress, Popover, Tooltip } from '../../packages/ds-react/src/components';
import { Stack } from '../../packages/ds-react/src/primitives';
import { artwork, studies } from './artwork';

const tracks = [
  { title: 'First light', duration: '3:54' }, { title: 'An open window', duration: '4:12' },
  { title: 'Coffee, slowly', duration: '2:48' }, { title: 'Somewhere quiet', duration: '5:06' },
  { title: 'Nothing in a hurry', duration: '3:32' }, { title: 'Stay a little longer', duration: '4:18' },
];
function albumFromUrl() {
  const value = new URLSearchParams(location.search).get('album');
  return value !== null && /^\d+$/.test(value) && Number(value) < studies.length ? Number(value) : null;
}
function followLink(event: React.MouseEvent, navigate: () => void) {
  if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) { event.preventDefault(); navigate(); }
}

export function Spotify() {
  const [album, setAlbum] = useState<number | null>(albumFromUrl);
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [selected, setSelected] = useState(1);
  const [track, setTrack] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [category, setCategory] = useState('All');
  const [collapsed, setCollapsed] = useState(false);
  const [saved, setSaved] = useState<number[]>([]);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const lastOpened = useRef<number | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const feedScroll = useRef(0);
  const searchInput = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const restore = () => setAlbum(albumFromUrl());
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, []);
  useEffect(() => {
    if (album !== null) { window.scrollTo(0, 0); heading.current?.focus({ preventScroll: true }); }
    else if (lastOpened.current !== null) {
      window.scrollTo(0, feedScroll.current);
      const target = opener.current?.isConnected && opener.current.getClientRects().length ? opener.current : document.getElementById('open-album-' + lastOpened.current);
      (target ?? searchInput.current?.querySelector('input'))?.focus({ preventScroll: true });
    }
  }, [album]);
  const navigate = (index: number | null) => {
    if (album === null && index !== null) { lastOpened.current = index; feedScroll.current = window.scrollY; opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; }
    const url = new URL(location.href);
    if (index === null) url.searchParams.delete('album'); else url.searchParams.set('album', String(index));
    history.pushState({}, '', url); setAlbum(index); setSearchOpen(false);
  };
  const play = (index: number, nextTrack: number | null = null) => { setSelected(index); setTrack(nextTrack); setPlaying(true); };
  const current = studies[selected];
  const shown = studies.map((study, index) => ({ ...study, index })).filter(s => (s.title + ' ' + s.maker).toLowerCase().includes(query.toLowerCase()));
  const detail = album === null ? null : studies[album];
  const albumPlaying = album === selected && playing;
  const toggleAlbum = () => { if (album === null) return; if (album === selected) { if (track === null) setTrack(0); setPlaying(!playing); } else play(album, 0); };
  const home = () => { setQuery(''); setCategory('All'); navigate(null); };
  const renderAlbum = (index: number, radio = false) => {
    const study = studies[index];
    return <div className="album-placement" key={index}>
      <Card className={radio ? 'radio-card' : 'album'}>
        <CardMedia><a id={radio ? undefined : 'open-album-' + index} className="album-open" href={'?page=spotify&album=' + index} aria-label={'Open ' + study.title + (radio ? ' radio' : '')} onClick={event => followLink(event, () => navigate(index))}>
          <Image size="full" src={artwork(index)} alt={`${study.title} cover`} aspectRatio="square" objectFit="cover" objectPosition="50% 35%"/>
        </a></CardMedia>
        <CardContent><Stack layout="block"><Button className="quiet album-title" onClick={() => navigate(index)}>{study.title}{radio ? ' Radio' : ''}</Button></Stack><Text className="muted small" truncate>{radio ? `With ${study.maker} and more` : study.maker}</Text></CardContent>
      </Card>
      <Button className="play-button album-play" ariaLabel={'Play ' + study.title + (radio ? ' radio' : '')} onClick={() => play(index)}>▶</Button>
    </div>;
  };
  return <main className={'retoken spotify' + (collapsed ? ' library-collapsed' : '')}>
    <header className="music-header">
      <Button className="quiet soundroom-brand" onClick={home} ariaLabel="Soundroom home"><Icon name="circle-dot"/><Text weight="bold">Soundroom</Text></Button>
      <Button className="home-action" onClick={home} ariaLabel="Home"><Icon name="home"/></Button>
      <div ref={searchInput} className="music-search" onFocus={() => setSearchOpen(true)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setSearchOpen(false); }} onKeyDown={event => { if (event.key === 'Escape') { setSearchOpen(false); searchInput.current?.querySelector('input')?.focus(); } }}>
        <Stack variant="horizontal" className="search-region"><Icon name="search"/><Input ariaLabel="Search collection" placeholder="What do you want to play?" value={query} onChange={value => { setQuery(value); setSearchOpen(true); }}/>{query && <Button className="quiet icon-button" ariaLabel="Clear search" onClick={() => { setQuery(''); searchInput.current?.querySelector('input')?.focus(); }}><Icon name="x"/></Button>}</Stack>
        {searchOpen && <section className="search-suggestions" aria-label="Search suggestions"><Text className="muted small">{query ? 'Albums & artists' : 'A little inspiration'}</Text>
          {shown.slice(0, 4).map(study => <Button key={study.index} className="quiet suggestion" onClick={() => navigate(study.index)}><Image src={artwork(study.index)} alt="" width={40} height={40} objectFit="cover"/><span><Text weight="semibold">{study.title}</Text><Text className="muted small">Album · {study.maker}</Text></span></Button>)}
          {shown.length === 0 && <Text role="status">No mixes found. Try an artist or album.</Text>}
        </section>}
      </div>
      <div className="header-spacer"/>
      <Popover placement="bottom"><Popover.Trigger asChild><Button className="premium-button">Explore Premium</Button></Popover.Trigger><Popover.Content className="music-menu"><Text weight="bold">More room for music</Text><Text>This is a local listening preview. No subscription is required.</Text></Popover.Content></Popover>
      <Button className="quiet icon-button" ariaLabel="Switch to image feed" onClick={() => { location.search = '?page=pinterest'; }}><Icon name="panel-right"/></Button>
      <Popover placement="bottom" open={profileOpen} onOpenChange={setProfileOpen}><Popover.Trigger asChild><Button className="profile-button" ariaLabel="Your profile"><Avatar name="Your profile" initials="D" size="small"/></Button></Popover.Trigger><Popover.Content className="music-menu profile-menu"><Text weight="bold">Your listening space</Text><Text className="small">Local preview · Studio listener</Text><Button className="quiet" onClick={() => { setCategory('All'); navigate(null); setProfileOpen(false); }}>Recently played</Button><Button className="quiet" onClick={() => { setNotice('Your collection is kept for this visit.'); setProfileOpen(false); }}>About your collection</Button></Popover.Content></Popover>
    </header>
    <div className="music-shell">
      <aside className="library" aria-label="Your Library">
        <Stack className="library-body">
          <Stack variant="horizontal" className="section-heading library-heading"><Tooltip placement="right"><Tooltip.Trigger asChild><Button className="quiet library-toggle" ariaLabel={collapsed ? 'Expand Your Library' : 'Collapse Your Library'} ariaExpanded={!collapsed} onClick={() => setCollapsed(!collapsed)}><Icon name="panel-left"/><span className="library-label">Your Library</span></Button></Tooltip.Trigger><Tooltip.Content>{collapsed ? 'Expand Your Library' : 'Collapse Your Library'}</Tooltip.Content></Tooltip><Button className="quiet create-library" onClick={() => setNotice('Save an album to start your collection.')}>+ Create</Button></Stack>
          <div className="library-expanded">
            <Stack variant="horizontal" className="pills">{['All', 'Playlists', 'Artists', 'Albums'].map(label => <Button key={label} size="small" ariaPressed={category === label} className={category === label ? 'selected' : 'quiet'} onClick={() => setCategory(label)}>{label}</Button>)}</Stack>
            <Card className="library-prompt"><CardContent><Text weight="bold">Make yourself at home.</Text><Text className="small">A small collection. A whole new headspace.</Text><Button className="selected" size="small" onClick={() => { searchInput.current?.querySelector('input')?.focus(); }}>Find your next favorite</Button></CardContent></Card>
            <Stack variant="horizontal" className="section-heading"><Text className="muted small">{category === 'All' ? 'Recently played' : category}</Text><Icon name="menu"/></Stack>
          </div>
          {studies.slice(0, 8).map((study, index) => <a className={'library-row' + (album === index ? ' library-row-active' : '')} key={study.title} href={'?page=spotify&album=' + index} aria-label={'Open ' + study.title + ' from library'} onClick={event => followLink(event, () => navigate(index))} title={study.title}>
            <div className="thumb"><Image src={artwork(index)} alt="" width={48} height={48} objectFit="cover" radius={category === 'Artists' ? 'full' : 'sm'}/></div>
            <div className="library-copy"><Text weight="semibold" truncate>{category === 'Artists' ? study.maker : study.title}</Text><Text className="muted small" truncate>{category === 'Artists' ? 'Artist' : `${saved.includes(index) ? 'Saved album' : category === 'Playlists' ? 'Playlist' : 'Album'} · ${study.maker}`}</Text></div>
          </a>)}
        </Stack>
      </aside>
      <section className={'discovery' + (detail ? ' album-discovery' : '')} aria-label={detail ? 'Album details' : 'Music discovery'}>
        {detail && album !== null ? <>
          <Button className="quiet back-discovery" ariaLabel="Back to discovery" onClick={() => navigate(null)}><Icon name="arrow-left"/> Back to discovery</Button>
          <div className="album-hero" style={{ '--album-color': detail.color } as React.CSSProperties}>
            <div className="album-hero-art"><Image size="full" src={artwork(album)} alt={detail.title + ' cover'} aspectRatio="square" objectFit="cover" objectPosition="50% 35%"/></div>
            <div className="album-hero-copy"><Text weight="semibold" className="eyebrow">STUDIO ALBUM</Text><h1 ref={heading} tabIndex={-1}>{detail.title}</h1><Text>Small moments, given a little more room.</Text><Text weight="semibold">{detail.maker} <span className="album-meta">· 2026 · 6 songs, 23 min 50 sec</span></Text></div>
          </div>
          <Stack variant="horizontal" className="album-actions"><Button className="play-button album-main-play" ariaLabel={(albumPlaying ? 'Pause ' : 'Play ') + detail.title} ariaPressed={albumPlaying} onClick={toggleAlbum}>{albumPlaying ? 'Ⅱ' : '▶'}</Button><Button className="quiet save-album" ariaLabel={(saved.includes(album) ? 'Remove ' : 'Save ') + detail.title} ariaPressed={saved.includes(album)} onClick={() => setSaved(values => values.includes(album) ? values.filter(i => i !== album) : [...values, album])}>{saved.includes(album) ? '✓ ' : '+ '}{saved.includes(album) ? 'Saved to your library' : 'Save to your library'}</Button><Text className="muted small">A Soundroom original</Text></Stack>
          <table className="track-list"><caption className="sr-only">Tracks on {detail.title}</caption><thead><tr><th scope="col">#</th><th scope="col">Title</th><th scope="col">Duration</th></tr></thead><tbody>{tracks.map((item, index) => <tr className={selected === album && track === index ? 'active-track' : ''} key={item.title}><td>{selected === album && track === index && playing ? <Text aria-hidden="true">♪</Text> : index + 1}</td><td><Button className="quiet track-title" ariaLabel={(selected === album && track === index && playing ? 'Pause ' : 'Play ') + item.title} onClick={() => { if (selected === album && track === index) setPlaying(!playing); else play(album, index); }}>{item.title}</Button><Text className="muted small">{detail.maker}</Text></td><td><Text className="muted small">{item.duration}</Text></td></tr>)}</tbody></table>
          <div className="album-about"><Text className="eyebrow muted">THE STORY BEHIND THE SOUND</Text><Text as="h2" className="section-title" weight="bold">A slower kind of listening.</Text><Text className="muted">Made for the spaces between things. {detail.maker} brings together warm textures, gentle rhythms, and a little everyday wonder.</Text><Text className="muted small">6 original preview tracks · © 2026 {detail.maker}</Text></div>
          <Text as="h2" weight="bold" className="section-title">Keep the feeling going</Text><div className="album-grid">{[1, 2, 3, 4].map(offset => renderAlbum((album + offset) % studies.length))}</div>
        </> : <>
          <Stack variant="horizontal" className="pills discovery-pills"><Button className="selected" size="small">All</Button><Text className="muted small">Your daily dose of good sound</Text></Stack>
          <Text as="h2" weight="bold" className="page-title">Good morning</Text>
          <div className="quick-picks">{studies.slice(0, 6).map((study, index) => <div className="quick-pick" key={study.title}><Image src={artwork(index)} alt="" width={56} height={56} objectFit="cover"/><Button className="quiet" onClick={() => navigate(index)}>{study.title}</Button></div>)}</div>
          {!query && <div className="discovery-feature"><Card className="getting-started"><CardContent><Text className="eyebrow">A GOOD PLACE TO BEGIN</Text><Text as="h2" weight="bold">Find your own rhythm.</Text><Text>Fresh sounds for slow starts, deep focus, and everything in between.</Text><Button className="play-button" onClick={() => navigate(0)}>Explore the collection <Icon name="arrow-right"/></Button></CardContent></Card><section aria-label="Popular radio"><Text as="h2" weight="bold" className="section-title">Popular radio</Text><div className="radio-grid">{[4, 5].map(index => renderAlbum(index, true))}</div></section></div>}
          {!query && <section className="popular-artists" aria-label="Popular artists"><Stack variant="horizontal" className="section-heading"><Text as="h2" className="section-title" weight="bold">Popular artists</Text><Text className="muted small">Meet your next favorite</Text></Stack><div className="artist-grid">{studies.slice(0, 5).map((study, index) => <div className="artist-card" key={study.maker}><a href={'?page=spotify&album=' + index} aria-label={'Explore ' + study.maker} onClick={event => followLink(event, () => navigate(index))}><Image size="full" src={artwork(index)} alt={study.maker + ' studio artwork'} aspectRatio="square" objectFit="cover" radius="full"/></a><Button className="quiet album-title" onClick={() => navigate(index)}>{study.maker}</Button><Text className="muted small">Artist</Text></div>)}</div></section>}
          <Stack variant="horizontal" className="section-heading"><Text as="h2" weight="bold" className="section-title">{query ? 'Search results' : 'Made for your morning'}</Text><Text className="muted small">Original studio mixes</Text></Stack><div className="album-grid">{shown.slice(0, 8).map(study => renderAlbum(study.index))}</div>{shown.length === 0 && <Text role="status">No mixes found</Text>}
        </>}
      </section>
      <aside className="now-playing" aria-label="Now playing"><Stack variant="horizontal" className="section-heading"><Text weight="bold">Now playing</Text><Icon name="more-horizontal"/></Stack><Image size="full" radius="md" src={artwork(selected)} alt={`${current.title} artwork`} aspectRatio="square" objectFit="cover"/><Text as="h2" weight="bold" className="section-title">{track === null ? current.title : tracks[track].title}</Text><Text className="muted">{current.maker}</Text><Card className="artist-note"><CardContent><Text weight="bold">Behind the mix</Text><Text className="muted">Quiet places, considered objects, and a little space to think. A collection of original visual studies.</Text></CardContent></Card></aside>
    </div>
    {notice && <div className="music-notice" role="status"><Text>{notice}</Text><Button className="quiet icon-button" ariaLabel="Dismiss message" onClick={() => setNotice('')}><Icon name="x"/></Button></div>}
    <footer className="player"><div className="library-row"><Image src={artwork(selected)} alt="" width={48} height={48} objectFit="cover" radius="sm"/><div><Text weight="bold">{track === null ? current.title : tracks[track].title}</Text><Text className="muted small">{current.maker}</Text></div></div><Stack className="playback"><Stack variant="horizontal" className="transport"><Button className="quiet" ariaLabel={track === null ? 'Previous mix' : 'Previous track'} onClick={() => { if (track === null) setSelected((selected + studies.length - 1) % studies.length); else setTrack((track + tracks.length - 1) % tracks.length); }}><Icon name="arrow-left"/></Button><Button className="play-button" ariaPressed={playing} onClick={() => setPlaying(!playing)}>{playing ? 'Pause' : 'Play'}</Button><Button className="quiet" ariaLabel={track === null ? 'Next mix' : 'Next track'} onClick={() => { if (track === null) setSelected((selected + 1) % studies.length); else setTrack((track + 1) % tracks.length); }}><Icon name="arrow-right"/></Button></Stack><div className="timeline"><Text className="small muted">1:24</Text><Progress value={36} label="Track position"/><Text className="small muted">{track === null ? '3:54' : tracks[track].duration}</Text></div></Stack><Text className="muted small player-note" align="right">Visual playback preview</Text></footer>
  </main>;
}
