<template>
    <a-card class="container" ref="container">
        <a-space direction="vertical">
            {{ anno.text }}
            <a-space wrap>
                <a-tag v-for="code in anno.codes" :color="code.codeGroup.color">
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
            anno: { text: null, codes: [] },
            height: 1000,
        };
    },
    mounted() {
        const node = this.getNode();
        const { anno } = node.getData();
        this.anno = anno;
        let height = this.$refs.container.$el.clientHeight;
        let width = this.$refs.container.$el.clientWidth;
        console.log(height);
        node.prop("size", { width, height });
    },
};
</script>
<style scoped>
.container {
    /* height: 100px; */
    width: 200px;
    border-radius: 6px;
}
</style>
