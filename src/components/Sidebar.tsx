import React from "react";

interface BraveWebResult {
  title: string;
  url: string;
  description: string;
}
interface BraveResponse {
  web?: { results?: BraveWebResult[] };
  error?: string;
}
interface SessionData {
  fileName: string;
  prompt: string;
  gptResponse: string;
  braveResult: BraveResponse | null;
}
interface SidebarProps {
  sessions: SessionData[];
  onSessionSelect: (sessionIndex: number) => void;
  onDeleteSession: (sessionIndex: number) => void;
}

export default function Sidebar({
  sessions,
  onSessionSelect,
  onDeleteSession,
}: SidebarProps) {
  return (
    <aside className="w-full sm:w-64 bg-[#4F4557] text-[#ffffff] p-4 h-full overflow-y-auto">
      <h2 className="font-bold text-lg mb-4">Sessions</h2>
      {sessions.length === 0 ? (
        <p className="text-sm text-[#6D5D6E]">No sessions yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {sessions.map((session, index) => (
            <li key={index} className="border-b border-[#6D5D6E] pb-2 flex justify-between">
              <div className="cursor-pointer" onClick={() => onSessionSelect(index)}>
                <p className="font-semibold text-sm">Session {index + 1}</p>
                <p className="text-xs text-[#6D5D6E]">
                  File: <span className="text-[#ffffff]">{session.fileName}</span>
                </p>
                <p className="text-xs text-[#6D5D6E]">
                  Prompt: <span className="text-[#ffffff]">{session.prompt}</span>
                </p>
              </div>
              <button
                className="text-red-400 text-sm ml-2 hover:text-red-300"
                onClick={() => onDeleteSession(index)}
              >
                x
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
