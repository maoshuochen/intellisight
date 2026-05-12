<template>
    <a-space class="sider-container" direction="vertical" size="large">
        <a-space class="nodes" direction="vertical" size="small">
            <AnnoNode
                v-for="anno in annos"
                :data="anno"
                :in-graph="false"
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
    height: 82vh;
}
</style>
