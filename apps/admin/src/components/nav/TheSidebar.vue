<script setup lang="ts">
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { useRoute } from 'vue-router';
import { navItems } from './navigation';

const route = useRoute();

const isActive = (url: string) => {
  if (url === '/') return route.path === '/';
  return route.path.startsWith(url);
};
</script>
<template>
  <Sidebar>
    <SidebarHeader>
      <div class="flex flex-col gap-0.5">
        <span class="text-sidebar-foreground text-lg font-semibold">Fox Sphere</span>
        <span class="text-sidebar-foreground/60 text-xs">Admin</span>
      </div>
    </SidebarHeader>

    <SidebarSeparator />

    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel>Navigation</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem
              v-for="item in navItems"
              :key="item.url"
            >
              <SidebarMenuButton
                as-child
                :is-active="isActive(item.url)"
              >
                <RouterLink :to="item.url">
                  <component :is="item.icon" />
                  <span>{{ item.title }}</span>
                </RouterLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>

    <SidebarFooter>
      <p class="text-sidebar-foreground/40 text-xs">v0.1.0</p>
    </SidebarFooter>
  </Sidebar>
</template>
