//Libraries
import { createApp } from "vue";
import { createRouter, createWebHashHistory } from "vue-router";
import ArcoVue from "@arco-design/web-vue";
import ArcoVueIcon from "@arco-design/web-vue/es/icon";
import "@arco-design/web-vue/dist/arco.css";
//Components
import App from "./App.vue";
import Home from "./views/Home.vue";
import OutlineLayout from "./views/outline/Layout.vue";
import OutlineList from "./views/outline/List.vue";
import OutlineEdit from "./views/outline/Edit.vue";
import InterviewLayout from "./views/interview/Layout.vue";
import InterviewList from "./views/interview/List.vue";
import InterviewEdit from "./views/interview/Edit.vue";
import CodeLayout from "./views/code/Layout.vue";
import CodeList from "./views/code/List.vue";
import CanvasLayout from "./views/canvas/Layout.vue";
import CanvasList from "./views/canvas/List.vue";
import CanvasEdit from "./views/canvas/Edit.vue";
import Team from "./views/Team.vue";
import ParticipantLayout from "./views/participant/Layout.vue";
import ParticipantList from "./views/participant/List.vue";
import NotFound from "./views/NotFound.vue";

const app = createApp(App);
const routes = [
    { path: "/", name: "Home", component: Home },
    {
        path: "/outline",
        name: "Outline",
        component: OutlineLayout,
        children: [
            { path: "", name: "Outline List", component: OutlineList },
            {
                path: ":id",
                name: "Outline Edit",
                component: OutlineEdit,
            },
        ],
    },
    {
        path: "/interview",
        name: "Interview",
        component: InterviewLayout,
        children: [
            { path: "", name: "Interview List", component: InterviewList },
            { path: ":id", name: "Interview", component: InterviewEdit },
        ],
    },
    {
        path: "/code",
        name: "Code",
        component: CodeLayout,
        children: [{ path: "", name: "Code List", component: CodeList }],
    },
    {
        path: "/canvas",
        name: "Canvas",
        component: CanvasLayout,
        children: [
            { path: "", name: "Canvas List", component: CanvasList },
            { path: ":id", name: "Canvas", component: CanvasEdit },
        ],
    },
    { path: "/team", name: "Team", component: Team },
    {
        path: "/participant",
        name: "Partcipant",
        component: ParticipantLayout,
        children: [
            { path: "", name: "Participant List", component: ParticipantList },
        ],
    },
];
const router = createRouter({
    history: createWebHashHistory(),
    routes, // short for `routes: routes`
});
app.use(router);

app.use(ArcoVue);
app.use(ArcoVueIcon);
app.mount("#app");
