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
import { useRouter } from "vue-router";
import { reactive, toRaw } from "vue";

const router = useRouter();
const columns = [
    { title: "Name", dataIndex: "name", slotName: "name" },
    { title: "Owner", dataIndex: "owner" },
    { title: "Last Open", dataIndex: "times" },
];
const data = reactive([
    {
        key: "1",
        name: "Outline01",
        owner: "maoshuochen",
        times: "10:55",
    },
]);
function Router(record) {
    console.log(toRaw(record));
    router.push({ path: `/outline/${toRaw(record).key}` });
}
</script>

<style>
.table-row {
    cursor: pointer;
}
</style>
