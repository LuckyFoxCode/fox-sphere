<script setup lang="ts">
import type { Channel } from '@/api/generated/schemas';
import { RouterLink } from 'vue-router';
import { Badge } from '../ui/badge';
import { statusVariant } from './channel-status';

defineProps<{ channels: Channel[] }>();
</script>

<template>
  <div
    v-if="channels.length === 0"
    class="text-muted-foreground py-8 text-center text-sm"
  >
    No channels yet — create the first one below.
  </div>

  <table
    v-else
    class="w-full text-sm"
  >
    <thead>
      <tr class="border-border border-b text-left">
        <th class="px-3 py-2 font-medium">Login</th>
        <th class="px-3 py-2 font-medium">Display name</th>
        <th class="px-3 py-2 font-medium">Status</th>
        <th class="px-3 py-2 font-medium">Bot mod</th>
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="channel in channels"
        :key="channel.id"
        class="border-border hover:bg-accent/50 border-b transition-colors"
      >
        <td class="px-3 py-2">
          <RouterLink
            :to="`/channels/${channel.id}`"
            class="hover:underline"
          >
            {{ channel.login }}
          </RouterLink>
        </td>
        <td class="px-3 py-2">{{ channel.displayName }}</td>
        <td class="px-3 py-2">
          <Badge :variant="statusVariant[channel.status]">
            {{ channel.status }}
          </Badge>
        </td>
        <td class="px-3 py-2">{{ channel.botIsMod ? 'yes' : 'no' }}</td>
      </tr>
    </tbody>
  </table>
</template>
