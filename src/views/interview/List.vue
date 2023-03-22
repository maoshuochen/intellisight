<template>
    <a-skeleton :animation="true" v-if="isLoading">
        <a-space direction="vertical" :style="{ width: '100%' }" size="large">
            <a-skeleton-line :rows="3" />
        </a-space>
    </a-skeleton>
    <a-table
        :columns="columns"
        :data="data"
        @row-click="Router"
        row-class="table-row"
        v-else
    >
    </a-table>
</template>

<script setup>
import axios from "axios";
import { onMounted, reactive, ref, toRaw } from "vue";
import { useRouter } from "vue-router";
const router = useRouter();

const columns = [
    { title: "Name", dataIndex: "name" },
    { title: "Sample", dataIndex: "sample" },
    { title: "Owner", dataIndex: "owner" },
    { title: "Keyword", dataIndex: "keyword" },
    { title: "Created Time", dataIndex: "created_time" },
    { title: "Time Length", dataIndex: "length" },
];
const data = ref([]);
const isLoading = ref(true);

function Router(record) {
    console.log(toRaw(record));
    router.push({ path: `/interview/${toRaw(record).key}` });
}
function getDatabase() {
    axios.get("http://localhost:5000/interview").then((response) => {
        let addKey = response.data;
        addKey.forEach((el, index) => (el.key = index));
        data.value = addKey;
        isLoading.value = false;
    });
}

onMounted(() => getDatabase());
</script>

<style>
.table-row {
    cursor: pointer;
}
</style>
