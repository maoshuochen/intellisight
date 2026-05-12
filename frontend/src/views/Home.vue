<template>
    <a-layout>
        <a-page-header
            style="background-color: #fff; height: 64px"
            title="Welcome!"
            :show-back="showBack"
            @back="this.$router.back"
        >
            <template #breadcrumb>
                <a-breadcrumb-item>My Project</a-breadcrumb-item>
                <a-breadcrumb-item>{{ route.name }}</a-breadcrumb-item>
            </template>
            <template #extra> </template>
        </a-page-header>
        <a-layout-content style="padding: 20px">
            <a-card :bordered="false">
                <a-row>
                    <a-col :span="6">
                        <a-statistic
                            title="Outlines"
                            :value="1"
                            show-group-separator
                        />
                    </a-col>
                    <a-col :span="6">
                        <a-statistic
                            title="Interivews"
                            :value="2"
                            show-group-separator
                        />
                    </a-col>
                    <a-col :span="6">
                        <a-statistic
                            title="Team Members"
                            :value="1"
                            show-group-separator
                        />
                    </a-col>
                </a-row>
            </a-card>
        </a-layout-content>
        <a-layout-footer> </a-layout-footer>
    </a-layout>
</template>

<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";
const route = useRoute();

const showBack = computed(() => {
    let routeLayer = useRoute().path.split("/").length - 1;
    return routeLayer > 1 ? true : false;
});
</script>
