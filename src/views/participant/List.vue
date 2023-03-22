<template>
    <a-table :columns="columns" :data="data"> </a-table>
</template>

<script>
export default {
    name: "ParticipantsList",
    data() {
        const columns = [
            { title: "Name", dataIndex: "name", slotName: "name" },
            { title: "Owner", dataIndex: "owner" },
            { title: "Interview Times", dataIndex: "times" },
        ];
        const data = [
            {
                key: "1",
                name: "Mike",
                owner: "maoshuochen",
                times: "1",
            },
            {
                key: "2",
                name: "John",
                owner: "maoshuochen",
                times: "1",
            },
        ];
        return { columns, data };
    },
};
</script>
