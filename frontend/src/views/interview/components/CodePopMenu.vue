<template>
    <div class="menu" :style="{ top: y + 'px', left: x + 'px' }">
        <p class="subtitle" v-show="selectedCodes.length !== 0">Selected</p>
        <a-space wrap v-show="selectedCodes.length !== 0">
            <a-tag
                v-for="code in selectedCodes"
                :key="code.id"
                :color="code.codeGroup.color"
                closable
                @close="deleteSelectedCode(code)"
            >
                {{ code.name }}
            </a-tag>
        </a-space>

        <p class="subtitle" v-if="predictCodes">Recommendation</p>
        <a-space size="small" v-if="isLoadingClassification">
            <a-spin />
            <a-typography-text type="secondary">
                Loading Rec Codes
            </a-typography-text>
        </a-space>
        <a-space wrap v-if="predictCodes && !isLoadingClassification">
            <a-tag
                v-for="code in predictCodes"
                :key="code.id"
                :color="code.codeGroup.color"
                :bordered="code.bordered"
                @click="addSelectedCode(code)"
            >
                {{ code.name }}
            </a-tag>
        </a-space>
        <a-space size="small" v-if="isLoadingKeyword">
            <a-spin />
            <a-typography-text type="secondary">
                Loading Keywords
            </a-typography-text>
        </a-space>
        <a-space direction="vertical" :size="2">
            <div
                class="keyword-item"
                v-for="(keyword, index) in predictKeywords"
                @mouseenter="isHoveringKeyword[index] = true"
                @mouseleave="isHoveringKeyword[index] = false"
            >
                <a-space size="mini" style="flex: 1">
                    <p style="color: var(--color-neutral-8)">Create</p>
                    <p style="color: var(--color-neutral-10)">{{ keyword }}</p>
                </a-space>
                <icon-right style="color: var(--color-neutral-6)" />
                <div
                    class="keyword-item-dropdown-panel"
                    v-if="isHoveringKeyword[index]"
                >
                    <a-space
                        v-for="codeGroup in codeGroups"
                        @click="addNewCode(keyword, codeGroup)"
                    >
                        <icon-plus style="color: var(--color-neutral-6)" />
                        <p :style="{ color: fontColor(codeGroup.color) }">
                            {{ codeGroup.name }}
                        </p>
                    </a-space>
                </div>
            </div>
        </a-space>
        <div class="operations">
            <a-button type="primary" @click="confirm">确定</a-button>
            <a-button @click="cancel">取消</a-button>
            <a-select
                v-model="store.interview.nlpModel"
                style="width: 110px"
                default-input-value="python"
                size="mini"
                placeholder="Models"
                :bordered="false"
            >
                <a-option value="openai">OpenAI API</a-option>
                <a-option value="huggingface">Huggingface API</a-option>
                <a-option value="python">Python Backend</a-option>
            </a-select>
        </div>
    </div>
</template>

<script setup>
import axios from "axios";
import { store } from "/src/store.js";
import { computed, ref, onMounted } from "vue";

const props = defineProps(["anno"]);
const emit = defineEmits(["closeCodePopMenu", "addAnnotation"]);
const codes = ref([]);
const codeGroups = ref([]);
const text = ref("");
const selectedCodes = ref([]);

function fontColor(color) {
    return `rgb(var(--${color}-7))`;
}

//Render

text.value = window.getSelection().toString();
const x = computed(
    () => window.getSelection().getRangeAt(0).getBoundingClientRect().x
);
const y = computed(
    () => 25 + window.getSelection().getRangeAt(0).getBoundingClientRect().y
);
if (props.anno) {
    text.value = props.anno.text;
}

onMounted(() => {
    init();
});

function init() {
    if (props.anno) {
        selectedCodes.value = props.anno.codes;
        store.interview.editingAnnotationId = props.anno.id;
    }
    axios.get("http://localhost:5000/code-group").then((response) => {
        codeGroups.value = response.data;
        isHoveringKeyword.length = Array(codeGroups.value.length).fill(false);
    });
    axios.get("http://localhost:5000/code").then((response) => {
        codes.value = response.data;
        getPredictCodes();
        getPredictKeywords();
    });
}

//----------NLP-----------
const predictCodes = ref([]);
const predictKeywords = ref([]);
const isLoadingClassification = ref(true);
const isLoadingKeyword = ref(true);
const isHoveringKeyword = ref([]);

let keywordExtraction, classification;
import(`/src/nlp/${store.interview.nlpModel}Api.js` /* @vite-ignore */).then(
    (module) => {
        keywordExtraction = module.keywordExtraction;
        classification = module.classification;
    }
);
async function getPredictCodes() {
    let requestCodes = [];
    codes.value.forEach((code) => {
        let requestCode = code.name;
        requestCodes.push(requestCode);
    });
    const result = await classification(text.value, requestCodes);
    console.log(result);
    result.forEach((label) => {
        let found = codes.value.find((code) => code.name == label);
        if (selectedCodes.value) {
            let index = selectedCodes.value.findIndex(
                (item) => item.id == found.id
            );
            if (index == -1) {
                found.bordered = false;
            } else {
                found.bordered = true;
            }
        } else {
            found.bordered = false;
        }
        predictCodes.value.push(found);
        isLoadingClassification.value = false;
    });
}
async function getPredictKeywords() {
    const keywords = await keywordExtraction(text.value);
    predictKeywords.value = keywords;
    isLoadingKeyword.value = false;
}

//operations
function cancel() {
    window.getSelection().empty();
    emit("closeCodePopMenu");
}
function confirm() {
    store.interview.selectedCodes = selectedCodes.value;
    if (props.anno) {
        //update Annotation
        let anno = props.anno;
        let codes = selectedCodes.value;
        for (let code of codes) {
            delete code.annotations;
            delete code.bordered;
        }
        anno.codes = codes;
        putAnno(anno);
    } else {
        //add Annotation
        emit("addAnnotation");
    }
    emit("closeCodePopMenu");
    window.getSelection().empty();
    store.interview.editingAnnotationId = null;
}
function deleteSelectedCode(code) {
    let index = selectedCodes.value.findIndex((item) => item.id == code.id);
    selectedCodes.value.splice(index, 1);
    predictCodes.value.find((item) => item.id == code.id).bordered = false;
}
function addSelectedCode(code) {
    let index = selectedCodes.value.findIndex((item) => item.id == code.id);
    if (index == -1) {
        selectedCodes.value.push(code);
        predictCodes.value.find((item) => item.id == code.id).bordered = true;
    } else {
        selectedCodes.value.splice(index, 1);
        predictCodes.value.find((item) => item.id == code.id).bordered = false;
    }
}
function addNewCode(codeName, codeGroup) {
    let newCode = {
        name: codeName,
        codeGroup: codeGroup,
        owner: "maoshuochen",
    };
    axios.post("http://localhost:5000/code", newCode).then((response) => {
        codes.value = response.data;
        let responseNewCode = response.data.find(
            (item) => item.name == codeName
        );
        selectedCodes.value.push(responseNewCode);
        predictCodes.value = [];
        getPredictCodes();
    });
}
function putAnno(new_annotation, old_annotation_id) {
    axios
        .put(
            `http://localhost:5000/annotation/${old_annotation_id}`,
            new_annotation
        )
        .then(async (response) => {
            // await emit("postAnnotationDone");
        })
        .catch((error) => {
            console.error(error);
        });
}
</script>

<style scoped>
p {
    margin: 0;
}
.menu {
    width: 240px;
    position: fixed;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    background-color: white;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
    border: 1px solid var(--color-neutral-2);
    border-radius: 4px;
    user-select: none;
    z-index: 999;
}
.operations {
    display: flex;
    gap: 10px;
    user-select: none;
}
.subtitle {
    font-size: 12px;
    color: var(--color-neutral-6);
    user-select: none;
}
.arco-tag {
    cursor: pointer;
    user-select: none;
}
.keyword-item {
    position: relative;
    display: flex;
    align-items: center;
    padding: 4px 4px;
    border-radius: 2px;
    cursor: pointer;
}
.keyword-item:hover {
    background-color: var(--color-neutral-1);
}
.keyword-item p {
    font-size: 13px;
}
.keyword-item-dropdown-panel {
    position: absolute;
    display: flex;
    flex-direction: column;
    width: 160px;
    padding: 4px 4px;
    top: -6px;
    left: 100%;
    background-color: white;
    box-shadow: 0 0 4px rgba(0, 0, 0, 0.04);
    border: 1px solid var(--color-neutral-2);
    border-radius: 2px;
}
.keyword-item-dropdown-panel .arco-space {
    padding: 4px 6px;
}

.keyword-item-dropdown-panel .arco-space:hover {
    background-color: var(--color-neutral-1);
}
</style>
