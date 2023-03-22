<template>
    <a-layout>
        <a-layout-content class="content">
            <a-space direction="vertical" class="content-container">
                <a-space class="operation-bar" wrap>
                    <a-space>
                        <a-select
                            style="width: 200px"
                            placeholder="Speaker"
                        ></a-select>
                        <a-input
                            style="width: 300px"
                            placeholder="Content"
                        ></a-input>
                        <a-button type="primary">Search</a-button>
                    </a-space>
                    <a-space>
                        <a-button v-if="!isEditMode" @click="startEdit">
                            Edit
                        </a-button>
                        <a-button v-if="isEditMode" @click="saveEdit">
                            Done
                        </a-button>
                        <a-button v-if="isEditMode" @click="cancelEdit">
                            Cancel
                        </a-button>
                    </a-space>
                </a-space>
                <a-list
                    class="block-container"
                    :bordered="false"
                    :split="false"
                    :pagination-props="paginationProps"
                >
                    <a-list-item
                        v-for="paragraph in paragraphs"
                        style="padding: 0"
                    >
                        <template #meta>
                            <a-space align="start">
                                <Paragraph
                                    class="paragraph"
                                    ref="paragraphRefs"
                                    :key="paragraph.id"
                                    :paragraph="paragraph"
                                    :isEditMode="isEditMode"
                                    @text-select="textSelect"
                                    @text-change="saveEdit"
                                    @click-annotation="clickAnnotation"
                                    @add-annotation="updateData"
                                />
                            </a-space>
                        </template>
                    </a-list-item>
                    <CodePopMenu
                        v-if="showCodePopMenu"
                        :anno="currentAnnotation"
                        @closeCodePopMenu="
                            {
                                showCodePopMenu = false;
                            }
                        "
                        @addAnnotation="addAnnotation"
                    ></CodePopMenu>
                </a-list>
            </a-space>
        </a-layout-content>
        <a-layout-sider
            class="sider"
            :resize-directions="['left']"
            ref="siderRef"
            style="width: 400px"
        >
            <div class="code-container">
                <a-list
                    :bordered="false"
                    :split="false"
                    style="padding-top: 76px"
                >
                    <a-list-item
                        class="sider-list-item"
                        v-for="paragraph in paragraphs"
                        :key="paragraph.id"
                        :style="{
                            height: getParaDOMHeight(paragraph.id) + 'px',
                        }"
                    >
                        <div style="height: 30px"></div>
                        <a-space direction="vertical">
                            <CodeInSider
                                v-for="annotation in annotationsInParagraph(
                                    paragraph
                                )"
                                :key="annotation.id"
                                :annotation="annotation"
                                @click-annotation="clickAnnotation"
                            >
                            </CodeInSider>
                        </a-space>
                    </a-list-item>
                </a-list>
            </div>
        </a-layout-sider>
    </a-layout>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import Paragraph from "./components/Paragraph.vue";
import CodePopMenu from "./components/CodePopMenu.vue";
import CodeInSider from "./components/CodeInSider.vue";
import axios from "axios";

const paragraphs = ref([]);
const paragraphRefs = ref(null);
const annotations = ref([]);
const siderRef = ref(null);

onMounted(() => {
    updateData();
});

async function updateData() {
    axios
        .get("http://localhost:5000/paragraph")
        .then((response) => {
            paragraphs.value = response.data;
        })
        .catch((error) => {
            console.error(error);
        });
    axios
        .get("http://localhost:5000/annotation")
        .then((response) => {
            annotations.value = response.data;
        })
        .catch((error) => {
            console.error(error);
        });
}

//Edit Mode
const isEditMode = ref(false);
let previousParagraphs;
let previousAnnotations;
function startEdit() {
    isEditMode.value = true;
    previousParagraphs = paragraphs.value;
    previousAnnotations = annotations.value;
}
function saveEdit() {
    isEditMode.value = false;
    //update paragraphs from p.textcontent
    //update annotations from span&observers
}
function cancelEdit() {
    isEditMode.value = false;
    paragraphs.value = previousParagraphs;
    annotations.value = previousAnnotations;
}

//Selection
const showCodePopMenu = ref(false);
const currentAnnotation = ref(null);
let currentHighlighter;
function textSelect(highlighter) {
    showCodePopMenu.value = window.getSelection().toString() ? true : false;
    currentAnnotation.value = null;
    currentHighlighter = highlighter;
}
function addAnnotation() {
    const selection = window.getSelection();
    if (!selection.isCollapsed) {
        console.log(currentHighlighter);
        currentHighlighter.fromRange(selection.getRangeAt(0));
    }
}
function clickAnnotation(annotation) {
    showCodePopMenu.value = true;
    currentAnnotation.value = annotation;
}
//Sider
function getParaDOMHeight(paragraphId) {
    if (paragraphId && paragraphRefs.value) {
        const ref = paragraphRefs.value.find(
            (ref) => ref.props.paragraph.id == paragraphId
        );
        console.log(ref.elementHeight);
        return ref.elementHeight;
    }
}

function annotationsInParagraph(paragraph) {
    let result = [];
    if (paragraph == null) {
        return result;
    } else {
        annotations.value.forEach((annotation) => {
            if (annotation.paragraph.id == paragraph.id) {
                result.push(annotation);
            }
        });
        let sortedResult = result.sort((a, b) => {
            return a.startMeta.textOffset - b.startMeta.textOffset;
        });
        return sortedResult;
    }
}
</script>

<style scoped>
.content {
    border-radius: 4px;
    height: 82vh;
    background-color: white;
}
.content-container {
    padding: 24px;
    box-sizing: border-box;
    width: 100%;
}
.sider {
    border-radius: 4px;
    box-shadow: none;
}
.operation-bar {
    display: flex;
    justify-content: space-between;
}
.block-container {
    display: flex;
    flex-direction: column;
}
.sider-list-item {
    overflow: auto;
}
</style>
