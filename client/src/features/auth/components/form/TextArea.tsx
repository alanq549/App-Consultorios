import React from "react";

interface TextAreaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

const TextArea: React.FC<TextAreaProps> = ({ label, ...props }) => (
  <div className="flex flex-col gap-1">
    {label && <label className="text-sm font-medium">{label}</label>}
    <textarea
      {...props}
      className=" px-3 py-2 rounded-md focus:outline-teal-400 bg-zinc-600/40"
    />
  </div>
);

export default TextArea;
