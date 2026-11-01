<script setup lang="ts">
// @generated:start imports
import { computed } from "vue";
import { useFsdsMessages, withFsdsMessageDefaults, formatFsdsMessage } from "../../primitives/messages.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type PostcardAuthor = { name: string; handle: string; avatar: string };
export type PostcardStatValue = number | string;
export type PostcardStats = { likes: PostcardStatValue; replies: PostcardStatValue; reposts: PostcardStatValue };
export type PostcardEmbed = { type: 'image' | 'video' | 'audio'; url: string; aspectRatio: { width: number; height: number } };
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
  dataTestid?: string;
}
// @generated:end

// @generated:start defineProps
const fsdsProps = defineProps<Props>();
const PostcardMessages = { postLabel: "Post by {name}", likes: "Likes: {count}", replies: "Replies: {count}", reposts: "Reposts: {count}" };
const fsdsMessages = useFsdsMessages("Postcard", PostcardMessages);
const props = withFsdsMessageDefaults(fsdsProps, fsdsMessages, {  });
// @generated:end

// @generated:start classes
const classNames = computed(() => [
  "postcard",
  props.type ? `postcard--${props.type}` : null,
  props.class,
].filter(Boolean).join(" "));
// @generated:end

// @custom:start trailing

// @custom:end
</script>

<template>
  <article :class="classNames" :aria-label="formatFsdsMessage(fsdsMessages.postLabel, { name: props.author.name })" :data-testid="props.dataTestid" data-fsds-component="postcard" data-fsds-box="">
    <div :class="'postcard__header'">
      <div :class="'postcard__userInfo'">
        <span :class="'postcard__displayName'">
          {{ props.author.name }}
        </span>
        <span :class="'postcard__handle'">
          {{ props.author.handle }}
        </span>
      </div>
      <time :class="'postcard__timestamp'" :datetime="props.timestamp">
        {{ props.timestamp }}
      </time>
    </div>
    <div :class="'postcard__content'">
      <slot />
    </div>
    <div :class="'postcard__footer'">
      <div :class="'postcard__stats'">
        <span :class="'postcard__stat'">
          {{ formatFsdsMessage(fsdsMessages.likes, { count: props.stats.likes }) }}
        </span>
        <span :class="'postcard__stat'">
          {{ formatFsdsMessage(fsdsMessages.replies, { count: props.stats.replies }) }}
        </span>
        <span :class="'postcard__stat'">
          {{ formatFsdsMessage(fsdsMessages.reposts, { count: props.stats.reposts }) }}
        </span>
      </div>
    </div>
  </article>
</template>
