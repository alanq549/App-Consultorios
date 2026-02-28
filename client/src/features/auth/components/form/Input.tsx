import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

const Input: React.FC<InputProps> = ({ label, ...props }) => (
  <div className="flex flex-col gap-1">
    {label && <label className="text-sm font-medium">{label}</label>}
    <input
      {...props}
      className=" px-3 py-2 rounded-md focus:outline-teal-400 bg-zinc-600/40"
    />
  </div>
);

export default Input;
