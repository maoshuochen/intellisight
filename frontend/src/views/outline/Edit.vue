<template>
    <a-layout>
        <a-layout-content class="content">
            <draggable
                v-model="outlineData"
                group="questions"
                handle=".handle"
                @start="isDragging = true"
                @end="handleDragEnd"
            >
                <template #item="{ element, index }">
                    <div class="outline-element" item-key="element.id">
                        <a-space>
                            <icon-drag-dot-vertical class="handle" />
                            <h3 class="outline-element-title">
                                Q{{ index + 1 }}
                            </h3>
                        </a-space>
                        <a-typography style="margin-left: 4px">{{
                            element.content
                        }}</a-typography>
                    </div>
                </template>
            </draggable>
        </a-layout-content>
        <a-layout-sider :resize-directions="['left']" style="width: 300px">
            <a-space direction="vertical" class="sider-container">
                <a-input-search placeholder="Search"></a-input-search>
                <a-space>
                    <a-tag>Product</a-tag>
                    <a-tag>Experience</a-tag>
                    <icon-plus />
                </a-space>
                <draggable
                    class="library-list"
                    v-model="libraryData"
                    :group="{ name: 'questions', pull: 'clone', put: false }"
                    @start="isDragging = true"
                    @end="handleDragEnd"
                >
                    <template #item="{ element }">
                        <div class="library-element" item-key="element.id">
                            <a-typography>{{ element.content }}</a-typography>
                            <a-divider :margin="8" />
                        </div>
                    </template>
                </draggable>
            </a-space>
        </a-layout-sider>
    </a-layout>
</template>

<script setup>
import draggable from "vuedraggable";
import { ref, reactive } from "vue";

const outlineData = ref([
    {
        id: 1,
        content: "What would you expect to see from the [PRODUCT]?",
    },
    {
        id: 2,
        content:
            "Based on what you saw, what do you think this [PRODUCT] offers?",
    },
    {
        id: 3,
        content:
            "Please share any challenges you've faced while trying to use [FEATURE].",
    },
]);
//https://mazedesign.notion.site/461e7de3f3ed4e25835d88f701fbf7c0?v=8e36ee3a7b224dcabf42ddf5484ed90a
const libraryData = ref([
    {
        id: 1,
        content: "What do you like most about [PRODUCT]?",
    },
    {
        id: 2,
        content:
            "What are you currently doing to make this [PROBLEM] / [TASK] easier?",
    },
    {
        id: 3,
        content:
            "Do you have any other thoughts or feedback on the new [FEATURE]?",
    },
    {
        id: 4,
        content:
            "How does this [PROBLEM] / [TASK] impact other areas of your life or work?",
    },
    {
        id: 5,
        content:
            "How, if at all, do you expect [PRODUCT] to help you accomplish your business goals?",
    },
    {
        id: 6,
        content:
            "How does this [PROBLEM] / [TASK] impact other areas of your life or work?",
    },
    {
        id: 7,
        content:
            "Is there anything else about [PRODUCT] or this survey that you would like to share?",
    },
    {
        id: 8,
        content: "What is the hardest part about [PROBLEM] / [TASK]?",
    },
    {
        id: 9,
        content: "What is the biggest pain point related to [PROBLEM]?",
    },
]);

const isDragging = ref(false);
function handleDragEnd() {
    isDragging.value = false;
    //save data
    console.log(outlineData.value);
}
</script>

<style scoped>
/* Layout */
.content {
    border-radius: 4px;
    height: 82vh;
    background-color: white;
}
.sider-container {
    padding: 24px;
    gap: 4px;
    box-sizing: border-box;
    width: 100%;
}
/* Content */
.question-list {
    padding: 24px;
}
.outline-element {
    display: flex;
    flex-direction: column;
    padding: 10px 16px;
    background-color: #fff;
}
.outline-element .handle {
    cursor: move;
}
.outline-element-title {
    color: var(--color-text-2);
}
/* Sider */
.sider-container {
    height: 82vh;
}
.library-element {
    display: flex;
    flex-direction: column;
    padding: 8px 2px 0;
    cursor: move;
}
</style>
