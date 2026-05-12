<template>
    <a-layout class="main-container">
        <Menu />
        <router-view />
    </a-layout>
</template>

<script setup>
import Menu from "./components/layout/menu.vue";
</script>

<style>
.main-container {
    width: 100vw;
    height: 100vh;
    background: var(--color-fill-2);
}
/* Scroll bar */
/* total width */
::-webkit-scrollbar {
    background-color: #fff;
    width: 14px;
}
/* background of the scrollbar except button or resizer */
::-webkit-scrollbar-track {
    background-color: #fff;
}
/* scrollbar itself */
::-webkit-scrollbar-thumb {
    background-color: #ededf1;
    border-radius: 16px;
    border: 4px solid #fff;
}
/* set button(top and bottom of the scrollbar) */
::-webkit-scrollbar-button {
    display: none;
}
/* Override */
.arco-table-th {
    background-color: var(--color-neutral-1);
}
.arco-resizebox-trigger-icon-wrapper {
    background-color: var(--color-fill-2);
    width: 2px;
}
.arco-layout-sider-light {
    box-shadow: none;
}

.x6-widget-stencil {
    background-color: #fff;
}
.x6-widget-stencil-group > .x6-widget-stencil-group-title {
    background-color: #fff;
}
.x6-widget-stencil.collapsable > .x6-widget-stencil-title,
.x6-widget-stencil-group.collapsable > .x6-widget-stencil-group-title {
    padding-left: 42px;
}
.x6-widget-stencil-title,
.x6-widget-stencil-group > .x6-widget-stencil-group-title {
    font-size: 14px;
    padding: 0;
}
.x6-widget-stencil.collapsable > .x6-widget-stencil-title::before,
.x6-widget-stencil-group.collapsable > .x6-widget-stencil-group-title::before {
    left: 16px;
    top: 7px;
}
</style>
