<template>
    <a-space wrap class="container">
        <a-tag
            class="tag"
            v-for="code in annotation.codes"
            :color="code.codeGroup.color"
            :bordered="isHovering"
            @click="clickAnnotation"
            @mouseenter="mouseEnterAnnotation"
            @mouseleave="mouseLeaveAnnotation"
            >{{ code.name }}
        </a-tag>
    </a-space>
</template>

<script setup>
import { ref, watch } from "vue";
import { store } from "/src/store.js";

const props = defineProps(["annotation"]);
const emit = defineEmits(["clickAnnotation"]);
const isHovering = ref(false);
function clickAnnotation() {
    emit("clickAnnotation", props.annotation);
}
function mouseEnterAnnotation() {
    store.interview.hoveringAnnotationId = props.annotation.id;
}
function mouseLeaveAnnotation() {
    store.interview.hoveringAnnotationId = null;
}
watch(
    () => store.interview.hoveringAnnotationId,
    (newVal, oldVal) => {
        if (!oldVal && newVal == props.annotation.id) {
            isHovering.value = true;
        }
        if (!newVal && oldVal == props.annotation.id) {
            isHovering.value = false;
        }
    }
);
</script>

<style scoped>
.tag {
    cursor: pointer;
}
</style>
