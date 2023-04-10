import { reactive } from "vue";

export const store = reactive({
    interview: {
        selectedCodes: [],
        selectedText: [],
        hoveringAnnotationId: null,
        editingAnnotationId: null,
    },
});
