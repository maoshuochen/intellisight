<template>
    <a-button
        class="label"
        :class="{ active: hover }"
        type="text"
        @mouseover="hover = true"
        @mouseleave="hover = false"
    >
        {{ text }} <icon-edit v-if="hover" />
    </a-button>
</template>

<script setup>
import { ref } from "vue";
const hover = ref(false);
defineProps({ text: String });
</script>

<style scoped>
.label {
    border-radius: 4px;
    height: auto;
    padding: 0px;
    color: var(--color-text-2);
    gap: 10px;
}
.label.active {
    padding: 0px 6px;
}
</style>
