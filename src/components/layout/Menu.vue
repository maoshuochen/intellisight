<template>
    <a-layout-sider class="sider" :width="160">
        <div class="logo"><img src="/assets/logo-text.svg" /></div>
        <a-menu>
            <router-link to="/">
                <a-menu-item class="menu-item" key="1">
                    <icon-home class="menu-item-icon" />Home
                </a-menu-item>
            </router-link>
            <a-menu-item-group title="Data"></a-menu-item-group>
            <router-link to="/outline">
                <a-menu-item class="menu-item" key="2">
                    <icon-question-circle class="menu-item-icon" />Outline
                </a-menu-item>
            </router-link>
            <router-link to="/interview">
                <a-menu-item class="menu-item" key="3">
                    <icon-message class="menu-item-icon" />Interview
                </a-menu-item>
            </router-link>

            <router-link to="/code">
                <a-menu-item class="menu-item" key="4">
                    <icon-tag class="menu-item-icon" />Code
                </a-menu-item>
            </router-link>
            <a-menu-item-group title="Analysis"></a-menu-item-group>
            <router-link to="/canvas">
                <a-menu-item class="menu-item" key="7">
                    <icon-fullscreen class="menu-item-icon" />Canvas
                </a-menu-item>
            </router-link>
            <a-menu-item-group title="People"></a-menu-item-group>
            <router-link to="/team">
                <a-menu-item class="menu-item" key="5">
                    <icon-user-group class="menu-item-icon" />Team
                </a-menu-item>
            </router-link>
            <router-link to="/participant">
                <a-menu-item class="menu-item" key="6">
                    <icon-user class="menu-item-icon" />Participant
                </a-menu-item>
            </router-link>
        </a-menu>
    </a-layout-sider>
</template>

<script>
export default {
    name: "Menu",
};
</script>

<style scoped>
.sider {
    background: #fff;
    box-shadow: none;
    border-right: 1px solid var(--color-neutral-3);
}
.logo {
    display: flex;
    align-items: center;
    height: 40px;
    margin: 12px 20px;
    background: rgba(255, 255, 255, 0.2);
}
.logo img {
    height: 24px;
}
.menu-item {
    display: flex;
    flex-direction: row;
    align-items: center;
    font-size: 15px;
    font-weight: 600;
    margin-bottom: 10px;
    padding: 2px 16px;
    border-radius: 40px;
}
.arco-menu-item.arco-menu-selected {
    font-weight: 600;
}
.menu-item .menu-item-icon {
    width: 1.2em;
    height: 1.2em;
    stroke-width: 4;
    margin-right: 12px;
}
</style>
