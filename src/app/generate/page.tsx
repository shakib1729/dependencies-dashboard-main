"use client";
import { Main } from "@/app/components/Main";

const downloadInBrowser = (data) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "dependencyData.json";

  document.body.appendChild(link);

  link.click();

  document.body.removeChild(link);
};

const getData = async (content: string) => {
  try {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fileContent: content }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || "Unknown error");
    }

    const data = await res.json();

    downloadInBrowser(data);
    return data;
  } catch (e) {
    console.error(e);
    return null;
  }
};

export default function Home() {
  if (process.env.NEXT_PUBLIC_ENV === "development") {
    return (
      <Main
        fileType=".lock"
        uploadText="Upload yarn.lock file"
        getData={getData}
      />
    );
  }

  return (
    <div>
      Please visit this route from local after setting NEXT_PUBLIC_ENV =
      development in .env.local file
    </div>
  );
}
