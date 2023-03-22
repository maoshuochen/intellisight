<template>
    <a-space direction="vertical" size="medium" fill>
        <a-radio-group v-model="viewMode" size="small" type="button">
            <a-radio value="Kanban">Kanban</a-radio>
            <a-radio value="Table">Table</a-radio>
        </a-radio-group>
        <a-space v-if="viewMode == 'Kanban'" size="medium" align="start">
            <div class="code-group-container" v-for="group in codes">
                <draggable
                    v-model="group.data"
                    group="code"
                    @start="isDragging = true"
                    @end="isDragging = false"
                    @change="dragChange"
                    item-key="id"
                >
                    <template #header>
                        <div
                            class="code-group-header"
                            :style="{ color: fontColor(group.color) }"
                        >
                            {{ group.name }}
                        </div>
                    </template>
                    <template #item="{ element }">
                        <div class="code-group-element">
                            <a-tag :color="group.color">
                                {{ element.name }}
                            </a-tag>
                            <a-typography-text
                                :style="{ color: fontColor(group.color) }"
                            >
                                {{ element.usage }}
                            </a-typography-text>
                        </div>
                    </template>
                    <template #footer>
                        <div class="code-group-footer">
                            <a-popconfirm
                                trigger="click"
                                @ok="addNewCode(group.id)"
                            >
                                <a-link
                                    type="text"
                                    style="color: var(--color-neutral-6)"
                                >
                                    <template #icon> <icon-plus /> </template>
                                    New Code
                                </a-link>
                                <template #icon>
                                    <a-input
                                        v-model="newCodeName"
                                        placeholder="Code Name"
                                    ></a-input>
                                </template>
                            </a-popconfirm>
                        </div>
                    </template>
                </draggable>
            </div>
        </a-space>
        <a-table
            v-if="viewMode == 'Table'"
            :columns="columns"
            :data="ungroupCodes(codes)"
        >
        </a-table>
    </a-space>
</template>

<script setup>
import { ref, onMounted } from "vue";
import axios from "axios";
import draggable from "vuedraggable"; //https://github.com/SortableJS/vue.draggable.next

const viewMode = ref("Kanban");
const codes = ref([]);
const codeGroups = ref([]);
onMounted(() => {
    getCodeGroup();
    getCodes();
});

//Data formater
function groupCodes(data) {
    let groupedData = data.reduce((groups, item) => {
        const group = groups[item.code_group_id] || [];
        group.push(item);
        groups[item.code_group_id] = group;
        return groups;
    }, {});
    let result = Object.entries(groupedData).map((entry) => {
        let id = entry[0]; //group id
        let data = entry[1]; //codes in group
        let color = codeGroups.value.find((group) => group.id == id).color;
        let name = codeGroups.value.find((group) => group.id == id).name;
        return { id, name, data, color };
    });
    return result;
}
function ungroupCodes(data) {
    let result = [];
    data.forEach((group) => {
        group.data.forEach((code) => {
            code.code_group_id = group.id;
            result.push(code);
        });
    });
    return result;
}
function fontColor(color) {
    return `rgb(var(--${color}-7))`;
}

//Database API
function getCodes() {
    axios
        .get("http://localhost:5000/code")
        .then((response) => {
            codes.value = groupCodes(response.data);
        })
        .catch((error) => {
            console.error(error);
        });
}
function postCode(newCode) {
    axios
        .post("http://localhost:5000/code", newCode)
        .then((response) => {
            codes.value = groupCodes(response.data);
        })
        .catch((error) => {
            console.error(error);
        });
}
function putCode(updateCode) {
    axios
        .put("http://localhost:5000/code", updateCode)
        .then((response) => {
            codes.value = groupCodes(response.data);
        })
        .catch((error) => {
            console.error(error);
        });
}
function getCodeGroup() {
    axios
        .get("http://localhost:5000/code-group")
        .then((response) => {
            codeGroups.value = response.data;
        })
        .catch((error) => {
            console.error(error);
        });
}

//Add new code
const newCodeName = ref("");
function addNewCode(groupId) {
    const newCode = {
        name: newCodeName.value,
        owner: "maoshuochen",
        code_group_id: groupId,
    };
    console.log(newCode);
    let ungroupedCodes = ungroupCodes(codes.value);
    ungroupedCodes.push(newCode);
    postCode(newCode);
    newCodeName.value = "";
}

//Drag code
const isDragging = ref(false);
function dragChange(event) {
    console.log(event);
    if (event.added) {
        let updateCode = event.added.element;
        let newCodeGroup = codes.value.find((group) => {
            return group.data.find((code) => code.id == updateCode.id);
        });
        updateCode.code_group_id = newCodeGroup.id;
        putCode(updateCode);
    }
}

//Data
const columns = [
    { title: "Name", dataIndex: "name" },
    { title: "Group", dataIndex: "code_group" },
    { title: "Owner", dataIndex: "owner" },
    { title: "Usage", dataIndex: "usage" },
];
</script>

<style scoped>
.group {
    background-color: #fff;
}
.code-group-container {
    width: 200px;
    padding: 8px 0;
    border-radius: 4px;
    background-color: #fff;
}
.code-group-header {
    font-size: 16px;
    font-weight: 600;
    padding: 10px 16px;
    background-color: #fff;
}
.code-group-element {
    display: flex;
    justify-content: space-between;
    flex-direction: row;
    padding: 10px 16px;
    background-color: #fff;
    cursor: move;
}
.code-group-footer {
    padding: 6px 16px;
}
</style>
