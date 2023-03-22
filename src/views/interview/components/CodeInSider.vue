<template>
    <a-space wrap class="container">
        <a-tag
            class="tag"
            v-for="code in annotation.codes"
            :color="code.codeGroup.color"
            @click="showCodePopMenu"
            >{{ code.name }}</a-tag
        >
    </a-space>
</template>

<script setup>
const props = defineProps(["annotation"]);
const emit = defineEmits(["clickAnnotation"]);
function showCodePopMenu() {
    emit("clickAnnotation", props.annotation);
}
</script>

<style scoped>
.tag {
    cursor: pointer;
}
</style>
