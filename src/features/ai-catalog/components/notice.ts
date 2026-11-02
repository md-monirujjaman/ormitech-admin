export type NoticeTone = 'success' | 'warning' | 'error';
export type Notify = (message: string, tone?: NoticeTone) => void;
