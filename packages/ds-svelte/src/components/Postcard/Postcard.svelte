<script module lang="ts">
// @generated:start publicTypes
export type PostcardAuthor = { name: string; handle: string; avatar: string };
export type PostcardStatValue = number | string;
export type PostcardStats = { likes: PostcardStatValue; replies: PostcardStatValue; reposts: PostcardStatValue };
export type PostcardEmbed = { type: 'image' | 'video' | 'audio'; url: string; aspectRatio: { width: number; height: number } };
// @generated:end
</script>

<script lang="ts">
// @generated:start imports
import { useFsdsMessages, formatFsdsMessage } from "../../primitives/messages.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types

// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
interface Props {
  postId: string;
  author: PostcardAuthor;
  timestamp: string;
  stats: PostcardStats;
  embed?: PostcardEmbed;
  type?: string;
  class?: string;
  children?: import('svelte').Snippet;
}

let { postId, author, timestamp, stats, embed, type, class: className, children }: Props = $props();
const PostcardMessages = { postLabel: "Post by {name}", likes: "Likes: {count}", replies: "Replies: {count}", reposts: "Reposts: {count}" };
const fsdsMessages = useFsdsMessages("Postcard", PostcardMessages);
// @generated:end

// @generated:start classes
const classes = $derived(
  [
    "postcard",
    type ? `postcard--${type}` : null,
    className,
  ].filter(Boolean).join(" ")
);
// @generated:end

// @custom:start trailing

// @custom:end
</script>

<article class={classes} aria-label={formatFsdsMessage(fsdsMessages.current.postLabel, { name: author.name })} data-fsds-component="postcard" data-fsds-box="">
  <div class={'postcard__header'}>
    <div class={'postcard__userInfo'}>
      <span class={'postcard__displayName'}>{author.name}</span>
      <span class={'postcard__handle'}>{author.handle}</span>
    </div>
    <time class={'postcard__timestamp'} datetime={timestamp}>{timestamp}</time>
  </div>
  <div class={'postcard__content'}>
    {@render children?.()}
  </div>
  <div class={'postcard__footer'}>
    <div class={'postcard__stats'}>
      <span class={'postcard__stat'}>{formatFsdsMessage(fsdsMessages.current.likes, { count: stats.likes })}</span>
      <span class={'postcard__stat'}>{formatFsdsMessage(fsdsMessages.current.replies, { count: stats.replies })}</span>
      <span class={'postcard__stat'}>{formatFsdsMessage(fsdsMessages.current.reposts, { count: stats.reposts })}</span>
    </div>
  </div>
</article>
