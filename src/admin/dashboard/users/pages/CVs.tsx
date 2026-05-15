import { File } from "lucide-react";

export function LocalCvsTab() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 text-center bg-white rounded-lg border border-gray-200 h-[99%] mb-2 mx-2">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
        <File className="h-5 w-5 text-gray-400" />
      </div>
      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
        cvs content
      </p>
    </div>
  );
}
