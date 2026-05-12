<template>
    <div @mouseenter="isHovering = true" @mouseleave="isHovering = false">
        <a-card class="container" ref="container">
            <a-space direction="vertical">
                {{ data.text }}
                <div class="card-tags-container" wrap>
                    <a-tag
                        v-for="code in data.codes"
                        :color="code.codeGroup.color"
                    >
                        {{ code.name }}
                    </a-tag>
                </div>
            </a-space>
        </a-card>
        <Handle v-if="inGraph && isHovering" :position="Position.Top" />
        <Handle v-if="inGraph && isHovering" :position="Position.Left" />
        <Handle v-if="inGraph && isHovering" :position="Position.Bottom" />
        <Handle v-if="inGraph && isHovering" :position="Position.Right" />
    </div>
</template>

<script setup>
import { Handle, Position } from "@vue-flow/core";
import { ref } from "vue";
const props = defineProps(["data", "inGraph"]);
const isHovering = ref(false);
</script>

<style scoped>
.dndflow .container {
    width: 240px;
}
.container {
    border-radius: 4px;
}
.card-tags-container {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}
</style>
