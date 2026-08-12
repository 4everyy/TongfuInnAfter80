'use strict';

// 共享数值工具：消除各模块重复定义的同名小函数。
function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

module.exports = { clamp: clamp };
