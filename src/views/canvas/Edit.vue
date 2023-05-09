<template>
    <a-layout>
        <a-layout-content>
            <div class="dndflow" @drop="onDrop">
                <VueFlow @dragover="onDragOver">
                    <template #node-custom="props">
                        <AnnoNode v-bind="props" />
                    </template>
                    <Background />
                </VueFlow>
            </div>
        </a-layout-content>
        <a-layout-sider :resize-directions="['left']" style="width: 400px">
            <Sidebar />
        </a-layout-sider>
    </a-layout>
</template>

<script setup>
import { VueFlow, useVueFlow } from "@vue-flow/core";
import { Background } from "@vue-flow/background";
import "@vue-flow/core/dist/theme-default.css";
import "@vue-flow/core/dist/style.css";
import { nextTick, watch } from "vue";
import Sidebar from "./Sidebar.vue";
import AnnoNode from "./nodes/AnnoNode.vue";

let id = 0;
function getId() {
    return `dndnode_${id++}`;
}

const { findNode, onConnect, addEdges, addNodes, project, vueFlowRef } =
    useVueFlow({
        nodes: [
            {
                id: "1",
                type: "input",
                label: "input node",
                position: { x: 250, y: 25 },
            },
        ],
    });
//Drag&Drop
function onDragOver(event) {
    event.preventDefault();
    if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "move";
    }
}
onConnect((params) => addEdges([params]));
function onDrop(event) {
    const data = JSON.parse(event.dataTransfer?.getData("application/vueflow"));
    // const data = {
    //     text: "111",
    // };
    const { left, top } = vueFlowRef.value.getBoundingClientRect();
    const position = project({
        x: event.clientX - left,
        y: event.clientY - top,
    });
    const newNode = {
        id: getId(),
        type: "custom",
        position,
        data: data,
    };
    addNodes([newNode]);
    // align node position after drop, so it's centered to the mouse
    nextTick(() => {
        const node = findNode(newNode.id);
        const stop = watch(
            () => node.dimensions,
            (dimensions) => {
                if (dimensions.width > 0 && dimensions.height > 0) {
                    node.position = {
                        x: node.position.x - node.dimensions.width / 2,
                        y: node.position.y - node.dimensions.height / 2,
                    };
                    stop();
                }
            },
            { deep: true, flush: "post" }
        );
    });
}
</script>

<style scoped>
.vue-flow__minimap {
    transform: scale(75%);
    transform-origin: bottom right;
}
.vue-flow {
    width: 100%;
}
.dndflow {
    width: 100%;
    height: 100%;
    background-color: #fff;
}
</style>
