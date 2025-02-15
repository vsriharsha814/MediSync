import { useState, useEffect } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import ReactMarkdown from "react-markdown";
import Sidebar from "@/components/Sidebar";
import FileUpload from "@/components/FileUpload";
import PromptInput from "@/components/PromptInput";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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

const STORAGE_KEY = "medisync_sessions";

export default function Home() {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [selectedSessionIndex, setSelectedSessionIndex] = useState<number | null>(null);
  const [, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [gptResponseLive, setGptResponseLive] = useState("");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSessions(parsed);
          setSelectedSessionIndex(0);
        } else {
          createNewSession();
        }
      } catch {
        createNewSession();
      }
    } else {
      createNewSession();
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  }, [sessions]);

  const createNewSession = () => {
    setSessions((prev) => {
      const newSession: SessionData = {
        fileName: "",
        prompt: "",
        gptResponse: "",
        braveResult: null,
      };
      const updated = [...prev, newSession];
      const newIndex = updated.length === 1 ? 0 : updated.length - 1;
      setSelectedSessionIndex(newIndex);
      setFile(null);
      setFileName("");
      setPrompt("");
      setGptResponseLive("");
      return updated;
    });
  };

  const handleSessionSelect = (index: number) => {
    setSelectedSessionIndex(index);
    setGptResponseLive("");
  };

  const handleDeleteSession = (index: number) => {
    setSessions((prev) => {
      const updated = [...prev];
      updated.splice(index, 1);
      return updated;
    });
    setSelectedSessionIndex(null);
  };

  const handleFileSelect = (newFile: File) => {
    setFile(newFile);
    setFileName(newFile.name);
  };

  const handlePromptSubmit = async () => {
    let braveResult: BraveResponse | null = null;
    try {
      const braveResp = await fetch(`/api/brave?q=${encodeURIComponent(prompt)}`);
      if (braveResp.ok) {
        braveResult = await braveResp.json();
      }
    } catch {}
    let finalContent = "";
    setGptResponseLive("");
    const gptResp = await fetch("/api/gptHandler", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ queries: [prompt] }),
    });
    if (gptResp.ok) {
      const reader = gptResp.body?.getReader();
      const decoder = new TextDecoder();
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith("data: ")) {
              const dataPart = line.replace("data: ", "");
              if (dataPart !== "[DONE]") {
                finalContent += dataPart;
                setGptResponseLive((prev) => prev + dataPart);
              }
            }
          }
        }
      }
    }
    const newSession: SessionData = {
      fileName: fileName || "No file",
      prompt,
      gptResponse: finalContent,
      braveResult,
    };
    setSessions((prev) => [...prev, newSession]);
  };

  const currentSession =
    selectedSessionIndex !== null && sessions[selectedSessionIndex]
      ? sessions[selectedSessionIndex]
      : null;

  return (
    <div
      className={`${geistSans.variable} ${geistMono.variable}
      min-h-screen flex flex-col sm:flex-row bg-[#393646] text-[#ffffff]`}
    >
      <div className="sm:h-screen sm:sticky top-0">
        <Sidebar
          sessions={sessions}
          onSessionSelect={handleSessionSelect}
          onDeleteSession={handleDeleteSession}
        />
      </div>
      <main className="flex-1 p-4 sm:p-8">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">MediSync</h1>
            <p className="text-sm text-[#6D5D6E]">
              A medical web platform to streamline your workflow
            </p>
          </div>
          <button
            onClick={createNewSession}
            className="px-4 py-2 bg-[#6D5D6E] text-[#ffffff] rounded hover:bg-[#4F4557] transition-colors text-sm"
          >
            +
          </button>
        </header>
        <FileUpload onFileSelect={handleFileSelect} fileName={fileName} />
        <PromptInput prompt={prompt} setPrompt={setPrompt} onSubmit={handlePromptSubmit} />
        <div className="mt-6 p-4 rounded bg-[#4F4557] text-sm">
          <h2 className="font-semibold mb-2">GPT Response</h2>
          {gptResponseLive ? (
            <ReactMarkdown className="prose prose-invert max-w-none">
              {gptResponseLive}
            </ReactMarkdown>
          ) : (
            <span className="text-[#6D5D6E]">No response yet.</span>
          )}
        </div>
        {currentSession && <ShowBraveResults data={currentSession.braveResult} />}
      </main>
    </div>
  );
}

function ShowBraveResults({ data }: { data?: BraveResponse | null }) {
  if (!data) {
    return null;
  }
  return (
    <div className="mt-6 p-4 rounded bg-[#4F4557] text-sm">
      <h2 className="font-semibold mb-2">Brave Search Results</h2>
      {data.error ? (
        <p className="text-red-300">Error: {data.error}</p>
      ) : (
        <div className="text-[#ffffff]">
          {data.web && data.web.results && Array.isArray(data.web.results) ? (
            data.web.results.slice(0, 3).map((item, idx) => (
              <div key={idx} className="mb-2">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-300 underline"
                >
                  {item.title}
                </a>
                <p className="text-xs text-[#6D5D6E]">{item.description}</p>
              </div>
            ))
          ) : (
            <p className="text-[#6D5D6E] text-xs">No web results found in Brave response</p>
          )}
        </div>
      )}
    </div>
  );
}
