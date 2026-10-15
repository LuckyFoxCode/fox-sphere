<script setup lang="ts">
import { LogIn, LogOut } from '@lucide/vue';
import { useMutation, useQueryClient } from '@tanstack/vue-query';
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { getGetSessionMeQueryKey } from '@/api/generated/auth/auth';
import type { SessionState } from '@/composables/useSession';
import { SidebarMenuButton } from '@/components/ui/sidebar';
import { login, logout } from '@/lib/session';

const { state } = defineProps<{ state: SessionState }>();

const queryClient = useQueryClient();
const router = useRouter();

const { mutate, isPending } = useMutation({
  mutationFn: () => logout(),
  // The session query decided which of the two buttons to render, and it was answered while
  // the cookie still existed. Without this refetch the panel keeps claiming a session the
  // server has already thrown away, and the button stays "Logout" forever.
  //
  // The redirect is what makes signing out feel like signing out. Refetching alone only swaps
  // the footer button and the header name to Guest - you stay exactly where you were, on a
  // page whose every query now answers 401, which reads as a broken panel rather than a
  // signed-out one. Home is where nothing depends on a session.
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: getGetSessionMeQueryKey() });
    void router.push('/');
  },
});

// Only the two states we can act on get a control. While the answer is unknown - still in
// flight, or `apps/api` down - the footer shows nothing, rather than a Login button that would
// either fail or claim somebody is signed out.
const isAdmin = computed(() => state === 'admin');
const isGuest = computed(() => state === 'guest');
const label = computed(() => (isAdmin.value ? 'Logout' : 'Login'));

const onClick = () => (isAdmin.value ? mutate() : login());
</script>

<template>
  <SidebarMenuButton
    v-if="isAdmin || isGuest"
    class="w-full justify-start gap-2"
    :disabled="isPending"
    :tooltip="label"
    @click="onClick"
  >
    <LogOut v-if="isAdmin" />
    <LogIn v-else />
    <span
      class="truncate transition-opacity duration-300 group-data-[collapsible=icon]:opacity-0"
      >{{ label }}</span
    >
  </SidebarMenuButton>
</template>
