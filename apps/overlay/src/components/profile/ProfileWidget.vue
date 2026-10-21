<script setup lang="ts">
import { useProfileSocket } from '@/composables/sockets';
import { socket } from '@/services';
import { ProfileCard } from './widgets';

const { activeProfile } = useProfileSocket(socket);
</script>

<template>
  <div class="fixed right-[20%] bottom-[50%]">
    <Transition
      name="profile-slide"
      mode="out-in"
    >
      <ProfileCard
        v-if="activeProfile"
        :profile="activeProfile"
      />
    </Transition>
  </div>
</template>
