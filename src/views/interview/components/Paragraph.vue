<template>
    <div class="paragraphContainer" ref="containerRef">
        <div class="header">
            <EditableLabel :text="paragraph.speaker" />
            <span class="time">{{ paragraph.startTime }}</span>
        </div>
        <p
            class="text"
            ref="textRef"
            :contenteditable="isEditMode"
            @mouseup="textSelect"
            @input="textChange"
        >
            {{ paragraph.text }}
        </p>
    </div>
</template>

<script setup>
import { ref, onMounted, watch } from "vue";
import EditableLabel from "/src/components/EditableLabel.vue";
import Highlighter from "web-highlighter"; //https://github.com/alienzhou/web-highlighter
import { store } from "/src/store.js";
import "./highlight.css";
import axios from "axios";

const props = defineProps(["paragraph", "isEditMode"]);
const emit = defineEmits([
    "textSelect",
    "textChange",
    "clickAnnotation",
    "refreshAnnotationData",
]);
const focusText = ref(false);
const focusTime = ref(false);
const containerRef = ref(null);
const elementHeight = ref(null);
const textRef = ref(null);

defineExpose({ props, elementHeight });

onMounted(async () => {
    initHighlighter();
    observeHeight();
});

let highlighter;
async function initHighlighter() {
    //init higlighter
    highlighter = new Highlighter({
        $root: textRef.value,
        exceptSelectors: ["h1", ".time", ".input"],
    });
    highlighter.setOption({ style: { className: "highlight-wrap" } });
    //render annos
    let annos = await getAnnos();
    await annos.forEach((anno) => {
        highlighter.fromStore(
            anno.startMeta,
            anno.endMeta,
            anno.text,
            anno.id.toString()
        );
        highlighter.addClass(
            `highlight-${anno.codes[0].codeGroup.color}`,
            anno.id.toString()
        );
    });
    //Event Listener
    await highlighter
        .on(Highlighter.event.CREATE, function (data) {
            let newAnnotation = data.sources[0];
            if (store.interview.selectedCodes) {
                newAnnotation.paragraph = props.paragraph;
                let codes = store.interview.selectedCodes;
                for (let code of codes) {
                    delete code.annotations;
                    delete code.bordered;
                }
                newAnnotation.codes = codes;
                delete newAnnotation.__isHighlightSource;
                delete newAnnotation.id;
                postAnno(newAnnotation);
            } else {
                console.error("Please select code first");
            }
        })
        .on(Highlighter.event.CLICK, async function (data) {
            if (!props.isEditMode) {
                let annos = await getAnnos();
                let anno = annos.find((anno) => anno.id == data.id);
                emit("clickAnnotation", anno);
            }
        });
}

function observeHeight() {
    const resizeObserver = new ResizeObserver(function () {
        let oldVal = elementHeight.value;
        let newVal = containerRef.value.offsetHeight;
        if (newVal != oldVal) {
            elementHeight.value = newVal;
        }
    });
    resizeObserver.observe(containerRef.value);
}

watch(
    () => store.interview.hoveringAnnotationId,
    (newVal, oldVal) => {
        if (newVal && !oldVal) {
            //mouse enter
            highlighter.addClass("highlight-wrap-hover", newVal.toString());
        }
        if (!newVal && oldVal) {
            //mouse out
            highlighter.removeClass("highlight-wrap-hover", oldVal.toString());
        }
    }
);

watch(
    () => store.interview.editingAnnotationId,
    async (newVal, oldVal) => {
        if (!newVal && oldVal) {
            //complete editing
            let annos = await getAnnos();
            for (let anno of annos) {
                if (anno.id == oldVal) {
                    highlighter = null;
                    initHighlighter();
                    emit("refreshAnnotationData");
                }
            }
        }
    }
);

function textSelect() {
    if (!props.isEditMode) {
        emit("textSelect", highlighter);
    }
}
function textChange(e) {
    let updatePara = { id: props.paragraph.id, text: e.target.innerText };
    console.log(updatePara);
    let updateAnnos = [];
    console.log(e.target.children[0]);
    console.log(highlighter.getIdByDom(e.target.children[0]));
    //calculate new startMeta and endMeta
    emit("textChange", updatePara, updateAnnos);
}

function postAnno(annotation) {
    axios
        .post("http://localhost:5000/annotation", annotation)
        .then(async (response) => {
            highlighter = null;
            await initHighlighter();
            await emit("refreshAnnotationData");
        })
        .catch((error) => {
            console.error(error);
        });
}

async function getAnnos() {
    let url =
        "http://localhost:5000/annotation?paragraph-id=" + props.paragraph.id;
    let response = await axios.get(url);
    let annos = response.data;
    return annos;
}
</script>

<style scoped>
.paragraphContainer {
    padding: 16px 4px 4px 4px;
}
.header {
    display: flex;
    align-items: center;
    gap: 10px;
    user-select: none;
}
.header .time {
    color: var(--color-text-3);
    user-select: none;
}
.text {
    margin: 5px 1px;
}
[contenteditable]:focus {
    padding: 6px 12px;
    outline: 1px solid var(--color-border-3);
    border-radius: 2px;
    transition: 0.1s;
}
</style>
