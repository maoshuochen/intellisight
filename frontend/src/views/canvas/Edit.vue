<template>
    <a-layout>
        <a-layout-content>
            <div class="dndflow" @drop="onDrop">
                <VueFlow
                    @dragover="onDragOver"
                    @edge-update="onEdgeUpdate"
                    :connection-line-options="{ type: 'smoothstep' }"
                >
                    <Controls />
                    <template #node-custom="props">
                        <AnnoNode v-bind="props" :in-graph="true" />
                    </template>
                    <template #edge-custom="props">
                        <CustomEdge v-bind="props" />
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
import { Controls } from "@vue-flow/controls";
import { Background } from "@vue-flow/background";
import "@vue-flow/core/dist/theme-default.css";
import "@vue-flow/core/dist/style.css";
import "@vue-flow/controls/dist/style.css";
import { Message } from "@arco-design/web-vue";
import { nextTick, watch, onMounted, onBeforeUnmount } from "vue";
import Sidebar from "./Sidebar.vue";
import AnnoNode from "./nodes/AnnoNode.vue";
import CustomEdge from "./CustomEdge.vue";

const {
    findNode,
    onConnect,
    addEdges,
    addNodes,
    project,
    updateEdge,
    setNodes,
    setEdges,
    dimensions,
    setTransform,
    toObject,
    vueFlowRef,
} = useVueFlow({
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
    //custom edge
    params.type = "custom";
    params.updatable = true;
    params.events = {
        doubleClick: (e) => {
            e.edge.data.labelEditing = !e.edge.data.labelEditing;
        },
    };
    addEdges([params]);
});
function onEdgeUpdate({ edge, connection }) {
    return updateEdge(edge, connection);
}
function onDrop(event) {
    const data = JSON.parse(event.dataTransfer?.getData("application/vueflow"));
    const { left, top } = vueFlowRef.value.getBoundingClientRect();
    const position = project({
        x: event.clientX - left,
        y: event.clientY - top,
    });
    function getId() {
        return self.crypto.randomUUID();
    }
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
//Save & Restore
const flowKey = "example-flow";
onMounted(() => {
    onRestore();
    document.addEventListener("keydown", onSave);
});
onBeforeUnmount(() => {
    document.removeEventListener("keydown", onSave);
});
function onSave(e) {
    if (!(e.keyCode === 83 && e.ctrlKey)) {
        return;
    }
    e.preventDefault();
    localStorage.setItem(flowKey, JSON.stringify(toObject()));
    Message.success({
        content: "保存成功",
        position: "bottom",
    });
}
function onRestore() {
    const flow = JSON.parse(localStorage.getItem(flowKey));
    console.log(flow);
    if (flow) {
        const [x = 0, y = 0] = flow.position;
        setNodes(flow.nodes);
        for (const edge of flow.edges) {
            edge.events = {
                doubleClick: (e) => {
                    e.edge.data.labelEditing = !e.edge.data.labelEditing;
                },
            };
        }
        setEdges(flow.edges);
        setTransform({ x, y, zoom: flow.zoom || 0 });
    }
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
