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
import { Globe } from '@lucide/vue';
import { useRoute } from 'vue-router';
import { navItems } from './navigation';

const route = useRoute();

const isActive = (url: string) => {
  if (url === '/') return route.path === '/';
  return route.path.startsWith(url);
};
</script>
<template>
  <Sidebar collapsible="icon">
    <SidebarHeader class="bg-background">
      <SidebarMenuButton
        as-child
        :tooltip="'Fox Sphere'"
      >
        <RouterLink to="/">
          <component :is="Globe" />
          <span
            class="text-sidebar-foreground text-base font-semibold transition-opacity duration-200 group-data-[collapsible=icon]:opacity-0"
          >
            Fox Sphere Admin
          </span>
        </RouterLink>
      </SidebarMenuButton>
    </SidebarHeader>

    <SidebarSeparator class="m-0" />

    <SidebarContent class="bg-background">
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
                :tooltip="item.title"
              >
                <RouterLink :to="item.url">
                  <component :is="item.icon" />
                  <span
                    class="truncate transition-opacity duration-300 group-data-[collapsible=icon]:opacity-0"
                    >{{ item.title }}
                  </span>
                </RouterLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>

    <SidebarFooter class="bg-background">
      <p class="text-sidebar-foreground/40 text-xs">v0.1.0</p>
    </SidebarFooter>
  </Sidebar>
</template>
