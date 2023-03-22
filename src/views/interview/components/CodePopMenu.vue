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
        <a-skeleton :animation="true" v-if="isLoadingClassification">
            <a-space
                direction="vertical"
                :style="{ width: '100%' }"
                size="small"
            >
                <a-skeleton-line line-height="15" :rows="2" />
            </a-space>
        </a-skeleton>
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
        <div class="operations">
            <a-button type="primary" @click="confirm">确定</a-button>
            <a-button @click="cancel">取消</a-button>
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
const text = ref("");
const predictCodes = ref([]);
const selectedCodes = ref([]);
const isLoadingClassification = ref(true);

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
    if (props.anno) {
        selectedCodes.value = props.anno.codes;
    }
    axios.get("http://localhost:5000/code").then((response) => {
        codes.value = response.data;
        //request classfication
        let requestCodes = [];
        codes.value.forEach((code) => {
            let requestCode = code.name;
            requestCodes.push(requestCode);
        });
        let request = {
            input: text.value,
            codes: requestCodes,
        };
        axios
            // .post("http://localhost:5000/predict/classify", request)
            .post("http://localhost:5000/nlp/classification", request)
            .then((response) => {
                response.data.forEach((label) => {
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
            });
    });
});

//operations
function cancel() {
    window.getSelection().empty();
    emit("closeCodePopMenu");
}
function confirm() {
    store.interview.selectedCodes = selectedCodes.value;
    emit("addAnnotation");
    emit("closeCodePopMenu");
    window.getSelection().empty();
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
</style>
