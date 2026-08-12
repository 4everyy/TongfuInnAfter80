'use strict';

// 共享对象工具：消除 inn 模块多处重复的 JSON 深拷贝助手。
// 仅用于纯数据状态对象（不含 undefined/函数/循环引用）。
function deepCopy(source) {
  return JSON.parse(JSON.stringify(source));
}

module.exports = { deepCopy: deepCopy };
