"use client";

import { TestId } from "@/test.types";
import { CheckCircle2, Copy, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ToastProps {
  variant: "success" | "error";
  title: string;
  message: string;
  "data-testid"?: TestId;
}

export const Toast = ({
  variant,
  title,
  message,
  "data-testid": testId,
}: ToastProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const Icon = variant === "success" ? CheckCircle2 : XCircle;
  const bgColor = variant === "success" ? "bg-green-50" : "bg-red-50";
  const borderColor = variant === "success" ? "border-green-200" : "border-red-200";
  const iconColor = variant === "success" ? "text-green-600" : "text-red-600";
  const textColor = variant === "success" ? "text-green-900" : "text-red-900";
  const subTextColor = variant === "success" ? "text-green-700" : "text-red-700";

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border ${borderColor} ${bgColor} p-4 shadow-lg min-w-[320px] max-w-[420px]`}
      data-testid={testId}
    >
      <Icon className={`h-5 w-5 ${iconColor} mt-0.5 flex-shrink-0`} />
      <div className="flex-1 min-w-0">
        <div className={`font-semibold ${textColor} text-sm`}>{title}</div>
        <div className={`${subTextColor} text-sm mt-0.5 break-words`}>
          {message}
        </div>
      </div>
      {variant === "error" && (
        <button
          onClick={handleCopy}
          className="flex-shrink-0 p-1.5 rounded hover:bg-red-100 transition-colors"
          aria-label="Copy error message"
          data-testid={TestId.TOAST_COPY_BUTTON}
        >
          <Copy className={`h-4 w-4 ${copied ? "text-green-600" : "text-red-600"}`} />
        </button>
      )}
    </div>
  );
};

export const showSuccessToast = (message: string, title = "Success") => {
  toast.custom(() => (
    <Toast
      variant="success"
      title={title}
      message={message}
      data-testid={TestId.TOAST_SUCCESS}
    />
  ));
};

export const showErrorToast = (message: string, title = "Error") => {
  toast.custom(() => (
    <Toast
      variant="error"
      title={title}
      message={message}
      data-testid={TestId.TOAST_ERROR}
    />
  ));
};
