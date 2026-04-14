#!/usr/bin/env node
/**
 * Patches expo's Android ADB files to handle offline emulators gracefully on Windows.
 *
 * adb.js fixes:
 * 1. isBooted was always true for emulators regardless of offline status
 * 2. getAdbNameForDeviceIdAsync was called for offline emulators, throwing on Windows
 * 3. Error regex only matched Linux "Connection refused", not Windows error messages
 *
 * adbReverse.js fixes:
 * 4. Port reversal was attempted on offline devices, producing spurious warnings
 */

const fs = require('fs');
const path = require('path');

const androidDir = path.join(
  __dirname,
  '../node_modules/expo/node_modules/@expo/cli/build/src/start/platforms/android'
);

function applyPatches(filePath, patches) {
  if (!fs.existsSync(filePath)) {
    console.log(`patch-expo-adb: ${path.basename(filePath)} not found, skipping`);
    return;
  }

  let src = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  for (const { name, from, to } of patches) {
    if (src.includes(from)) {
      src = src.replace(from, to);
      changed = true;
      console.log(`patch-expo-adb: applied ${name}`);
    } else if (!src.includes(to)) {
      console.warn(`patch-expo-adb: ${name} — source changed unexpectedly, skipping`);
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, src, 'utf8');
    console.log(`patch-expo-adb: ${path.basename(filePath)} patched successfully`);
  } else {
    console.log(`patch-expo-adb: ${path.basename(filePath)} — all fixes already present`);
  }
}

// --- adb.js patches ---
applyPatches(path.join(androidDir, 'adb.js'), [
  {
    name: 'fix 1 (isBooted for offline emulators)',
    from: "const isBooted = type === 'emulator' || props[1] !== 'offline';",
    to:   "const isBooted = props[1] !== 'offline';",
  },
  {
    name: 'fix 2 (skip name lookup for offline emulators)',
    from: `} else {
            // Given an emulator pid, get the emulator name which can be used to start the emulator later.
            name = await getAdbNameForDeviceIdAsync({
                pid
            }) ?? '';
        }`,
    to: `} else if (isBooted) {
            // Given an emulator pid, get the emulator name which can be used to start the emulator later.
            name = await getAdbNameForDeviceIdAsync({
                pid
            }) ?? '';
        } else {
            name = '';
        }`,
  },
  {
    name: 'fix 3 (Windows error message regex)',
    from: 'if (results.match(/could not connect to TCP port .*: Connection refused/)) {',
    to:   'if (results.match(/could not connect to TCP port .*: (Connection refused|No connection could be made|cannot connect)/i)) {',
  },
]);

// --- adbReverse.js patches ---
applyPatches(path.join(androidDir, 'adbReverse.js'), [
  {
    name: 'fix 4a (skip offline devices during port reversal start)',
    from: `    const devices = await (0, _adb.getAttachedDevicesAsync)();
    for (const device of devices){
        for (const port of ports){
            if (!await adbReverseAsync(device, port)) {
                debug(\`Failed to start reverse port \${port} on device "\${device.name}"\`);
                return false;
            }
        }
    }
    return true;`,
    to: `    const devices = await (0, _adb.getAttachedDevicesAsync)();
    for (const device of devices){
        if (!device.isBooted) {
            debug(\`Skipping offline device "\${device.pid}" for port reversal\`);
            continue;
        }
        for (const port of ports){
            if (!await adbReverseAsync(device, port)) {
                debug(\`Failed to start reverse port \${port} on device "\${device.name}"\`);
                return false;
            }
        }
    }
    return true;`,
  },
  {
    name: 'fix 4b (skip offline devices during port reversal stop)',
    from: `    const devices = await (0, _adb.getAttachedDevicesAsync)();
    for (const device of devices){
        for (const port of ports){
            await adbReverseRemoveAsync(device, port);
        }
    }`,
    to: `    const devices = await (0, _adb.getAttachedDevicesAsync)();
    for (const device of devices){
        if (!device.isBooted) {
            continue;
        }
        for (const port of ports){
            await adbReverseRemoveAsync(device, port);
        }
    }`,
  },
]);
