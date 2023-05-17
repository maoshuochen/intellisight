<template>
    <!-- You can use the `BaseEdge` component to create your own custom edge more easily -->
    <BaseEdge :id="id" :style="style" :path="path[0]" :marker-end="markerEnd" />
    <!-- Use the `EdgeLabelRenderer` to escape the SVG world of edges and render your own custom label in a `<div>` ctx -->
    <EdgeLabelRenderer>
        <div
            :style="{
                pointerEvents: 'all',
                position: 'absolute',
                transform: `translate(-50%, -50%) translate(${path[1]}px,${path[2]}px)`,
            }"
            class="nodrag nopan"
        >
            <a-input
                class="edge-label-input"
                v-show="data.labelEditing"
                v-model="data.labelText"
                placeholder="Enter something"
                @blur="data.labelEditing = false"
            />
            <p
                class="edge-label-text"
                v-show="!data.labelEditing && data.labelText"
                @dblclick="data.labelEditing = true"
            >
                {{ data.labelText }}
            </p>
        </div>
    </EdgeLabelRenderer>
</template>

<script setup>
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath } from "@vue-flow/core";
import { computed } from "vue";

const props = defineProps({
    id: {
        type: String,
        required: true,
    },
    sourceX: {
        type: Number,
        required: true,
    },
    sourceY: {
        type: Number,
        required: true,
    },
    targetX: {
        type: Number,
        required: true,
    },
    targetY: {
        type: Number,
        required: true,
    },
    sourcePosition: {
        type: String,
        required: true,
    },
    targetPosition: {
        type: String,
        required: true,
    },
    data: {
        type: Object,
        required: false,
    },
    markerEnd: {
        type: String,
        required: false,
    },
    style: {
        type: Object,
        required: false,
    },
    //custom
    data: {},
});

props.data.labelEditing = false;
props.data.labelText = "";

const path = computed(() => getSmoothStepPath(props));
</script>

<script>
export default {
    inheritAttrs: false,
};
</script>

<style scoped>
.edge-label-text {
    background-color: #fff;
    padding: 2px;
    cursor: pointer;
}
.edge-label-input {
    z-index: 999;
}
</style>
