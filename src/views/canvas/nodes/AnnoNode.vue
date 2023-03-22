<template>
    <a-card class="container">
        <a-space direction="vertical">
            {{ anno.text }}
            <a-space wrap>
                <a-tag v-for="code in anno.codes" :color="code.color">
                    {{ code.name }}
                </a-tag>
            </a-space>
        </a-space>
    </a-card>
</template>
<script>
export default {
    name: "AnnoNode",
    inject: ["getNode"],
    data() {
        return {
            text: "empty",
            anno: { text: null, codes: [] },
        };
    },
    mounted() {
        const node = this.getNode();
        const { anno, text } = node.getData();
        this.text = text;
        this.anno = anno;
        // node.on("change:data", ({ current }) => {
        //     console.log(current.text);
        //     this.text = current.text;
        // });
    },
};
</script>
<style scoped>
.container {
    height: 100px;
    width: 200px;
    border-radius: 6px;
}
</style>
