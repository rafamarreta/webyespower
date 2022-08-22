import { Header } from './block';
import { millis, hex2arr, arr2hex, swap32Arr } from './utils';


function test(Module) {
  const result = Module._malloc(40);
  const yespower_test = Module.cwrap('yespower10_test', null, ['array', 'number']);

  yespower_test(hex2arr("000000209b69bca4069f5bb515bfbb72e2573ed553db227631af2977e37b6fa039020000a8cc446506dc070388611dde0dd6cbc870b309653323aa55ff12206b8b99dcfc95240263aca50e1e210b0000"), result);

  const hash = new Uint32Array(8);
  hash[0] = Module.getValue(result + 8, 'i32');
  hash[1] = Module.getValue(result + 12, 'i32');
  hash[2] = Module.getValue(result + 16, 'i32');
  hash[3] = Module.getValue(result + 20, 'i32');
  hash[4] = Module.getValue(result + 24, 'i32');
  hash[5] = Module.getValue(result + 28, 'i32');
  hash[6] = Module.getValue(result + 32, 'i32');
  hash[7] = Module.getValue(result + 36, 'i32');

  Module._free(result);

  console.assert(arr2hex(new Uint8Array(hash.buffer)) === "000386563f0854d56791d220f7861d820eb44f8bd0405c99bae81c28c29bbeda", "test hash failed");
}

function mine(work) {

  var Module = {
    preRun: [],
    postRun: [],
    totalDependencies: 0,
    monitorRunDependencies: function (left) {
      this.totalDependencies = Math.max(this.totalDependencies, left);
    }
  };

  Module.onRuntimeInitialized = async () => {

    /* TEST */
    test(Module);
    /*     */

    const result = Module._malloc(40);
    const yespower = Module.cwrap('yespower10', null, ['array', 'number', 'array', 'number', 'number']);

    // per i dettagli degli step successivi vedi https://braiins.com/stratum-v1/docs

    // extraNonce2 tra 0 e (2^(work.extraNonce2Size * 8)) - 1
    let extraNonce2 = Math.floor(Math.random() * Math.pow(2, work.extraNonce2Size * 8));
    const target = parseInt("0000FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF", 16) / work.miningDiff;
    //console.log("target", target.toString(16).padStart(64, "0"));
    const targetArr = hex2arr(target.toString(16).padStart(64, "0"));
    // swap
    swap32Arr(new Uint32Array(targetArr.buffer));

    let firstNonce = 0;
    let header;
    const numHashes = Math.pow(2, 5);

    while (true) {

      const start = millis();

      // i nonce devono avanzare di un numero che consente di arrivare esattamente a 2^32 così si riparte da 0 e viene incrementato extraNonce2
      firstNonce = firstNonce % Math.pow(2, 32);
      if (firstNonce === 0) {
        extraNonce2 = (extraNonce2 + 1) % Math.pow(2, work.extraNonce2Size * 8);
        header = new Header(work, extraNonce2.toString(16).padStart(work.extraNonce2Size * 2, "0"), "00000000").buildU8();
      }

      yespower(header, firstNonce, targetArr, numHashes, result);

      const found = Module.getValue(result, 'i32');

      let nonce = null;
      let hash;
      if (found === 1) {
        nonce = Module.getValue(result + 4, 'i32');
        hash = new Uint32Array(8);
        hash[0] = Module.getValue(result + 8, 'i32');
        hash[1] = Module.getValue(result + 12, 'i32');
        hash[2] = Module.getValue(result + 16, 'i32');
        hash[3] = Module.getValue(result + 20, 'i32');
        hash[4] = Module.getValue(result + 24, 'i32');
        hash[5] = Module.getValue(result + 28, 'i32');
        hash[6] = Module.getValue(result + 32, 'i32');
        hash[7] = Module.getValue(result + 36, 'i32');
      }

      Module._free(result);

      if (nonce !== null) {
        //console.log("Found!", "nonce", nonce, "extraNonce2", extraNonce2, "hash", arr2hex(new Uint8Array(hash.buffer)));
        postMessage({
          type: "submit",
          data: {
            job_id: work.jobId,
            extranonce2: extraNonce2.toString(16).padStart(work.extraNonce2Size * 2, "0"),  // big endian
            ntime: work.ntime, // big endian
            nonce: nonce.toString(16).padStart(8, "0") // big endian
          }
        });
        break;
      }

      firstNonce += numHashes;

      const end = millis();
      const hashrate = (numHashes / ((end - start) / 1000)) / 1000;
      postMessage({
        type: "hashrate",
        data: hashrate.toFixed(2)
      });
    }
  }




  var Module = typeof Module != "undefined" ? Module : {}; var moduleOverrides = Object.assign({}, Module); var arguments_ = []; var thisProgram = "./this.program"; var quit_ = (status, toThrow) => { throw toThrow }; var ENVIRONMENT_IS_WEB = typeof window == "object"; var ENVIRONMENT_IS_WORKER = typeof importScripts == "function"; var ENVIRONMENT_IS_NODE = typeof process == "object" && typeof process.versions == "object" && typeof process.versions.node == "string"; var scriptDirectory = ""; function locateFile(path) { if (Module["locateFile"]) { return Module["locateFile"](path, scriptDirectory) } return scriptDirectory + path } var read_, readAsync, readBinary, setWindowTitle; function logExceptionOnExit(e) { if (e instanceof ExitStatus) return; let toLog = e; err("exiting due to exception: " + toLog) } var fs; var nodePath; var requireNodeFS; if (ENVIRONMENT_IS_NODE) { if (ENVIRONMENT_IS_WORKER) { scriptDirectory = require("path").dirname(scriptDirectory) + "/" } else { scriptDirectory = __dirname + "/" } requireNodeFS = () => { if (!nodePath) { fs = require("fs"); nodePath = require("path") } }; read_ = function shell_read(filename, binary) { requireNodeFS(); filename = nodePath["normalize"](filename); return fs.readFileSync(filename, binary ? undefined : "utf8") }; readBinary = filename => { var ret = read_(filename, true); if (!ret.buffer) { ret = new Uint8Array(ret) } return ret }; readAsync = (filename, onload, onerror) => { requireNodeFS(); filename = nodePath["normalize"](filename); fs.readFile(filename, function (err, data) { if (err) onerror(err); else onload(data.buffer) }) }; if (process["argv"].length > 1) { thisProgram = process["argv"][1].replace(/\\/g, "/") } arguments_ = process["argv"].slice(2); if (typeof module != "undefined") { module["exports"] = Module } process["on"]("uncaughtException", function (ex) { if (!(ex instanceof ExitStatus)) { throw ex } }); process["on"]("unhandledRejection", function (reason) { throw reason }); quit_ = (status, toThrow) => { if (keepRuntimeAlive()) { process["exitCode"] = status; throw toThrow } logExceptionOnExit(toThrow); process["exit"](status) }; Module["inspect"] = function () { return "[Emscripten Module object]" } } else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) { if (ENVIRONMENT_IS_WORKER) { scriptDirectory = self.location.href } else if (typeof document != "undefined" && document.currentScript) { scriptDirectory = document.currentScript.src } if (scriptDirectory.indexOf("blob:") !== 0) { scriptDirectory = scriptDirectory.substr(0, scriptDirectory.replace(/[?#].*/, "").lastIndexOf("/") + 1) } else { scriptDirectory = "" } { read_ = url => { var xhr = new XMLHttpRequest; xhr.open("GET", url, false); xhr.send(null); return xhr.responseText }; if (ENVIRONMENT_IS_WORKER) { readBinary = url => { var xhr = new XMLHttpRequest; xhr.open("GET", url, false); xhr.responseType = "arraybuffer"; xhr.send(null); return new Uint8Array(xhr.response) } } readAsync = (url, onload, onerror) => { var xhr = new XMLHttpRequest; xhr.open("GET", url, true); xhr.responseType = "arraybuffer"; xhr.onload = () => { if (xhr.status == 200 || xhr.status == 0 && xhr.response) { onload(xhr.response); return } onerror() }; xhr.onerror = onerror; xhr.send(null) } } setWindowTitle = title => document.title = title } else { } var out = Module["print"] || console.log.bind(console); var err = Module["printErr"] || console.warn.bind(console); Object.assign(Module, moduleOverrides); moduleOverrides = null; if (Module["arguments"]) arguments_ = Module["arguments"]; if (Module["thisProgram"]) thisProgram = Module["thisProgram"]; if (Module["quit"]) quit_ = Module["quit"]; var wasmBinary; if (Module["wasmBinary"]) wasmBinary = Module["wasmBinary"]; var noExitRuntime = Module["noExitRuntime"] || true; if (typeof WebAssembly != "object") { abort("no native wasm support detected") } var wasmMemory; var ABORT = false; var EXITSTATUS; var UTF8Decoder = typeof TextDecoder != "undefined" ? new TextDecoder("utf8") : undefined; function UTF8ArrayToString(heapOrArray, idx, maxBytesToRead) { var endIdx = idx + maxBytesToRead; var endPtr = idx; while (heapOrArray[endPtr] && !(endPtr >= endIdx)) ++endPtr; if (endPtr - idx > 16 && heapOrArray.buffer && UTF8Decoder) { return UTF8Decoder.decode(heapOrArray.subarray(idx, endPtr)) } var str = ""; while (idx < endPtr) { var u0 = heapOrArray[idx++]; if (!(u0 & 128)) { str += String.fromCharCode(u0); continue } var u1 = heapOrArray[idx++] & 63; if ((u0 & 224) == 192) { str += String.fromCharCode((u0 & 31) << 6 | u1); continue } var u2 = heapOrArray[idx++] & 63; if ((u0 & 240) == 224) { u0 = (u0 & 15) << 12 | u1 << 6 | u2 } else { u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6 | heapOrArray[idx++] & 63 } if (u0 < 65536) { str += String.fromCharCode(u0) } else { var ch = u0 - 65536; str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023) } } return str } function UTF8ToString(ptr, maxBytesToRead) { return ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : "" } function stringToUTF8Array(str, heap, outIdx, maxBytesToWrite) { if (!(maxBytesToWrite > 0)) return 0; var startIdx = outIdx; var endIdx = outIdx + maxBytesToWrite - 1; for (var i = 0; i < str.length; ++i) { var u = str.charCodeAt(i); if (u >= 55296 && u <= 57343) { var u1 = str.charCodeAt(++i); u = 65536 + ((u & 1023) << 10) | u1 & 1023 } if (u <= 127) { if (outIdx >= endIdx) break; heap[outIdx++] = u } else if (u <= 2047) { if (outIdx + 1 >= endIdx) break; heap[outIdx++] = 192 | u >> 6; heap[outIdx++] = 128 | u & 63 } else if (u <= 65535) { if (outIdx + 2 >= endIdx) break; heap[outIdx++] = 224 | u >> 12; heap[outIdx++] = 128 | u >> 6 & 63; heap[outIdx++] = 128 | u & 63 } else { if (outIdx + 3 >= endIdx) break; heap[outIdx++] = 240 | u >> 18; heap[outIdx++] = 128 | u >> 12 & 63; heap[outIdx++] = 128 | u >> 6 & 63; heap[outIdx++] = 128 | u & 63 } } heap[outIdx] = 0; return outIdx - startIdx } function stringToUTF8(str, outPtr, maxBytesToWrite) { return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite) } var buffer, HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64; function updateGlobalBufferAndViews(buf) { buffer = buf; Module["HEAP8"] = HEAP8 = new Int8Array(buf); Module["HEAP16"] = HEAP16 = new Int16Array(buf); Module["HEAP32"] = HEAP32 = new Int32Array(buf); Module["HEAPU8"] = HEAPU8 = new Uint8Array(buf); Module["HEAPU16"] = HEAPU16 = new Uint16Array(buf); Module["HEAPU32"] = HEAPU32 = new Uint32Array(buf); Module["HEAPF32"] = HEAPF32 = new Float32Array(buf); Module["HEAPF64"] = HEAPF64 = new Float64Array(buf) } var INITIAL_MEMORY = Module["INITIAL_MEMORY"] || 16777216; var wasmTable; var __ATPRERUN__ = []; var __ATINIT__ = []; var __ATPOSTRUN__ = []; var runtimeInitialized = false; function keepRuntimeAlive() { return noExitRuntime } function preRun() { if (Module["preRun"]) { if (typeof Module["preRun"] == "function") Module["preRun"] = [Module["preRun"]]; while (Module["preRun"].length) { addOnPreRun(Module["preRun"].shift()) } } callRuntimeCallbacks(__ATPRERUN__) } function initRuntime() { runtimeInitialized = true; callRuntimeCallbacks(__ATINIT__) } function postRun() { if (Module["postRun"]) { if (typeof Module["postRun"] == "function") Module["postRun"] = [Module["postRun"]]; while (Module["postRun"].length) { addOnPostRun(Module["postRun"].shift()) } } callRuntimeCallbacks(__ATPOSTRUN__) } function addOnPreRun(cb) { __ATPRERUN__.unshift(cb) } function addOnInit(cb) { __ATINIT__.unshift(cb) } function addOnPostRun(cb) { __ATPOSTRUN__.unshift(cb) } var runDependencies = 0; var runDependencyWatcher = null; var dependenciesFulfilled = null; function addRunDependency(id) { runDependencies++; if (Module["monitorRunDependencies"]) { Module["monitorRunDependencies"](runDependencies) } } function removeRunDependency(id) { runDependencies--; if (Module["monitorRunDependencies"]) { Module["monitorRunDependencies"](runDependencies) } if (runDependencies == 0) { if (runDependencyWatcher !== null) { clearInterval(runDependencyWatcher); runDependencyWatcher = null } if (dependenciesFulfilled) { var callback = dependenciesFulfilled; dependenciesFulfilled = null; callback() } } } function abort(what) { { if (Module["onAbort"]) { Module["onAbort"](what) } } what = "Aborted(" + what + ")"; err(what); ABORT = true; EXITSTATUS = 1; what += ". Build with -sASSERTIONS for more info."; var e = new WebAssembly.RuntimeError(what); throw e } var dataURIPrefix = "data:application/octet-stream;base64,"; function isDataURI(filename) { return filename.startsWith(dataURIPrefix) } function isFileURI(filename) { return filename.startsWith("file://") } var wasmBinaryFile; wasmBinaryFile = "yespower.wasm"; if (!isDataURI(wasmBinaryFile)) { wasmBinaryFile = locateFile(wasmBinaryFile) } function getBinary(file) { try { if (file == wasmBinaryFile && wasmBinary) { return new Uint8Array(wasmBinary) } if (readBinary) { return readBinary(file) } throw "both async and sync fetching of the wasm failed" } catch (err) { abort(err) } } function getBinaryPromise() { if (!wasmBinary && (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER)) { if (typeof fetch == "function" && !isFileURI(wasmBinaryFile)) { return fetch(wasmBinaryFile, { credentials: "same-origin" }).then(function (response) { if (!response["ok"]) { throw "failed to load wasm binary file at '" + wasmBinaryFile + "'" } return response["arrayBuffer"]() }).catch(function () { return getBinary(wasmBinaryFile) }) } else { if (readAsync) { return new Promise(function (resolve, reject) { readAsync(wasmBinaryFile, function (response) { resolve(new Uint8Array(response)) }, reject) }) } } } return Promise.resolve().then(function () { return getBinary(wasmBinaryFile) }) } function createWasm() { var info = { "a": asmLibraryArg }; function receiveInstance(instance, module) { var exports = instance.exports; Module["asm"] = exports; wasmMemory = Module["asm"]["e"]; updateGlobalBufferAndViews(wasmMemory.buffer); wasmTable = Module["asm"]["i"]; addOnInit(Module["asm"]["f"]); removeRunDependency("wasm-instantiate") } addRunDependency("wasm-instantiate"); function receiveInstantiationResult(result) { receiveInstance(result["instance"]) } function instantiateArrayBuffer(receiver) { return getBinaryPromise().then(function (binary) { return WebAssembly.instantiate(binary, info) }).then(function (instance) { return instance }).then(receiver, function (reason) { err("failed to asynchronously prepare wasm: " + reason); abort(reason) }) } function instantiateAsync() { if (!wasmBinary && typeof WebAssembly.instantiateStreaming == "function" && !isDataURI(wasmBinaryFile) && !isFileURI(wasmBinaryFile) && !ENVIRONMENT_IS_NODE && typeof fetch == "function") { return fetch(wasmBinaryFile, { credentials: "same-origin" }).then(function (response) { var result = WebAssembly.instantiateStreaming(response, info); return result.then(receiveInstantiationResult, function (reason) { err("wasm streaming compile failed: " + reason); err("falling back to ArrayBuffer instantiation"); return instantiateArrayBuffer(receiveInstantiationResult) }) }) } else { return instantiateArrayBuffer(receiveInstantiationResult) } } if (Module["instantiateWasm"]) { try { var exports = Module["instantiateWasm"](info, receiveInstance); return exports } catch (e) { err("Module.instantiateWasm callback failed with error: " + e); return false } } instantiateAsync(); return {} } function ExitStatus(status) { this.name = "ExitStatus"; this.message = "Program terminated with exit(" + status + ")"; this.status = status } function callRuntimeCallbacks(callbacks) { while (callbacks.length > 0) { callbacks.shift()(Module) } } function getValue(ptr, type = "i8") { if (type.endsWith("*")) type = "*"; switch (type) { case "i1": return HEAP8[ptr >> 0]; case "i8": return HEAP8[ptr >> 0]; case "i16": return HEAP16[ptr >> 1]; case "i32": return HEAP32[ptr >> 2]; case "i64": return HEAP32[ptr >> 2]; case "float": return HEAPF32[ptr >> 2]; case "double": return HEAPF64[ptr >> 3]; case "*": return HEAPU32[ptr >> 2]; default: abort("invalid type for getValue: " + type) }return null } function writeArrayToMemory(array, buffer) { HEAP8.set(array, buffer) } function ___assert_fail(condition, filename, line, func) { abort("Assertion failed: " + UTF8ToString(condition) + ", at: " + [filename ? UTF8ToString(filename) : "unknown filename", line, func ? UTF8ToString(func) : "unknown function"]) } var SYSCALLS = { varargs: undefined, get: function () { SYSCALLS.varargs += 4; var ret = HEAP32[SYSCALLS.varargs - 4 >> 2]; return ret }, getStr: function (ptr) { var ret = UTF8ToString(ptr); return ret } }; function __munmap_js(addr, len, prot, flags, fd, offset) { } function _emscripten_memcpy_big(dest, src, num) { HEAPU8.copyWithin(dest, src, src + num) } function abortOnCannotGrowMemory(requestedSize) { abort("OOM") } function _emscripten_resize_heap(requestedSize) { var oldSize = HEAPU8.length; requestedSize = requestedSize >>> 0; abortOnCannotGrowMemory(requestedSize) } function getCFunc(ident) { var func = Module["_" + ident]; return func } function ccall(ident, returnType, argTypes, args, opts) { var toC = { "string": str => { var ret = 0; if (str !== null && str !== undefined && str !== 0) { var len = (str.length << 2) + 1; ret = stackAlloc(len); stringToUTF8(str, ret, len) } return ret }, "array": arr => { var ret = stackAlloc(arr.length); writeArrayToMemory(arr, ret); return ret } }; function convertReturnValue(ret) { if (returnType === "string") { return UTF8ToString(ret) } if (returnType === "boolean") return Boolean(ret); return ret } var func = getCFunc(ident); var cArgs = []; var stack = 0; if (args) { for (var i = 0; i < args.length; i++) { var converter = toC[argTypes[i]]; if (converter) { if (stack === 0) stack = stackSave(); cArgs[i] = converter(args[i]) } else { cArgs[i] = args[i] } } } var ret = func.apply(null, cArgs); function onDone(ret) { if (stack !== 0) stackRestore(stack); return convertReturnValue(ret) } ret = onDone(ret); return ret } function cwrap(ident, returnType, argTypes, opts) { argTypes = argTypes || []; var numericArgs = argTypes.every(type => type === "number" || type === "boolean"); var numericRet = returnType !== "string"; if (numericRet && numericArgs && !opts) { return getCFunc(ident) } return function () { return ccall(ident, returnType, argTypes, arguments, opts) } } var asmLibraryArg = { "d": ___assert_fail, "b": __munmap_js, "c": _emscripten_memcpy_big, "a": _emscripten_resize_heap }; var asm = createWasm(); var ___wasm_call_ctors = Module["___wasm_call_ctors"] = function () { return (___wasm_call_ctors = Module["___wasm_call_ctors"] = Module["asm"]["f"]).apply(null, arguments) }; var _yespower10 = Module["_yespower10"] = function () { return (_yespower10 = Module["_yespower10"] = Module["asm"]["g"]).apply(null, arguments) }; var _yespower10_test = Module["_yespower10_test"] = function () { return (_yespower10_test = Module["_yespower10_test"] = Module["asm"]["h"]).apply(null, arguments) }; var _malloc = Module["_malloc"] = function () { return (_malloc = Module["_malloc"] = Module["asm"]["j"]).apply(null, arguments) }; var _free = Module["_free"] = function () { return (_free = Module["_free"] = Module["asm"]["k"]).apply(null, arguments) }; var stackSave = Module["stackSave"] = function () { return (stackSave = Module["stackSave"] = Module["asm"]["l"]).apply(null, arguments) }; var stackRestore = Module["stackRestore"] = function () { return (stackRestore = Module["stackRestore"] = Module["asm"]["m"]).apply(null, arguments) }; var stackAlloc = Module["stackAlloc"] = function () { return (stackAlloc = Module["stackAlloc"] = Module["asm"]["n"]).apply(null, arguments) }; Module["cwrap"] = cwrap; Module["getValue"] = getValue; var calledRun; dependenciesFulfilled = function runCaller() { if (!calledRun) run(); if (!calledRun) dependenciesFulfilled = runCaller }; function run(args) { args = args || arguments_; if (runDependencies > 0) { return } preRun(); if (runDependencies > 0) { return } function doRun() { if (calledRun) return; calledRun = true; Module["calledRun"] = true; if (ABORT) return; initRuntime(); if (Module["onRuntimeInitialized"]) Module["onRuntimeInitialized"](); postRun() } if (Module["setStatus"]) { Module["setStatus"]("Running..."); setTimeout(function () { setTimeout(function () { Module["setStatus"]("") }, 1); doRun() }, 1) } else { doRun() } } if (Module["preInit"]) { if (typeof Module["preInit"] == "function") Module["preInit"] = [Module["preInit"]]; while (Module["preInit"].length > 0) { Module["preInit"].pop()() } } run();

}

onmessage = e => {
  mine(e.data.work);
}
