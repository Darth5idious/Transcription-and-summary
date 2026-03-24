export interface DiarizedSegment {
	speaker: string; // "Speaker 1", "Speaker 2", …
	text: string;
	start: number;
	end: number;
}

export interface Session {
	id: string;
	title: string;
	createdAt: number;
	duration: number;
	transcript: string;
	summary: string;
	hasAudio: boolean;
	segments?: DiarizedSegment[];
	translation?: string; // English translation when recorded in another language
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

export interface User {
	id: number;
	username: string;
	email?: string;
	google_id?: string;
}

export interface DbSummary {
	id: number;
	user_id: number;
	title: string;
	transcript: string | null;
	summary: string | null;
	translation: string | null;
	duration: number;
	language: string;
	created_at: string;
}
