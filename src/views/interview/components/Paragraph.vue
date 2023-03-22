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
import { ref, onMounted } from "vue";
import EditableLabel from "/src/components/EditableLabel.vue";
import Highlighter from "web-highlighter"; //Highlight https://github.com/alienzhou/web-highlighter
import { store } from "/src/store.js";
import "./highlight.css";
import axios from "axios";

const props = defineProps(["paragraph", "isEditMode"]);
const emit = defineEmits([
    "textSelect",
    "textChange",
    "clickAnnotation",
    "addAnnotation",
]);
const focusText = ref(false);
const focusTime = ref(false);
const containerRef = ref(null);
const elementHeight = ref(null);
const textRef = ref(null);
const highlightColor = ref("blue");
defineExpose({ props, elementHeight });

function textSelect() {
    if (!props.isEditMode) {
        emit("textSelect", highlighter);
    }
}
function textChange(e) {
    let newParaText = e.target.innerText;
    let updatePara = { id: props.paragraph.id, text: e.target.innerText };
    console.log(updatePara);
    let updateAnnos = [];
    console.log(e.target.children[0]);
    console.log(highlighter.getIdByDom(e.target.children[0]));
    //calculate new startMeta and endMeta
    emit("textChange", updatePara, updateAnnos);
}

onMounted(async () => {
    initHighlighter();
    observeHeight();
});

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
        highlightColor.value = `rgb(var(--${anno.codes[0].color}))`;
        highlighter.addClass(
            `highlight-wrap-${anno.codes[0].color}`,
            anno.id.toString()
        );
    });
    //Event Listener
    await highlighter
        .on(Highlighter.event.CREATE, function (data) {
            let newAnno = data.sources[0];
            newAnno.paragraphId = props.paragraph.id;
            if (store.interview.selectedCodes) {
                newAnno.codes = store.interview.selectedCodes;
                console.log(newAnno);
                postAnno(data.sources);
            } else {
                console.log("Please select code first");
            }
        })
        .on(Highlighter.event.CLICK, async function (data) {
            if (!props.isEditMode) {
                let annos = await getAnnos();
                let anno = annos.find((anno) => anno.id == data.id);
                emit("clickAnnotation", anno);
            }
        })
        .on("selection:hover", ({ id }) => {
            if (!props.isEditMode) {
                let anno = annos.find((anno) => anno.id.toString() == id);
                let color = anno.codes[0].color;
                highlighter.addClass(`highlight-wrap-hover-${color}`, id);
            }
        })
        .on("selection:hover-out", ({ id }) => {
            let anno = annos.find((anno) => anno.id.toString() == id);
            let color = anno.codes[0].color;
            highlighter.removeClass(`highlight-wrap-hover-${color}`, id);
        });
}

function postAnno(annotation) {
    axios
        .post("http://localhost:5000/annotation", annotation)
        .then(async (response) => {
            console.log(response.data);
            //Refresh Highlighter
            highlighter = null;
            await initHighlighter();
            //Refresh CodeInSider
            await emit("addAnnotation");
        })
        .catch((error) => {
            console.error(error);
        });
}

async function getAnnos() {
    let url = "http://localhost:5000/annotation/" + props.paragraph.id;
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
}
.header .time {
    color: var(--color-text-3);
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
