import React, { useState } from "react";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  fileName?: string;
}

export default function FileUpload({ onFileSelect, fileName }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      onFileSelect(file);
      await uploadFile(file);
    }
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    setMessage("");

    const formData = new FormData();
    formData.append("file", file);

    try {
        console.log("🚀 Sending file to Flask...");

        const response = await fetch("http://127.0.0.1:5001/upload", {
            method: "POST",
            body: formData,
            headers: {
                "Accept": "application/json",
            },
        });

        console.log("✅ Reached before parsing response");

        if (!response.ok) {
            throw new Error(`HTTP Error! Status: ${response.status}`);
        }

        const data = await response.json();
        console.log("✅ Reached after upload", data);

        setMessage(`✅ Success: ${data.message}`);
    } catch (error) {
        console.error("❌ Upload error:", error);
        setMessage("❌ Upload failed. Check server logs.");
    } finally {
        setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm" htmlFor="fileUpload">
        Upload file
      </label>
      {fileName && <p className="text-xs text-[#6D5D6E]">Current: {fileName}</p>}
      <input
        id="fileUpload"
        type="file"
        onChange={handleFileChange}
        disabled={uploading}
        className="block cursor-pointer text-sm file:mr-4 file:py-1 file:px-2
          file:rounded-full file:border-0 file:text-sm
          file:bg-[#6D5D6E] file:text-[#ffffff]
          hover:file:bg-[#4F4557]"
      />
      {uploading && <p className="text-xs text-blue-500">Uploading...</p>}
      {message && <p className="text-xs text-red-500">{message}</p>}
    </div>
  );
}