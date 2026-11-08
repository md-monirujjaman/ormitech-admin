import { createContext, useContext } from 'react';

export const JoinContext = createContext<(sessionId: string) => Promise<boolean>>(async () => false);

/** Asks the server to put this screen in one chat's message room. False when it refuses. */
export const useJoinSupportSession = () => useContext(JoinContext);
