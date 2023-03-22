// 点击编辑按钮后，开始观察元素
function startObserve() {
    //获取高亮元素列表
    const highlightElements = document.getElementsByClassName("highlight-wrap");
    const observers = [];
    highlightElements.forEach((highlightElement) => {
        let newhighlighterSource;
        newhighlighterSource.id =
            highlightElement.getAttribute("data-highlight-id");
        // 创建一个MutationObserver对象，用于监听元素的变化
        var observer = new MutationObserver(function (mutations) {
            // 遍历所有的变化记录
            for (var mutation of mutations) {
                // 如果变化类型是字符数据
                if (mutation.type == "characterData") {
                    // 更新highlighterSource对象的属性
                    newhighlighterSource.text = mutation.target.textContent; //mutation.target是一个文本节点
                    newhighlighterSource.startMeta = {
                        parent_index: -2,
                        parent_tag_name: "P",
                        text_offset: 1000000, //todo:计算文本节点头部与父节点的文本偏移量
                    };
                    newhighlighterSource.endMeta = {
                        parent_index: -2,
                        parent_tag_name: "P",
                        text_offset: 1000000, //todo:计算文本节点尾部与父节点的文本偏移量
                    };
                }
            }
        });
        observer.observe(editable, {
            childList: true,
            characterData: true,
        });
        observers.push(observer);
    });
    return observers;
}

function endOverserve(observers) {
    // 点击保存按钮后，停止观察元素
    observers.forEach((observe) => {
        observer.disconnect();
    });
}
