<template>
    <a-layout>
        <a-page-header
            style="background-color: #fff; height: 64px"
            :title="route.name"
            :show-back="showBack"
            @back="this.$router.back"
        >
            <template #breadcrumb>
                <a-breadcrumb-item>My Project</a-breadcrumb-item>
                <a-breadcrumb-item>{{ route.name }}</a-breadcrumb-item>
            </template>
            <template #extra>
                <a-button type="primary">New Outline</a-button>
            </template>
        </a-page-header>
        <a-layout-content style="padding: 20px">
            <router-view />
        </a-layout-content>
        <a-layout-footer></a-layout-footer>
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
