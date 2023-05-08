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
                    <template #item="{ element: code }">
                        <a-popover
                            trigger="click"
                            @ok="changeCodeName(code.id, updateCodeName)"
                        >
                            <div class="code-group-element">
                                <a-tag :color="group.color">
                                    {{ code.name }}
                                </a-tag>
                                <a-typography-text
                                    :style="{ color: fontColor(group.color) }"
                                >
                                    {{ code.usage }}
                                </a-typography-text>
                            </div>
                            <template #content>
                                <a-space direction="vertical" size="small">
                                    <a-input
                                        v-model="updateCodeName"
                                        placeholder="New Code Name"
                                        :default-value="code.name"
                                    >
                                    </a-input>
                                    <a-space size="medium">
                                        <a-button>重命名编码</a-button>
                                        <a-link
                                            status="danger"
                                            @click="deleteCode(code.id)"
                                        >
                                            <template #icon>
                                                <icon-delete />
                                            </template>
                                            删除
                                        </a-link>
                                    </a-space>
                                </a-space>
                            </template>
                        </a-popover>
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
                                    >
                                    </a-input>
                                </template>
                            </a-popconfirm>
                        </div>
                    </template>
                </draggable>
            </div>
            <a-link type="text" style="color: var(--color-neutral-6)">
                <template #icon> <icon-plus /> </template>
                New Group
            </a-link>
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
function groupCodes(codes) {
    let groups = codeGroups.value;
    groups.forEach((group) => (group.data = []));
    codes.forEach((code) => {
        code.usage = code.annotations.length;
        let foundGroup = groups.find((group) => group.id == code.codeGroup.id);
        foundGroup.data.push(code);
    });
    return groups;
}
function ungroupCodes(groups) {
    let codes = [];
    groups.forEach((group) => {
        group.data.forEach((code) => {
            code.usage = code.annotations.length;
            codes.push(code);
        });
    });
    return codes;
}
function fontColor(color) {
    return `rgb(var(--${color}-7))`;
}

//Add new code
const newCodeName = ref("");
function addNewCode(groupId) {
    let codeGroup = codeGroups.value.find((group) => group.id == groupId);
    const newCode = {
        name: newCodeName.value,
        owner: "maoshuochen",
        codeGroup: codeGroup,
    };
    let ungroupedCodes = ungroupCodes(codes.value);
    ungroupedCodes.push(newCode);
    postCode(newCode);
    newCodeName.value = "";
}

const newGroupName = ref("");
function addNewGroup() {
    const newCodeGroup = {
        name: newGroupName.value,
        color: "blue",
    };
    postCodeGroup(newCodeGroup);
    newGroupName.value = "";
}

//Drag code and update
const isDragging = ref(false);
function dragChange(event) {
    if (event.added) {
        let updateCode = event.added.element;
        let newCodeGroup = codes.value.find((group) => {
            return group.data.find((code) => code.id == updateCode.id);
        });
        updateCode.codeGroup = newCodeGroup;
        delete updateCode.codeGroup.data;
        delete updateCode.annotations;
        delete updateCode.usage;
        putCode(updateCode);
    }
}

//Update code name
const updateCodeName = ref("");
function changeCodeName(id, name) {
    let updateCode = codes.value.find((group) => {
        return group.data.find((code) => code.id == id);
    });
    updateCode.name = name;
    putCode(updateCode);
}

//Detele code
function deleteCode(id) {
    axios
        .delete(`http://localhost:5000/code/${id}`)
        .then((response) => {
            codes.value = groupCodes(response.data);
        })
        .catch((error) => {
            console.error(error);
        });
}

//Data for Table View
const columns = [
    { title: "Name", dataIndex: "name" },
    { title: "Group", dataIndex: "codeGroup.name" },
    { title: "Owner", dataIndex: "owner" },
    { title: "Usage", dataIndex: "usage" },
];

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
        .put(`http://localhost:5000/code/${updateCode.id}`, updateCode)
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
function postCodeGroup(newCodeGroup) {
    axios
        .post("http://localhost:5000/code-group", newCodeGroup)
        .then((response) => {
            codeGroups.value = response.data;
        })
        .catch((error) => {
            console.error(error);
        });
}
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
