import { createRoot } from 'react-dom/client';
import '../../../packages/ds-tokens/generated/tokens.css';
import './theme.css';
import { Pinterest } from './pinterest';
import { Spotify } from './spotify';

const page = new URLSearchParams(location.search).get('page') ?? 'spotify';
createRoot(document.getElementById('root')!).render(page === 'pinterest' ? <Pinterest/> : <Spotify/>);
