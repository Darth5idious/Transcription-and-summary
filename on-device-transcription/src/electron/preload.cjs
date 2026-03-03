const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
	listSessions: () => ipcRenderer.invoke('list-sessions'),
	saveSession: (session) => ipcRenderer.invoke('save-session', session),
	deleteSession: (id) => ipcRenderer.invoke('delete-session', id),
	saveAudio: (data) => ipcRenderer.invoke('save-audio', data),
	loadAudio: (id) => ipcRenderer.invoke('load-audio', id),
	readGroqKeyFile: () => ipcRenderer.invoke('read-groq-key-file'),
});
