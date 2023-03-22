<template>
    <a-layout>
        <a-layout-content>
            <div id="container"></div>
            <TeleportContainer></TeleportContainer>
        </a-layout-content>
        <a-layout-sider
            style="width: 300px"
            class="sider"
            :resize-directions="['left']"
        >
            <div id="stencil-container"></div
        ></a-layout-sider>
    </a-layout>
</template>

<script setup>
import { Graph } from "@antv/x6";
import { onMounted } from "vue";
import { register, getTeleport } from "@antv/x6-vue-shape";
import { Stencil } from "@antv/x6-plugin-stencil";
import { Keyboard } from "@antv/x6-plugin-keyboard";
import { Selection } from "@antv/x6-plugin-selection";
import { Clipboard } from "@antv/x6-plugin-clipboard";
import AnnoNode from "./nodes/AnnoNode.vue";
import axios from "axios";

const TeleportContainer = getTeleport();

onMounted(() => {
    //initGraph
    const graph = new Graph({
        container: document.getElementById("container"),
        height: 600,
        background: {
            color: "#FFFFFF",
        },
        mousewheel: {
            enabled: true,
        },
        panning: true,
        connecting: {
            router: {
                name: "manhattan",
                args: {
                    padding: 25,
                },
            },
            connector: {
                name: "rounded",
                args: {
                    radius: 8,
                },
            },
        },

        grid: {
            visible: true,
        },
        autoResize: true,
    });
    //Plugin
    graph.use(
        new Keyboard({
            enabled: true,
            global: true,
        })
    );
    graph.use(
        new Selection({
            enabled: true,
            showNodeSelectionBox: true,
            showEdgeSelectionBox: true,
        })
    );
    graph.use(
        new Clipboard({
            enabled: true,
        })
    );
    //复制粘贴
    graph.bindKey("ctrl+c", () => {
        const cells = graph.getSelectedCells();
        if (cells.length) {
            graph.copy(cells);
        }
        return false;
    });
    graph.bindKey("ctrl+v", () => {
        if (!graph.isClipboardEmpty()) {
            const cells = graph.paste({ offset: 32 });
            graph.cleanSelection();
            graph.select(cells);
        }
        return false;
    });
    graph.bindKey("delete", () => {
        const cells = graph.getSelectedCells();
        if (cells.length) {
            graph.removeCells(cells);
        }
        return false;
    });

    //连接桩配置
    const ports = {
        groups: {
            top: {
                position: "top",
                attrs: {
                    circle: {
                        r: 4,
                        magnet: true,
                        stroke: "#5F95FF",
                        strokeWidth: 1,
                        fill: "#fff",
                        style: {
                            visibility: "hidden",
                        },
                    },
                },
            },
            right: {
                position: "right",
                attrs: {
                    circle: {
                        r: 4,
                        magnet: true,
                        stroke: "#5F95FF",
                        strokeWidth: 1,
                        fill: "#fff",
                        style: {
                            visibility: "hidden",
                        },
                    },
                },
            },
            bottom: {
                position: "bottom",
                attrs: {
                    circle: {
                        r: 4,
                        magnet: true,
                        stroke: "#5F95FF",
                        strokeWidth: 1,
                        fill: "#fff",
                        style: {
                            visibility: "hidden",
                        },
                    },
                },
            },
            left: {
                position: "left",
                attrs: {
                    circle: {
                        r: 4,
                        magnet: true,
                        stroke: "#5F95FF",
                        strokeWidth: 1,
                        fill: "#fff",
                        style: {
                            visibility: "hidden",
                        },
                    },
                },
            },
        },
        items: [
            {
                group: "top",
            },
            {
                group: "right",
            },
            {
                group: "bottom",
            },
            {
                group: "left",
            },
        ],
    };
    // 控制连接桩显示/隐藏
    const showPorts = (ports, show) => {
        for (let i = 0, len = ports.length; i < len; i = i + 1) {
            ports[i].style.visibility = show ? "visible" : "hidden";
        }
    };
    // 节点/边的交互
    graph.on("node:mouseenter", ({ node }) => {
        const ports = container.querySelectorAll(".x6-port-body");
        showPorts(ports, true);
    });
    graph.on("node:selected", ({ node }) => {
        const ports = container.querySelectorAll(".x6-port-body");
        showPorts(ports, true);
    });
    graph.on("node:mouseleave", ({ node }) => {
        const ports = container.querySelectorAll(".x6-port-body");
        showPorts(ports, false);
    });
    graph.on("node:unselected", ({ node }) => {
        const ports = container.querySelectorAll(".x6-port-body");
        showPorts(ports, false);
    });
    graph.on("edge:dblclick", ({ cell, e }) => {
        //双击编辑边的文字
        cell.addTools({
            name: "edge-editor",
            args: {
                event: e,
            },
        });
    });

    //注册节点
    register({
        shape: "custom-vue-node",
        width: 200,
        height: 100,
        component: AnnoNode,
        ports: { ...ports },
    });
    // graph.addNode({
    //     shape: "custom-vue-node",
    //     x: 100,
    //     y: 60,
    //     data: {
    //         text: "2222333",
    //         anno: "2222",
    //     },
    // });
    //Stencil
    const stencil = new Stencil({
        target: graph,
        groups: [
            {
                name: "Annotations",
            },
        ],
        stencilGraphWidth: 600,
        stencilGraphHeight: 0,
        layoutOptions: {
            columns: 1,
            rowHeight: 120,
        },
    });
    document.getElementById("stencil-container").appendChild(stencil.container);
    axios.get("http://localhost:5000/annotation").then((response) => {
        const annos = response.data;
        const nodeList = [];
        annos.forEach((anno) => {
            let node = graph.createNode({
                shape: "custom-vue-node",
                data: { anno: anno, text: anno.text },
            });
            nodeList.push(node);
        });
        stencil.load(nodeList, "Annotations");
    });
});
</script>
<style scoped>
.sider {
    border-radius: 4px;
    box-shadow: none;
}
</style>
