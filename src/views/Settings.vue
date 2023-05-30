<template>
    <a-layout>
        <a-page-header
            style="background-color: #fff; height: 64px"
            :title="route.name"
            :show-back="false"
        >
            <template #breadcrumb>
                <a-breadcrumb-item>My project</a-breadcrumb-item>
                <a-breadcrumb-item>{{ route.name }}</a-breadcrumb-item>
            </template>
            <template #extra>
                <a-button type="primary">Export Settings</a-button>
            </template>
        </a-page-header>
        <a-layout-content style="padding: 20px">
            <div class="form-container">
                <a-form class="form" :model="formData" @submit="saveData">
                    <a-form-item field="url.database" label="Database URL">
                        <a-input v-model="formData.url.database"></a-input>
                    </a-form-item>
                    <a-form-item
                        field="url.keywordExtraction"
                        label="Keyword Extraction URL"
                    >
                        <a-input
                            v-model="formData.url.keywordExtraction"
                        ></a-input>
                    </a-form-item>
                    <a-form-item
                        field="url.classification"
                        label="Classification URL"
                    >
                        <a-input
                            v-model="formData.url.classification"
                        ></a-input>
                    </a-form-item>
                    <a-form-item>
                        <a-button html-type="submit">Submit</a-button>
                    </a-form-item>
                </a-form>
            </div>
        </a-layout-content>
        <a-layout-footer></a-layout-footer>
    </a-layout>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { store } from "/src/store.js";
const route = useRoute();

const formData = ref({
    url: {
        database: "",
        keywordExtraction: "",
        classification: "",
    },
});

onMounted(() => {
    formData.value.url = store.url;
});
function saveData() {
    console.log("saved settings");
    store.url = formData.value.url;
}
</script>

<style scoped>
.form-container {
    background-color: white;
    height: 93%;
    padding: 30px 20px 20px 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
}
.form {
    width: 70%;
}
</style>
