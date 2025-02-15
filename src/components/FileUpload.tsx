import React from "react";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  fileName?: string;
}

export default function FileUpload({ onFileSelect, fileName }: FileUploadProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
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
        className="block cursor-pointer text-sm file:mr-4 file:py-1 file:px-2
          file:rounded-full file:border-0 file:text-sm
          file:bg-[#6D5D6E] file:text-[#ffffff]
          hover:file:bg-[#4F4557]"
      />
    </div>
  );
}
