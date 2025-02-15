import React from "react";

interface PromptInputProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  onSubmit: () => void;
}

export default function PromptInput({ prompt, setPrompt, onSubmit }: PromptInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onSubmit();
    }
  };
  return (
    <div className="flex flex-col gap-2 mt-4">
      <label className="text-sm" htmlFor="promptInput">
        Enter prompt
      </label>
      <input
        id="promptInput"
        type="text"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={handleKeyDown}
        className="p-2 rounded bg-[#4F4557] text-[#ffffff]
                   placeholder:text-[#6D5D6E]
                   focus:outline-none focus:ring focus:ring-[#6D5D6E]"
        placeholder="Type your prompt here..."
      />
      <button
        onClick={onSubmit}
        className="mt-2 px-4 py-2 bg-[#6D5D6E] text-[#ffffff] rounded
                  hover:bg-[#4F4557] transition-colors text-sm"
      >
        Submit
      </button>
    </div>
  );
}
