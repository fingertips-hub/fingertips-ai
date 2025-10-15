<template>
  <button
    type="button"
    role="switch"
    :aria-checked="props.modelValue"
    :class="[
      'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
      props.modelValue ? 'bg-blue-600' : 'bg-gray-200',
      props.disabled ? 'cursor-not-allowed opacity-50' : ''
    ]"
    :disabled="props.disabled"
    @click="toggle"
  >
    <span
      :class="[
        'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
        props.modelValue ? 'translate-x-5' : 'translate-x-0'
      ]"
    />
  </button>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

function toggle(): void {
  emit('update:modelValue', !props.modelValue)
}
</script>
