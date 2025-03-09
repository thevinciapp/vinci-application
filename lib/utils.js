"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encodedRedirect = encodedRedirect;
exports.cn = cn;
const navigation_1 = require("next/navigation");
const clsx_1 = require("clsx");
const tailwind_merge_1 = require("tailwind-merge");
/**
 * Redirects to a specified path with an encoded message as a query parameter.
 * @param {('error' | 'success')} type - The type of message, either 'error' or 'success'.
 * @param {string} path - The path to redirect to.
 * @param {string} message - The message to be encoded and added as a query parameter.
 * @returns {never} This function doesn't return as it triggers a redirect.
 */
function encodedRedirect(type, path, message) {
    return (0, navigation_1.redirect)(`${path}?${type}=${encodeURIComponent(message)}`);
}
function cn(...inputs) {
    return (0, tailwind_merge_1.twMerge)((0, clsx_1.clsx)(inputs));
}
