import { useState, useEffect } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { marked } from "marked";
import Sidebar from "@/components/Sidebar";
import FileUpload from "@/components/FileUpload";
import PromptInput from "@/components/PromptInput";
import CryptoJS from "crypto-js";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

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
const SELECTED_INDEX_KEY = "medisync_selected_index";

export default function Home() {
    const [sessions, setSessions] = useState<SessionData[]>([]);
    const [selectedSessionIndex, setSelectedSessionIndex] = useState<number | null>(null);
    const [, setFile] = useState<File | null>(null);
    const [fileName, setFileName] = useState("");
    const [prompt, setPrompt] = useState("");
    const [gptResponseLive, setGptResponseLive] = useState("");

    useEffect(() => {
        const savedSessions = window.localStorage.getItem(STORAGE_KEY);
        const savedIndex = window.localStorage.getItem(SELECTED_INDEX_KEY);
        if (savedSessions) {
            try {
                const parsed = JSON.parse(savedSessions);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setSessions(parsed);
                    if (savedIndex !== null) {
                        const parsedIndex = parseInt(savedIndex, 10);
                        if (!Number.isNaN(parsedIndex) && parsedIndex >= 0 && parsedIndex < parsed.length) {
                            setSelectedSessionIndex(parsedIndex);
                            return;
                        }
                    }
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

    useEffect(() => {
        if (selectedSessionIndex !== null) {
            window.localStorage.setItem(SELECTED_INDEX_KEY, selectedSessionIndex.toString());
        }
    }, [selectedSessionIndex]);

    const createNewSession = () => {
        setSessions((prev) => {
            const newSession: SessionData = {
                fileName: "",
                prompt: "",
                gptResponse: "",
                braveResult: null,
            };
            const updated = [...prev, newSession];
            const newIndex = updated.length - 1;
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
            if (index === selectedSessionIndex) {
                if (updated.length > 0) {
                    const newIdx = Math.min(index, updated.length - 1);
                    setSelectedSessionIndex(newIdx);
                } else {
                    setSelectedSessionIndex(null);
                }
            } else if (selectedSessionIndex !== null && index < selectedSessionIndex) {
                setSelectedSessionIndex(selectedSessionIndex - 1);
            }
            return updated;
        });
    };

    const handleFileSelect = (newFile: File) => {
        setFile(newFile);
        setFileName(newFile.name);
    };

    const handlePromptSubmit = async () => {
        if (selectedSessionIndex === null) {
            createNewSession();
            return;
        }

        const secretKey = process.env.NEXT_PUBLIC_SECRET_KEY;
        if (!secretKey) {
          console.error("Missing secret key");
          return;
        }
      
        const encryptedPrompt = CryptoJS.AES.encrypt(prompt, secretKey).toString();

        let braveResult: BraveResponse | null = null;
        try {
            const braveResp = await fetch(`/api/brave?q=${encodeURIComponent(encryptedPrompt)}`);
            if (braveResp.ok) {
                braveResult = await braveResp.json();
            }
        } catch { }

        let finalContent = "";
        setGptResponseLive("");

        const gptResp = await fetch("/api/gptHandler", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ queries: [encryptedPrompt] }),
        });

        if (gptResp.ok) {
            const reader = gptResp.body?.getReader();
            const decoder = new TextDecoder();

            if (reader) {
                let buffer = "";

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split("\n");

                    for (let i = 0; i < lines.length - 1; i++) {
                        const line = lines[i].trim();
                        if (!line.startsWith("data: ")) continue;

                        let dataPart = line.replace("data: ", "");
                        if (dataPart === "[DONE]") break;
                        if (dataPart.startsWith("#")) {
                            dataPart = "\n\n" + dataPart;
                        } else if (dataPart.startsWith("-")) {
                            dataPart = "\n" + dataPart;
                        } else if (dataPart.endsWith(".")) {
                            dataPart += "\n";
                        }

                        finalContent += dataPart;
                        setGptResponseLive((prev) => prev + dataPart);
                    }

                    buffer = lines[lines.length - 1];
                }
            }
        }

        setSessions((prev) => {
            const updated = [...prev];
            const currentSession = updated[selectedSessionIndex];
            updated[selectedSessionIndex] = {
                ...currentSession,
                fileName: fileName || currentSession.fileName,
                prompt,
                gptResponse: finalContent.trim(),
                braveResult,
            };
            return updated;
        });
    };

    const currentSession =
        selectedSessionIndex !== null && sessions[selectedSessionIndex]
            ? sessions[selectedSessionIndex]
            : null;

    return (
        <div className={`${geistSans.variable} ${geistMono.variable} min-h-screen flex flex-col sm:flex-row bg-[#393646] text-[#ffffff]`}>
            <div className="sm:h-screen sm:sticky top-0">
                <Sidebar sessions={sessions} onSessionSelect={handleSessionSelect} onDeleteSession={handleDeleteSession} />
            </div>
            <main className="flex-1 p-4 sm:p-8">
                <header className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">MediSync</h1>
                        <p className="text-sm text-[#6D5D6E]">A medical web platform to streamline your workflow</p>
                    </div>
                    <button onClick={createNewSession} className="px-4 py-2 bg-[#6D5D6E] text-[#ffffff] rounded hover:bg-[#4F4557] transition-colors text-sm">+</button>
                </header>
                <FileUpload onFileSelect={handleFileSelect} fileName={fileName} />
                <PromptInput prompt={prompt} setPrompt={setPrompt} onSubmit={handlePromptSubmit} />

                <div className="mt-4 p-2 rounded bg-[#4F4557] text-sm">
                    <h2 className="font-semibold mb-2">GPT Response</h2>
                    <div className="prose prose-lg prose-white whitespace-pre-wrap max-w-full leading-5" dangerouslySetInnerHTML={{ __html: marked(gptResponseLive || currentSession?.gptResponse || "No response yet.") }} />
                </div>

                {currentSession && <ShowBraveResults data={currentSession.braveResult} />}
            </main>
        </div>
    );
}

function ShowBraveResults({ data }: { data?: BraveResponse | null }) {
    if (!data) return null;
    return (
        <div className="mt-6 p-4 rounded bg-[#4F4557] text-sm">
            <h2 className="font-semibold mb-2">Brave Search Results</h2>
            {data.web?.results?.slice(0, 10).map((item, idx) => (
                <div key={idx} className="mb-2">
                    <a href={item.url} target="_blank" rel="noreferrer" className="text-blue-300 underline">{item.title}</a>
                    <div className="text-xs text-[#B6AEB6]" dangerouslySetInnerHTML={{ __html: marked(item.description) }} />
                </div>
            ))}
        </div>
    );
}
