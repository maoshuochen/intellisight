<template>
    <a-card class="container" ref="container">
        <a-space direction="vertical">
            {{ data.text }}
            <a-space wrap>
                <a-tag v-for="code in data.codes" :color="code.codeGroup.color">
                    {{ code.name }}
                </a-tag>
            </a-space>
        </a-space>
    </a-card>
</template>

<script setup>
import { ref } from "vue";
const props = defineProps(["data"]);
</script>

<style scoped>
.dndflow .container {
    width: 240px;
}
</style>
