import { reactive } from "vue";

export const store = reactive({
    interview: {
        selectedCodes: [],
        selectedText: [],
        hoveringAnnotationId: null,
        editingAnnotationId: null,
        nlpModel: "python",
    },
    url: {
        database: "http://localhost:5000/",
        keywordExtraction: "http://localhost:5000/nlp/keyword",
        classification:
            "https://api-inference.huggingface.co/models/MoritzLaurer/ernie-m-base-mnli-xnli",
    },
});
