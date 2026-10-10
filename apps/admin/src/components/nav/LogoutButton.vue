<script setup lang="ts">
import { LogOut } from '@lucide/vue';
import { useMutation } from '@tanstack/vue-query';
import { SidebarMenuButton } from '@/components/ui/sidebar';
import { logout } from '@/lib/session';

const { mutate, isPending } = useMutation({
  mutationFn: () => logout(),
});

const onClick = () => mutate();
</script>

<template>
  <SidebarMenuButton
    class="w-full justify-start gap-2"
    :disabled="isPending"
    tooltip="Logout"
    @click="onClick"
  >
    <LogOut />
    <span class="truncate transition-opacity duration-300 group-data-[collapsible=icon]:opacity-0"
      >Logout</span
    >
  </SidebarMenuButton>
</template>
