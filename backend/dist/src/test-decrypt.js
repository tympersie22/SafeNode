"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = require("crypto");
const node_fetch_1 = __importDefault(require("node-fetch"));
const hash_wasm_1 = require("hash-wasm");
function base64ToArrayBuffer(base64) {
    const buf = Buffer.from(base64, 'base64');
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}
async function deriveKey(password, salt) {
    const hashHex = await (0, hash_wasm_1.argon2id)({
        password,
        salt: new Uint8Array(salt),
        iterations: 3,
        memorySize: 64 * 1024,
        parallelism: 1,
        hashLength: 32,
        outputType: 'hex'
    });
    const raw = Buffer.from(hashHex, 'hex');
    return await crypto_1.webcrypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['decrypt']);
}
async function main() {
    const baseUrl = 'http://localhost:4000';
    const password = 'demo-password';
    const saltRes = await (0, node_fetch_1.default)(`${baseUrl}/api/user/salt`);
    const { salt } = await saltRes.json();
    const vaultRes = await (0, node_fetch_1.default)(`${baseUrl}/api/vault/latest`);
    const { encryptedVault, iv } = await vaultRes.json();
    const key = await deriveKey(password, base64ToArrayBuffer(salt));
    const ct = base64ToArrayBuffer(encryptedVault);
    const ivBuf = base64ToArrayBuffer(iv);
    const pt = await crypto_1.webcrypto.subtle.decrypt({ name: 'AES-GCM', iv: ivBuf }, key, ct);
    const json = Buffer.from(pt).toString('utf8');
    console.log('Decrypted OK. First 120 chars:', json.slice(0, 120));
}
main().catch(e => {
    console.error('Test failed:', e);
    process.exit(1);
});
