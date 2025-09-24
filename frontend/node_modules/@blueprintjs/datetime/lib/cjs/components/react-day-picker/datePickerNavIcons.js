"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IconRight = exports.IconLeft = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const icons_1 = require("@blueprintjs/icons");
function IconLeft({ children, ...props }) {
    return (0, jsx_runtime_1.jsx)(icons_1.ChevronLeft, { ...props });
}
exports.IconLeft = IconLeft;
function IconRight({ children, ...props }) {
    return (0, jsx_runtime_1.jsx)(icons_1.ChevronRight, { ...props });
}
exports.IconRight = IconRight;
//# sourceMappingURL=datePickerNavIcons.js.map