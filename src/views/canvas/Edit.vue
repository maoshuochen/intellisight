<template>
    <a-layout>
        <a-layout-content>
            <div class="dndflow" @drop="onDrop">
                <VueFlow @dragover="onDragOver">
                    <template #node-custom="props">
                        <AnnoNode v-bind="props" :in-graph="true" />
                    </template>
                    <Controls />
                    <Background />
                    <template #edge-custom="props">
                        <CustomEdge v-bind="props" />
                    </template>
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
import { Controls } from "@vue-flow/controls";
import { Background } from "@vue-flow/background";
import "@vue-flow/core/dist/theme-default.css";
import "@vue-flow/core/dist/style.css";
import "@vue-flow/controls/dist/style.css";
import { nextTick, watch } from "vue";
import Sidebar from "./Sidebar.vue";
import AnnoNode from "./nodes/AnnoNode.vue";
import CustomEdge from "./CustomEdge.vue";

let id = 0;
function getId() {
    return `dndnode_${id++}`;
}
//Init Canvas
const { findNode, onConnect, addEdges, addNodes, project, vueFlowRef } =
    useVueFlow({
        nodes: [],
    });
//Drag&Drop
function onDragOver(event) {
    event.preventDefault();
    if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "move";
    }
}
onConnect((params) => {
    params.type = "custom"; //set edge type as edge-custom
    params.events = {
        doubleClick: (e) => {
            console.log(e.edge.data);
            e.edge.data.labelEditing = !e.edge.data.labelEditing;
        },
    };
    addEdges([params]);
});
function onDrop(event) {
    const data = JSON.parse(event.dataTransfer?.getData("application/vueflow"));
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

<style>
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
.vue-flow__node.selected {
    border: 1px solid rgb(var(--arcoblue-6));
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}
</style>
