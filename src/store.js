import { reactive } from "vue";

export const store = reactive({
    interview: {
        selectedCodes: [],
        selectedText: [],
        hoveringAnnotationId: null,
        editingAnnotationId: null,
    },
    url: {
        database: "http://localhost:5000/",
        // keywordExtraction: "https://maoshuochen-keybert.hf.space/api/predict",
        keywordExtraction: "http://localhost:5000/nlp/keyword",
        classification:
            "https://api-inference.huggingface.co/models/MoritzLaurer/ernie-m-base-mnli-xnli",
    },
});
