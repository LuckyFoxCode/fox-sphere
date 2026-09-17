<script setup lang="ts">
import { ref } from 'vue';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { LoadingButton } from '@/components/ui/loading-button';
import { useToast } from '@/composables/useToast';

interface Props {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => Promise<unknown> | void;
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Are you sure?',
  description: 'This action cannot be undone.',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
});

const { toastError } = useToast();

const open = ref(false);
const isPending = ref(false);

const handleConfirm = async () => {
  if (isPending.value) return;
  isPending.value = true;
  try {
    await props.onConfirm();
    open.value = false;
  } catch (error) {
    toastError(error);
  } finally {
    isPending.value = false;
  }
};
</script>

<template>
  <AlertDialog v-model:open="open">
    <AlertDialogTrigger as-child>
      <slot />
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{{ title }}</AlertDialogTitle>
        <AlertDialogDescription>{{ description }}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>{{ cancelText }}</AlertDialogCancel>
        <LoadingButton
          variant="destructive"
          :loading="isPending"
          type="button"
          @click="handleConfirm"
        >
          {{ confirmText }}
        </LoadingButton>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>