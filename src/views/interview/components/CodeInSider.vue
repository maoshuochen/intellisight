<template>
    <a-space wrap class="container">
        <a-tag
            class="tag"
            v-for="code in annotation.codes"
            :color="code.codeGroup.color"
            @click="clickAnnotation"
            @mouseenter="mouseEnterAnnotation"
            @mouseleave="mouseLeaveAnnotation"
            >{{ code.name }}</a-tag
        >
    </a-space>
</template>

<script setup>
import { store } from "/src/store.js";

const props = defineProps(["annotation"]);
const emit = defineEmits(["clickAnnotation"]);
function clickAnnotation() {
    emit("clickAnnotation", props.annotation);
}
function mouseEnterAnnotation() {
    store.interview.hoveringAnnotationId = props.annotation.id;
}
function mouseLeaveAnnotation() {
    store.interview.hoveringAnnotationId = null;
}
</script>

<style scoped>
.tag {
    cursor: pointer;
}
</style>
