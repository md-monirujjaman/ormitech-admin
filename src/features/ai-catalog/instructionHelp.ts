import type { InstructionKey } from './types';

/** What each instruction box is for, shown as its placeholder so a super admin knows what belongs in it. */
export const INSTRUCTION_HELP: Record<InstructionKey, { title: string; placeholder: string }> = {
  main: {
    title: 'Main instruction',
    placeholder: 'For every customer reply, whichever model answers. For example: the tone of the brand, how to greet, how to close a chat, what never to promise.',
  },
  router: {
    title: 'Instruction for the intent router',
    placeholder: 'Only about reading a message: for example, treat any mention of a refund or a wrong item as a complaint. The answer format of the routing call is fixed and cannot be changed here.',
  },
  slot1: { title: 'Instruction for Model 1: Primary', placeholder: 'How the primary model handles everyday business conversation, Bangla and Banglish: length, style, how to ask a follow-up question.' },
  slot2: { title: 'Instruction for Model 2: Images and voice', placeholder: 'How to read a picture or a voice message: what to note first (product, colour, text on it), and what to leave out.' },
  slot3: { title: 'Instruction for Model 3: Specialist', placeholder: 'How to handle complaints and hard cases: be calm, apologise once, never argue, say a team member will follow up.' },
  slot4: { title: 'Instruction for Model 4: Off-topic', placeholder: 'Tone for small talk only. This model is never given product, price or order data, so do not tell it to quote any.' },
};
