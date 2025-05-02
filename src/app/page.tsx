"use client";

import { Main } from "@/app/components/Main";

const getData = (content: string) => {
  try {
    const data = JSON.parse(content);
    return data;
  } catch (e) {
    console.error(e);
    return null;
  }
};

export default function Home() {
  return (
    <Main
      fileType=".json"
      uploadText="Upload dependencyData.json file"
      subText="Please visit /generate route on local and upload yarn.lock file to generate a dependencyData.json file corresponding to it"
      getData={getData}
    />
  );
}
