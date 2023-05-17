<template>
    <!-- You can use the `BaseEdge` component to create your own custom edge more easily -->
    <BaseEdge
        :id="id"
        :style="style"
        :path="path[0]"
        :marker-end="markerEnd"
        @click="console.log('click')"
    />
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
            <!-- <button class="edgebutton" @click="removeEdges([id])">×</button> -->
            <a-input
                v-show="data.labelEditing"
                v-model="data.labelText"
                placeholder="Enter something"
                @blur="data.labelEditing = false"
            />
            <p
                class="edge-label-text"
                v-show="!data.labelEditing"
                @dblclick="data.labelEditing = true"
            >
                {{ data.labelText }}
            </p>
        </div>
    </EdgeLabelRenderer>
</template>

<script setup>
import {
    BaseEdge,
    EdgeLabelRenderer,
    getBezierPath,
    useVueFlow,
} from "@vue-flow/core";
import { ref, computed } from "vue";

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
const { removeEdges } = useVueFlow();

const path = computed(() => getBezierPath(props));
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
</style>
