export interface Session {
	id: string;
	title: string;
	createdAt: number;
	duration: number;
	transcript: string;
	summary: string;
	hasAudio: boolean;
}

export interface ElectronAPI {
	listSessions: () => Promise<Session[]>;
	saveSession: (session: Session) => Promise<boolean>;
	deleteSession: (id: string) => Promise<boolean>;
	saveAudio: (data: { sessionId: string; buffer: ArrayBuffer }) => Promise<string>;
	loadAudio: (sessionId: string) => Promise<ArrayBuffer>;
	readGroqKeyFile: () => Promise<string | null>;
}

export interface AppConfig {
	groqApiKey: string;
	transcriptionModel: string;
	summarizationModel: string;
	language: string;
}
