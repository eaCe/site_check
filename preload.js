const {ipcRenderer, contextBridge} = require("electron");

contextBridge.exposeInMainWorld(
    "api", {
        invoke: (channel, data) => {
            let validChannels = ["scanSite"];
            if (validChannels.includes(channel)) {
                return ipcRenderer.invoke(channel, data);
            }
        },
    }
);

window.addEventListener('DOMContentLoaded', () => {
})
