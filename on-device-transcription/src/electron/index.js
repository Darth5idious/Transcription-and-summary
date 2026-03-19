import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import fs from "node:fs/promises";

const __dirname = import.meta.dirname;
const isdev = !app.isPackaged || process.env.NODE_ENV == "development";
const base = isdev ? "../../build" : "../../";

const sessionsDir = path.join(app.getPath('userData'), 'sessions');
const audioDir = path.join(app.getPath('userData'), 'audio');

async function ensureDirectories() {
	await fs.mkdir(sessionsDir, { recursive: true });
	await fs.mkdir(audioDir, { recursive: true });
}

// --- IPC Handlers ---

ipcMain.handle('list-sessions', async () => {
	const files = await fs.readdir(sessionsDir);
	const sessions = [];
	for (const file of files.filter(f => f.endsWith('.json'))) {
		try {
			const content = await fs.readFile(path.join(sessionsDir, file), 'utf-8');
			sessions.push(JSON.parse(content));
		} catch {
			// Skip corrupted files
		}
	}
	return sessions.sort((a, b) => b.createdAt - a.createdAt);
});

ipcMain.handle('save-session', async (_, session) => {
	const filePath = path.join(sessionsDir, `${session.id}.json`);
	await fs.writeFile(filePath, JSON.stringify(session, null, 2));
	return true;
});

ipcMain.handle('delete-session', async (_, sessionId) => {
	await fs.unlink(path.join(sessionsDir, `${sessionId}.json`)).catch(() => { });
	await fs.unlink(path.join(audioDir, `${sessionId}.wav`)).catch(() => { });
	return true;
});

ipcMain.handle('save-audio', async (_, { sessionId, buffer }) => {
	const filePath = path.join(audioDir, `${sessionId}.wav`);
	await fs.writeFile(filePath, Buffer.from(buffer));
	return filePath;
});

ipcMain.handle('load-audio', async (_, sessionId) => {
	const filePath = path.join(audioDir, `${sessionId}.wav`);
	const buffer = await fs.readFile(filePath);
	return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
});

ipcMain.handle('read-groq-key-file', async () => {
	try {
		const keyPath = path.join(app.getPath('home'), 'Documents', 'groq.txt');
		const content = await fs.readFile(keyPath, 'utf-8');
		return content.split('\n')[0].trim();
	} catch {
		return null;
	}
});

// --- Window ---

const createWindow = () => {
	const mainWindow = new BrowserWindow({
		backgroundColor: "white",
		width: 1600,
		height: 1000,
		minWidth: 1200,
		minHeight: 800,
		titleBarStyle: 'hidden',
		frame: false,
		resizable: true,
		webPreferences: {
			contextIsolation: true,
			nodeIntegration: false,
			spellcheck: false,
			devTools: true,
			preload: path.join(__dirname, 'preload.cjs'),
		},
	});

	if (isdev) {
		mainWindow.loadURL("http://localhost:5173").catch(() => {
			// Fallback to built files if dev server isn't running
			mainWindow.loadFile(path.join(__dirname, base, "index.html"));
		});
	} else {
		mainWindow.loadFile(path.join(__dirname, base, "index.html"));
	}
};

app.whenReady().then(async () => {
	await ensureDirectories();
	createWindow();

	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow();
		}
	});
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});
