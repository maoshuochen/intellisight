<template>
    <a-space class="sider-container" direction="vertical" size="large">
        <div class="description">You can drag these nodes to the pane.</div>
        <a-space class="nodes" direction="vertical" size="small">
            <div
                class="vue-flow__node-input"
                :draggable="true"
                @dragstart="onDragStart($event, 'input')"
            >
                Input Node
            </div>

            <div
                class="vue-flow__node-default"
                :draggable="true"
                @dragstart="onDragStart($event, 'default')"
            >
                Default Node
            </div>

            <div
                class="vue-flow__node-output"
                :draggable="true"
                @dragstart="onDragStart($event, 'output')"
            >
                Output Node
            </div>
            <AnnoNode
                v-for="anno in annos"
                :data="anno"
                :draggable="true"
                @dragstart="onDragStart($event, anno)"
            />
        </a-space>
    </a-space>
</template>

<script setup>
import AnnoNode from "./nodes/AnnoNode.vue";
import { ref } from "vue";
import axios from "axios";

const annos = ref([]);
function onDragStart(event, data) {
    if (event.dataTransfer) {
        event.dataTransfer.setData("application/vueflow", JSON.stringify(data));
        event.dataTransfer.effectAllowed = "move";
    }
}
axios.get("http://localhost:5000/annotation").then((response) => {
    annos.value = response.data;
});
</script>

<style scoped>
.sider-container {
    margin: 12px;
    height: 1000px;
}
</style>
